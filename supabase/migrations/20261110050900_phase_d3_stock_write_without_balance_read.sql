-- Preserve independent write authority without disclosing family balances.
create or replace function private.require_stock_movement_preparation_scope(p_patient uuid,p_purpose text,p_target uuid,p_write boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.can(p_patient,'stock.family.read') and not private.can(p_patient,'stock.family.manage') then raise exception 'stock preparation authorization required' using errcode='42501';end if;
 if p_purpose is distinct from 'family_movement' or p_target is distinct from p_patient then raise exception 'invalid stock preparation scope' using errcode='22023';end if;
 if p_write then
  perform private.require_cap(p_patient,'stock.family.manage');
  if not exists(select 1 from public.care_recipients where id=p_patient and is_active) then raise exception 'inactive patient' using errcode='42501';end if;
 end if;
end;$$;

create or replace function private.stock_movement_preparation_snapshot(p_patient uuid,p_product text,p_reference uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare product jsonb;origin jsonb;balance numeric;ledger text;begin
 perform private.require_stock_movement_preparation_scope(p_patient,'family_movement',p_patient);
 select jsonb_build_object('id',c.product_id,'name',c.name,'unit',c.unit,'decimals',c.quantity_decimals,'active',c.is_active) into product from public.care_recipient_products c where c.care_recipient_id=p_patient and c.product_id=p_product;
 if product is null then raise exception 'stock material unavailable' using errcode='42501';end if;
 if p_reference is not null then
  select jsonb_build_object('id',m.id,'productId',m.product_id,'quantity',m.quantity::text,'sourceLocation',m.source_location,'destinationLocation',m.destination_location,'recordedAt',m.created_at,'performedBy',m.performed_by,'reason',m.justification) into origin from public.stock_movements m where m.id=p_reference and m.care_recipient_id=p_patient and m.product_id=p_product and m.reference_type='family_manual';
  if origin is null then raise exception 'stock compensation unavailable' using errcode='42501';end if;
 end if;
 select b.balance into balance from public.current_stock_balances b where b.care_recipient_id=p_patient and b.product_id=p_product and b.location='FAMILY';
 select encode(extensions.digest(coalesce(jsonb_agg(m.id order by m.id),'[]'::jsonb)::text,'sha256'),'hex') into ledger from public.stock_movements m where m.care_recipient_id=p_patient and m.product_id=p_product and (m.source_location='FAMILY' or m.destination_location='FAMILY');
 return jsonb_build_object('patientId',p_patient,'product',product,'balance',coalesce(balance,0)::text,'origin',origin,'ledgerHash',ledger);
end;$$;


-- Management does not grant balance or third-party movement disclosure.
create function private.stock_movement_preparation_output(p_result jsonb,p_patient uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r jsonb:=p_result;begin
 perform private.require_stock_movement_preparation_scope(p_patient,'family_movement',p_patient);
 if private.can(p_patient,'stock.family.read') then return r;end if;
 if jsonb_typeof(r->'content'->'movement')='object' then r:=jsonb_set(r,'{content,movement}',(r->'content'->'movement')-array['observedBalance','referenceLabel']);end if;
 if jsonb_typeof(r->'consumedResult'->'preparedMovement')='object' then r:=jsonb_set(r,'{consumedResult,preparedMovement}',(r->'consumedResult'->'preparedMovement')-array['observedBalance','referenceLabel']);end if;
 return r;
end;$$;
revoke all on function private.stock_movement_preparation_output(jsonb,uuid) from public,anon,authenticated,service_role;

create or replace function public.stock_movement_preparation_reference(p_patient uuid,p_product text,p_reference uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s jsonb;r jsonb;visible boolean;begin
 s:=private.stock_movement_preparation_snapshot(p_patient,p_product,p_reference);
 perform private.require_stock_movement_preparation_scope(p_patient,'family_movement',p_patient);
 visible:=private.can(p_patient,'stock.family.read');
 r:=(s-'ledgerHash')||jsonb_build_object('referenceHash',encode(extensions.digest(s::text,'sha256'),'hex'),'canReadBalance',visible);
 if not visible then
  r:=jsonb_set(r,'{balance}','null'::jsonb);
  if s->'origin'<>'null'::jsonb then r:=jsonb_set(r,'{origin}',jsonb_build_object('id',s->'origin'->'id','productId',s->'origin'->'productId','quantity',null,'sourceLocation',null,'destinationLocation',null,'recordedAt',null,'performedBy',null,'reason',null));end if;
 end if;
 return r;
end;$$;
create or replace function public.stock_movement_preparation_context(p_patient uuid,p_purpose text,p_target uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.stock_movement_preparations;begin
 perform private.require_stock_movement_preparation_scope(p_patient,p_purpose,p_target);
 select * into d from private.stock_movement_preparations where owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and target_resource_id=p_target and state in ('active','consumed');
 return case when found then private.stock_movement_preparation_output(private.stock_movement_preparation_view(d),p_patient) else null end;
end;$$;

create or replace function public.stock_movement_preparation_command(p_patient uuid,p_purpose text,p_target uuid,p_id uuid,p_expected integer,p_body jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.stock_movement_preparations;c private.stock_movement_preparation_commands;h text;a text:=p_body->>'action';result jsonb;begin
 perform private.require_stock_movement_preparation_scope(p_patient,p_purpose,p_target);
 if p_key is null or jsonb_typeof(p_body) is distinct from 'object' or a is null or a not in ('save','discard','acknowledge') or (p_body-array['action','content','navigation'])<>'{}'::jsonb or a<>'save' and (p_body ? 'content' or p_body ? 'navigation') then raise exception 'invalid balance preparation command' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('stock-movement-preparation',p_patient,p_purpose,p_target,p_id,p_expected,p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('stock-movement-preparation-key:'||auth.uid()||':'||p_key,0));
 perform private.require_stock_movement_preparation_scope(p_patient,p_purpose,p_target);
 select * into c from private.stock_movement_preparation_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then if c.intent_hash is distinct from h then raise exception 'private draft idempotency conflict' using errcode='23505';end if;return private.stock_movement_preparation_output(c.result||jsonb_build_object('replayed',true),p_patient);end if;
 perform pg_advisory_xact_lock(hashtextextended('stock-movement-preparation-slot:'||auth.uid()||':'||p_patient||':'||p_purpose||':'||p_target,0));
 perform private.require_stock_movement_preparation_scope(p_patient,p_purpose,p_target,a='save');
 if a='save' and not private.can(p_patient,'stock.family.read') and coalesce(p_body->'content'->'movement'->>'observedBalance','')<>'' then raise exception 'balance summary requires read authorization' using errcode='42501';end if;
 if p_id is null then
  if a<>'save' or p_expected is not null then raise exception 'private draft creation requires no prior revision' using errcode='22023';end if;
  if exists(select 1 from private.stock_movement_preparations where owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and target_resource_id=p_target and state in ('active','consumed')) then raise exception 'stale private draft revision' using errcode='PT409';end if;
  perform private.validate_stock_movement_preparation(p_body->'content',p_body->'navigation',p_purpose);
  insert into private.stock_movement_preparations(owner_id,care_recipient_id,purpose,target_resource_id,content,navigation,content_hash)
  values(auth.uid(),p_patient,p_purpose,p_target,p_body->'content',p_body->'navigation',encode(extensions.digest((p_body->'content')::text,'sha256'),'hex')) returning * into d;
 else
  select * into d from private.stock_movement_preparations where id=p_id and owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and target_resource_id=p_target for update;
  if not found then raise exception 'private draft unavailable' using errcode='42501';end if;
  if p_expected is null or p_expected is distinct from d.revision or (a='acknowledge' and d.state<>'consumed') or (a<>'acknowledge' and d.state<>'active') then raise exception 'stale private draft revision' using errcode='PT409';end if;
  if a='save' then
   perform private.validate_stock_movement_preparation(p_body->'content',p_body->'navigation',p_purpose);
   update private.stock_movement_preparations set content=p_body->'content',navigation=p_body->'navigation',content_hash=encode(extensions.digest((p_body->'content')::text,'sha256'),'hex'),revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
  elsif a='discard' then update private.stock_movement_preparations set content=null,navigation=null,state='discarded',revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
  else update private.stock_movement_preparations set state='completed',revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;end if;
 end if;
 result:=jsonb_build_object('patientId',d.care_recipient_id,'ownerId',d.owner_id,'purpose',d.purpose,'targetResourceId',d.target_resource_id,'id',d.id,'revision',d.revision,'savedAt',d.saved_at,'state',d.state,'consumedDocumentId',null,'consumedResourceId',d.consumed_resource_id,'consumedResult',d.consumed_result,'replayed',false);
 insert into private.stock_movement_preparation_commands values(auth.uid(),p_key,d.id,h,result);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'private_draft.'||a,'stock_movement_preparation',d.id,jsonb_build_object('care_recipient_id',p_patient,'purpose',p_purpose,'revision',d.revision));
 perform private.require_stock_movement_preparation_scope(p_patient,p_purpose,p_target,a='save');
 return private.stock_movement_preparation_output(result,p_patient);
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
 if found then if c.intent_hash is distinct from h then raise exception 'private draft idempotency conflict' using errcode='23505';end if;return private.stock_movement_preparation_output(c.result||jsonb_build_object('replayed',true),p_patient);end if;
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
 return private.stock_movement_preparation_output(result,p_patient);
end;$$;

revoke all on function private.require_stock_movement_preparation_scope(uuid,text,uuid,boolean),private.stock_movement_preparation_snapshot(uuid,text,uuid) from public,anon,authenticated,service_role;
revoke all on function public.stock_movement_preparation_reference(uuid,text,uuid),public.stock_movement_preparation_context(uuid,text,uuid),public.stock_movement_preparation_command(uuid,text,uuid,uuid,integer,jsonb,uuid),public.commit_stock_movement_preparation(uuid,uuid,integer,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.stock_movement_preparation_reference(uuid,text,uuid),public.stock_movement_preparation_context(uuid,text,uuid),public.stock_movement_preparation_command(uuid,text,uuid,uuid,integer,jsonb,uuid),public.commit_stock_movement_preparation(uuid,uuid,integer,jsonb,uuid) to authenticated;
