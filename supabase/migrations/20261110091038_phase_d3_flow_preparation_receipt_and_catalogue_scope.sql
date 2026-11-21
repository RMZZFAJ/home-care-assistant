-- Bind own receipt to the private command key;rejection retains its native read-independent scope.
create or replace function private.flow_preparation_snapshot(p_patient uuid,p_purpose text,p_target uuid,p_fields jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare suggestion jsonb;catalog jsonb;begin
 perform private.require_flow_preparation_scope(p_patient,p_purpose,p_target);
 select jsonb_build_object('id',s.id,'ownerId',s.user_id,'status',s.status,'body',s.body,'createdAt',s.created_at,'reportId',s.report_id,'reviewedAt',s.reviewed_at) into suggestion from public.flow_submissions s where s.id=p_target;
 select coalesce(jsonb_agg(jsonb_build_object('id',c.product_id,'name',c.name,'unit',c.unit,'decimals',c.quantity_decimals,'active',c.is_active) order by c.product_id),'[]'::jsonb) into catalog from public.care_recipient_products c where c.care_recipient_id=p_patient and private.can(p_patient,'stock.team.read') and exists(select 1 from jsonb_array_elements(p_fields->'lines') as lines(line) where line->>'productId'=c.product_id);
 return jsonb_build_object('patientId',p_patient,'purpose',p_purpose,'targetResourceId',p_target,'suggestion',suggestion,'catalog',catalog);
end;$$;
create or replace function public.commit_flow_preparation(p_patient uuid,p_purpose text,p_target uuid,p_id uuid,p_expected integer,p_body jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.flow_preparations;c private.flow_preparation_commands;h text;f jsonb;s jsonb;lines jsonb;cmd jsonb;native jsonb;receipt jsonb;result jsonb;r public.consumption_reports;expected_status text;begin
 perform private.require_flow_preparation_scope(p_patient,p_purpose,p_target);
 if p_id is null or p_expected is null or p_key is null or jsonb_typeof(p_body) is distinct from 'object' or not(p_body ?& array['command','referenceHash']) or p_body-array['command','referenceHash']<>'{}'::jsonb then raise exception 'invalid flow confirmation' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('flow-confirmation',p_patient,p_purpose,p_target,p_id,p_expected,p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('flow-preparation-key:'||auth.uid()||':'||p_key,0));
 perform private.require_flow_preparation_scope(p_patient,p_purpose,p_target);
 select * into c from private.flow_preparation_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then if c.intent_hash is distinct from h then raise exception 'private draft idempotency conflict' using errcode='23505';end if;return c.result||jsonb_build_object('replayed',true);end if;
 perform pg_advisory_xact_lock(hashtextextended('flow-preparation-slot:'||auth.uid()||':'||p_patient||':'||p_purpose||':'||p_target,0));
 select * into d from private.flow_preparations where id=p_id and owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and target_resource_id=p_target for update;
 if not found then raise exception 'private draft unavailable' using errcode='42501';end if;
 if d.state<>'active' or d.revision is distinct from p_expected then raise exception 'stale private draft revision' using errcode='PT409';end if;
 -- Native review locks the Flow row before creating its report. Preserve that order.
 perform 1 from public.flow_submissions where id=p_target for update;
 perform private.require_flow_preparation_scope(p_patient,p_purpose,p_target,true);
 perform private.validate_flow_preparation(d.content,d.navigation,d.purpose);f:=d.content->'review';
 perform 1 from public.care_recipient_products cp where cp.care_recipient_id=p_patient and exists(select 1 from jsonb_array_elements(f->'lines') as items(line) where line->>'productId'=cp.product_id) order by cp.product_id for share;
 s:=private.flow_preparation_snapshot(p_patient,p_purpose,p_target,f);
 if d.content->>'referenceHash' is null or d.content->>'referenceHash' is distinct from p_body->>'referenceHash' or d.content->>'referenceHash' is distinct from encode(extensions.digest(s::text,'sha256'),'hex') or d.content->'reference' is distinct from s then raise exception 'stale flow reference' using errcode='PT409';end if;
 if s->'suggestion'->>'status' is distinct from 'pending_confirmation' then raise exception 'flow already reviewed' using errcode='PT409';end if;
 if (f->>'accept')::boolean then
  perform private.require_consumption_read(p_patient,'CARE_TEAM');
  if f->>'kind' not in ('consumption','shortage') or private.bal_comment_units(btrim(f->>'text',U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'))<3 then raise exception 'flow review incomplete' using errcode='22023';end if;
  if exists(select 1 from jsonb_array_elements(f->'lines') as items(line) where line->>'quantity'!~'^[0-9]+([.,][0-9]+)?$' or not exists(select 1 from jsonb_array_elements(s->'catalog') as catalogs(cat) where cat->>'id'=line->>'productId' and cat->>'name'=line->>'name' and cat->>'unit'=line->>'unit')) then raise exception 'invalid flow material' using errcode='22023';end if;
  select coalesce(jsonb_agg(jsonb_build_object('productId',line->>'productId','quantity',trim_scale(replace(line->>'quantity',',','.')::numeric)::text) order by ord),'[]'::jsonb) into lines from jsonb_array_elements(f->'lines') with ordinality as items(line,ord);
  cmd:=jsonb_build_object('id',p_target,'accept',true,'kind',f->>'kind','text',btrim(f->>'text',U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'),'lines',lines);
 else cmd:=jsonb_build_object('id',p_target,'accept',false,'kind','shortage','text','Sugestão descartada pelo próprio autor','lines','[]'::jsonb);end if;
 if cmd is distinct from p_body->'command' then raise exception 'flow private intent mismatch' using errcode='PT409';end if;
 -- The native key is the suggestion UUID,not the private command UUID.
 perform pg_advisory_xact_lock(hashtextextended('report:'||auth.uid()||p_target,0));
 if (f->>'accept')::boolean and exists(select 1 from public.consumption_reports where reported_by=auth.uid() and idempotency_key=p_target) then raise exception 'native flow report key already used' using errcode='23505';end if;
 native:=public.review_flow_submission(p_target,(cmd->>'accept')::boolean,cmd->>'kind',cmd->>'text',cmd->'lines');
 expected_status:=case when (cmd->>'accept')::boolean then 'confirmed' else 'rejected' end;
 if native->>'status' is distinct from expected_status then raise exception 'native flow result mismatch' using errcode='PT409';end if;
 if expected_status='confirmed' then
  select * into r from public.consumption_reports where id=(native->>'reportId')::uuid;
  if not found or r.care_recipient_id is distinct from p_patient or r.reported_by is distinct from auth.uid() or r.idempotency_key is distinct from p_target or r.kind is distinct from cmd->>'kind' or r.location is distinct from 'CARE_TEAM' or r.body is distinct from cmd->>'text' then raise exception 'native flow report mismatch' using errcode='PT409';end if;
 elsif native->'reportId' is distinct from 'null'::jsonb then raise exception 'native flow rejection mismatch' using errcode='PT409';end if;
 receipt:=jsonb_build_object('patientId',p_patient,'purpose',p_purpose,'targetResourceId',p_target,'resourceId',p_target,'actorId',auth.uid(),'recordedAt',clock_timestamp(),'idempotencyKey',p_key,'command',cmd,'referenceHash',d.content->>'referenceHash','preparedReview',f,'preparedReference',s,'nativeResult',native);
 update private.flow_preparations set state='consumed',revision=revision+1,content=null,navigation=null,consumed_resource_id=p_target,consumed_result=receipt,saved_at=clock_timestamp() where id=d.id returning * into d;
 result:=jsonb_build_object('id',d.id,'revision',d.revision,'savedAt',d.saved_at,'state',d.state,'consumedDocumentId',null,'consumedResourceId',p_target,'consumedResult',receipt,'replayed',false);
 insert into private.flow_preparation_commands values(auth.uid(),p_key,d.id,h,result);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'private_draft.consumed','flow_preparation',d.id,jsonb_build_object('care_recipient_id',p_patient,'purpose',p_purpose,'resourceId',p_target));
 perform private.require_flow_preparation_scope(p_patient,p_purpose,p_target,true);
 return result;
end;$$;
