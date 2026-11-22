-- Preserve prior local migration provenance;extend reference summaries and bind displayed facts.
create or replace function private.validate_stock_movement_preparation(p_content jsonb,p_navigation jsonb,p_purpose text)
returns void language plpgsql set search_path='' as $$
declare f record;begin
 if p_purpose is distinct from 'family_movement' or jsonb_typeof(p_content) is distinct from 'object'
 or p_content-array['movement','referenceHash']<>'{}'::jsonb or not(p_content ?& array['movement','referenceHash'])
 or jsonb_typeof(p_content->'movement') is distinct from 'object'
 or (p_content->'movement')-array['action','productId','productLabel','unit','quantity','reason','referenceId','referenceLabel','observedBalance']<>'{}'::jsonb
 or not(p_content->'referenceHash'='null'::jsonb or jsonb_typeof(p_content->'referenceHash')='string' and p_content->>'referenceHash'~'^[0-9a-f]{64}$')
 or p_navigation is distinct from jsonb_build_object('version',1,'stage','stock_family_movement') then raise exception 'invalid stock preparation content' using errcode='22023';end if;
 for f in select * from jsonb_each(p_content->'movement') loop
  if jsonb_typeof(f.value) is distinct from 'string' or private.bal_comment_units(f.value#>>'{}')>(case when f.key in ('quantity','observedBalance') then 64 when f.key='productId' then 120 when f.key in ('productLabel','referenceLabel','unit') then 200 else 1000 end) then raise exception 'invalid stock preparation field' using errcode='22023';end if;
 end loop;
 if p_content->'movement' ? 'action' and p_content->'movement'->>'action' not in ('inbound','outbound','correction_in','correction_out') then raise exception 'invalid stock preparation action' using errcode='22023';end if;
end;$$;

create or replace function public.commit_stock_movement_preparation(p_patient uuid,p_id uuid,p_expected integer,p_body jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.stock_movement_preparations;c private.stock_movement_preparation_commands;h text;f jsonb;command jsonb;s jsonb;result jsonb;receipt jsonb;movement public.stock_movements;movement_id uuid;reason text;reference_id uuid;amount numeric;begin
 perform private.require_stock_movement_preparation_scope(p_patient,'family_movement',p_patient);
 if p_id is null or p_expected is null or p_key is null or jsonb_typeof(p_body) is distinct from 'object' or p_body-array['command','referenceHash']<>'{}'::jsonb or not(p_body ?& array['command','referenceHash']) then raise exception 'invalid stock preparation confirmation' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('commit-stock-preparation',p_patient,p_id,p_expected,p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('stock-movement-preparation-key:'||auth.uid()||':'||p_key,0));
 perform private.require_stock_movement_preparation_scope(p_patient,'family_movement',p_patient);
 select * into c from private.stock_movement_preparation_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then if c.intent_hash is distinct from h then raise exception 'private draft idempotency conflict' using errcode='23505';end if;return c.result||jsonb_build_object('replayed',true);end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
 select * into d from private.stock_movement_preparations where id=p_id and owner_id=auth.uid() and care_recipient_id=p_patient and purpose='family_movement' and target_resource_id=p_patient for update;
 if not found then raise exception 'private draft unavailable' using errcode='42501';end if;
 if d.state<>'active' or d.revision is distinct from p_expected then raise exception 'stale private draft revision' using errcode='PT409';end if;
 perform private.require_stock_movement_preparation_scope(p_patient,'family_movement',p_patient,true);
 perform private.validate_stock_movement_preparation(d.content,d.navigation,d.purpose);
 f:=d.content->'movement';
 perform 1 from public.care_recipient_products where care_recipient_id=p_patient and product_id=f->>'productId' for share;
 reference_id:=nullif(f->>'referenceId','')::uuid;
 s:=private.stock_movement_preparation_snapshot(p_patient,f->>'productId',reference_id);
 if d.content->>'referenceHash' is null or d.content->>'referenceHash' is distinct from p_body->>'referenceHash' or d.content->>'referenceHash' is distinct from encode(extensions.digest(s::text,'sha256'),'hex') then raise exception 'stale stock preparation reference' using errcode='PT409';end if;
 -- Preserved display facts cannot misrepresent the stock reference being confirmed.
 if f ? 'productLabel' and f->>'productLabel' is distinct from s->'product'->>'name'
 or f ? 'unit' and f->>'unit' is distinct from s->'product'->>'unit' then raise exception 'stale stock preparation material summary' using errcode='PT409';end if;
 if coalesce(f->>'observedBalance','')<>'' then
  if f->>'observedBalance'!~'^-?[0-9]+([.,][0-9]+)?$' or replace(f->>'observedBalance',',','.')::numeric is distinct from (s->>'balance')::numeric then raise exception 'stale stock preparation balance summary' using errcode='PT409';end if;
 end if;
 reason:=btrim(coalesce(f->>'reason',''),U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
 if private.bal_comment_units(reason) not between 3 and 1000 or coalesce(f->>'quantity','')!~'^[0-9]+([.,][0-9]+)?$' then raise exception 'invalid stock movement fields' using errcode='22023';end if;
 amount:=trim_scale(replace(f->>'quantity',',','.')::numeric);
 perform private.require_exact_quantity(amount,(s->'product'->>'decimals')::integer);
 command:=jsonb_build_object('careRecipientId',p_patient,'productId',f->>'productId','quantity',amount::text,'action',f->>'action','reason',reason,'idempotencyKey',p_key)||case when reference_id is not null then jsonb_build_object('referenceId',reference_id) else '{}'::jsonb end;
 -- Numerically equal quantities can carry different trailing zeros in JSON strings.
 if command is distinct from jsonb_set(p_body->'command','{quantity}',to_jsonb(trim_scale((p_body->'command'->>'quantity')::numeric)::text)) then raise exception 'stock preparation confirmation mismatch' using errcode='23505';end if;
 if exists(select 1 from public.stock_movements where performed_by=auth.uid() and idempotency_key=p_key) then raise exception 'native stock key belongs to another entrypoint' using errcode='23505';end if;
 movement_id:=public.family_stock_movement(p_patient,f->>'productId',amount,f->>'action',reason,p_key,reference_id);
 select * into strict movement from public.stock_movements where id=movement_id;
 receipt:=jsonb_build_object('patientId',p_patient,'purpose','family_movement','targetResourceId',p_patient,'resourceId',movement_id,'actorId',auth.uid(),'recordedAt',movement.created_at,'command',command,'referenceHash',d.content->>'referenceHash','preparedMovement',f,'movement',jsonb_build_object('id',movement.id,'productId',movement.product_id,'quantity',movement.quantity::text,'sourceLocation',movement.source_location,'destinationLocation',movement.destination_location,'reason',movement.justification,'performedBy',movement.performed_by,'referenceId',movement.reference_id));
 update private.stock_movement_preparations set state='consumed',content=null,navigation=null,consumed_resource_id=movement_id,consumed_result=receipt,revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
 result:=jsonb_build_object('id',d.id,'revision',d.revision,'patientId',p_patient,'ownerId',auth.uid(),'purpose',d.purpose,'targetResourceId',p_patient,'savedAt',d.saved_at,'state',d.state,'consumedDocumentId',null,'consumedResourceId',movement_id,'consumedResult',receipt,'replayed',false);
 insert into private.stock_movement_preparation_commands values(auth.uid(),p_key,d.id,h,result);
 perform private.require_stock_movement_preparation_scope(p_patient,'family_movement',p_patient,true);
 return result;
end;$$;

revoke all on function private.validate_stock_movement_preparation(jsonb,jsonb,text) from public,anon,authenticated,service_role;
revoke all on function public.commit_stock_movement_preparation(uuid,uuid,integer,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.commit_stock_movement_preparation(uuid,uuid,integer,jsonb,uuid) to authenticated;
