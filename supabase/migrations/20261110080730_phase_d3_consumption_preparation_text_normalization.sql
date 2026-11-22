-- Match ECMAScript trim without changing the original private text.
create or replace function public.commit_consumption_preparation(p_patient uuid,p_purpose text,p_target uuid,p_id uuid,p_expected integer,p_body jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.consumption_preparations;c private.consumption_preparation_commands;h text;f jsonb;s jsonb;cmd jsonb;lines jsonb;rid uuid;result jsonb;receipt jsonb;native jsonb;begin
 perform private.require_consumption_preparation_scope(p_patient,p_purpose,p_target);
 if p_id is null or p_expected is null or p_key is null or jsonb_typeof(p_body) is distinct from 'object' or p_body-array['command','referenceHash']<>'{}'::jsonb or not(p_body ?& array['command','referenceHash']) then raise exception 'invalid consumption confirmation' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('commit-consumption-preparation',p_patient,p_purpose,p_target,p_id,p_expected,p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('consumption-preparation-key:'||auth.uid()||':'||p_key,0));
 perform private.require_consumption_preparation_scope(p_patient,p_purpose,p_target);
 select * into c from private.consumption_preparation_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then if c.intent_hash is distinct from h then raise exception 'private draft idempotency conflict' using errcode='23505';end if;return c.result||jsonb_build_object('replayed',true);end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
 select * into d from private.consumption_preparations where id=p_id and owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and target_resource_id=p_target for update;
 if not found then raise exception 'private draft unavailable' using errcode='42501';end if;
 if d.state<>'active' or d.revision is distinct from p_expected then raise exception 'stale private draft revision' using errcode='PT409';end if;
 perform private.require_consumption_preparation_scope(p_patient,p_purpose,p_target,true);
 perform private.validate_consumption_preparation(d.content,d.navigation,d.purpose);f:=d.content->'consumption';
 if p_purpose not in ('consumption_report_family','consumption_report_team') then perform 1 from public.consumption_reports where id=p_target for update;end if;
 perform 1 from public.care_recipient_products cc where cc.care_recipient_id=p_patient and (exists(select 1 from jsonb_array_elements(f->'lines') x where x->>'productId'=cc.product_id) or exists(select 1 from jsonb_array_elements(case when p_purpose in ('consumption_report_family','consumption_report_team') then '[]'::jsonb else private.consumption_current_lines(p_target) end) x where x->>'productId'=cc.product_id)) order by cc.product_id for share;
 s:=private.consumption_preparation_snapshot(p_patient,p_purpose,p_target,f);
 if d.content->>'referenceHash' is null or d.content->>'referenceHash' is distinct from p_body->>'referenceHash' or d.content->>'referenceHash' is distinct from encode(extensions.digest(s::text,'sha256'),'hex') or d.content->'reference' is distinct from s then raise exception 'stale consumption preparation reference' using errcode='PT409';end if;
 if p_purpose not in ('consumption_report_family','consumption_report_team') and s->'report'->>'status' is distinct from 'reported' then raise exception 'consumption already decided' using errcode='PT409';end if;
 if p_purpose not in ('consumption_report_family','consumption_report_team') and f->>'kind' is distinct from s->'report'->>'kind' then raise exception 'consumption kind mismatch' using errcode='22023';end if;
 if f->>'location' is distinct from s->>'location' then raise exception 'consumption custody mismatch' using errcode='22023';end if;
 if p_purpose in ('consumption_report_family','consumption_report_team','consumption_supplement') then
  if exists(select 1 from jsonb_array_elements(f->'lines') x where not exists(select 1 from jsonb_array_elements(s->'catalog') cc where cc->>'id'=x->>'productId' and cc->>'name'=x->>'name' and cc->>'unit'=x->>'unit')) then raise exception 'consumption material mismatch' using errcode='22023';end if;
  select coalesce(jsonb_agg(jsonb_build_object('productId',x->>'productId','unit',x->>'unit','quantity',trim_scale(replace(x->>'quantity',',','.')::numeric)::text) order by ord),'[]'::jsonb) into lines from jsonb_array_elements(f->'lines') with ordinality as line(x,ord);
  if p_purpose='consumption_supplement' then cmd:=jsonb_build_object('action','supplement','id',p_target,'expectedVersion',(s->'report'->>'version')::integer,'text',btrim(f->>'text',U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'),'lines',lines,'idempotencyKey',p_key);
  else cmd:=jsonb_build_object('action','report','careRecipientId',p_patient,'kind',f->>'kind','location',s->>'location','text',btrim(f->>'text',U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'),'lines',lines,'idempotencyKey',p_key)||case when nullif(f->>'reminderId','') is not null then jsonb_build_object('reminderId',(f->>'reminderId')::uuid) else '{}'::jsonb end;end if;
 else
  if (f->>'kind') is distinct from s->'report'->>'kind' or f->'lines' is distinct from '[]'::jsonb then raise exception 'consumption decision fields mismatch' using errcode='22023';end if;
  cmd:=jsonb_build_object('action','confirm','id',p_target,'expectedVersion',(s->'report'->>'version')::integer,'accept',p_purpose='consumption_accept','idempotencyKey',p_key)||case when p_purpose='consumption_reject' then jsonb_build_object('reason',btrim(f->>'reason',U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')) else '{}'::jsonb end;
 end if;
 if cmd is distinct from p_body->'command' then raise exception 'consumption private intent mismatch' using errcode='PT409';end if;
 -- Lock keys used by the existing report/reminder writers before rejecting old native results.
 perform pg_advisory_xact_lock(hashtextextended('d3-notice:'||auth.uid()||':'||p_key,0));
 perform pg_advisory_xact_lock(hashtextextended('report:'||auth.uid()||p_key,0));
 if exists(select 1 from public.consumption_reports where reported_by=auth.uid() and idempotency_key=p_key) or exists(select 1 from public.consumption_report_revisions where actor_id=auth.uid() and idempotency_key=p_key) or exists(select 1 from public.consumption_report_decisions where actor_id=auth.uid() and idempotency_key=p_key) or exists(select 1 from private.phase_d3_commands where owner_id=auth.uid() and idempotency_key=p_key) then raise exception 'native consumption key already used' using errcode='23505';end if;
 if cmd->>'action'='report' then
  if cmd ? 'reminderId' then native:=public.report_consumption_from_reminder(p_patient,(cmd->>'reminderId')::uuid,cmd->>'kind',cmd->>'location',cmd->>'text',cmd->'lines',p_key);rid:=(native->>'id')::uuid;
  else rid:=public.report_extraordinary_consumption(p_patient,cmd->>'kind',cmd->>'location',cmd->>'text',cmd->'lines',p_key);end if;
 elsif cmd->>'action'='supplement' then native:=public.supplement_consumption_report(p_target,cmd->>'text',cmd->'lines',p_key,(cmd->>'expectedVersion')::integer);rid:=p_target;
 else native:=public.decide_consumption_report(p_target,(cmd->>'accept')::boolean,cmd->>'reason',p_key,(cmd->>'expectedVersion')::integer);rid:=p_target;end if;
 receipt:=jsonb_build_object('patientId',p_patient,'purpose',p_purpose,'targetResourceId',p_target,'resourceId',rid,'actorId',auth.uid(),'recordedAt',clock_timestamp(),'command',cmd,'referenceHash',d.content->>'referenceHash','preparedConsumption',f,'preparedReference',s,'report',public.consumption_report(rid));
 update private.consumption_preparations set state='consumed',revision=revision+1,content=null,navigation=null,consumed_resource_id=rid,consumed_result=receipt,saved_at=clock_timestamp() where id=d.id returning * into d;
 result:=jsonb_build_object('id',d.id,'revision',d.revision,'savedAt',d.saved_at,'state',d.state,'consumedDocumentId',null,'consumedResourceId',rid,'consumedResult',receipt,'replayed',false);
 insert into private.consumption_preparation_commands values(auth.uid(),p_key,d.id,h,result);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'private_draft.consumed','consumption_preparation',d.id,jsonb_build_object('care_recipient_id',p_patient,'purpose',p_purpose,'resourceId',rid));
 perform private.require_consumption_preparation_scope(p_patient,p_purpose,p_target,true);
 return result;
end;$$;
