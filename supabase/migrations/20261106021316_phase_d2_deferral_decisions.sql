alter table public.bal_deferrals add column decision_snapshot jsonb;

create function private.bal_deferral_context(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare d public.bal_deferrals;a public.bal_assignments;s public.scheduled_shifts;
 v_source boolean;v_target boolean;v_authority boolean;v_target_state text;begin
 select * into strict d from public.bal_deferrals where id=p_id;
 if not coalesce(private.can(d.care_recipient_id,'bal.read'),false) then raise exception 'balance read required' using errcode='42501';end if;
 select * into a from public.bal_assignments where id=d.assignment_id and care_recipient_id=d.care_recipient_id;
 select * into s from public.scheduled_shifts where id=d.target_shift_id and care_recipient_id=d.care_recipient_id;
 v_source:=coalesce(a.id is not null and a.status='active' and a.version=d.assignment_version and a.ends_at>clock_timestamp(),false);
 v_target:=coalesce(s.id is not null and s.status='published' and s.version=d.target_shift_version
   and s.starts_at is not distinct from (d.target_snapshot->>'starts_at')::timestamptz
   and s.ends_at is not distinct from (d.target_snapshot->>'ends_at')::timestamptz
   and s.professional_id::text is not distinct from d.target_snapshot->>'professional_id'
   and s.starts_at>=a.ends_at and s.ends_at>clock_timestamp()
   and private.schedule_worker(d.care_recipient_id,s.professional_id)
   and private.member_can(d.care_recipient_id,s.professional_id,'bal.count')
   and exists(select 1 from public.shift_types where id=s.shift_type_id and care_recipient_id=d.care_recipient_id and is_active),false);
 v_authority:=coalesce(private.bal_family_authority(d.care_recipient_id,'bal.defer.approve'),false)
   and exists(select 1 from public.care_recipients where id=d.care_recipient_id and is_active);
 v_target_state:=case when s.id is null then 'unavailable'
   when s.status<>'published' or s.version is distinct from d.target_shift_version then 'changed'
   when not v_target then 'ineligible' else 'unchanged' end;
 return jsonb_build_object('canApprove',d.status='pending' and v_authority and v_source and v_target,
   'canReject',d.status='pending' and v_authority,'sourceCurrent',v_source,'sourceDeadline',a.ends_at,
   'targetState',v_target_state,'proposedVersion',d.target_shift_version,
   'currentTarget',case when s.id is not null then to_jsonb(s)||jsonb_build_object('professional_name',(select full_name from public.profiles where id=s.professional_id),'type_name',(select name from public.shift_types where id=s.shift_type_id)) end);
end;$$;
revoke execute on function private.bal_deferral_context(uuid) from public,anon,authenticated,service_role;

create function private.decide_bal_deferral(p_patient uuid,p_body jsonb,p_key uuid,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.bal_deferrals;a public.bal_assignments;s public.scheduled_shifts;
 old private.bal_commands;v_request jsonb;ctx jsonb;v_reason text;v_approve boolean;
 v_id uuid;v_name text;v_snapshot jsonb;v_result jsonb;begin
 if not coalesce(private.can(p_patient,'bal.read'),false) then raise exception 'balance read required' using errcode='42501';end if;
 if p_key is null then raise exception 'deferral decision key required' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('bal:'||p_patient,0));
 if not coalesce(private.can(p_patient,'bal.read'),false) then raise exception 'balance read required' using errcode='42501';end if;
 v_request:=jsonb_build_object('action','decide_deferral','body',p_body,'version',p_version);
 select * into old from private.bal_commands where care_recipient_id=p_patient and actor_id=auth.uid() and key=p_key;
 if found then
   if old.request is distinct from v_request then raise exception 'deferral decision idempotency conflict' using errcode='23505';end if;
   return old.result;
 end if;
 if jsonb_typeof(p_body) is distinct from 'object'
   or exists(select 1 from jsonb_object_keys(p_body) k where k not in ('id','approve','reason'))
   or jsonb_typeof(p_body->'id') is distinct from 'string'
   or coalesce(p_body->>'id','')!~'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
   or jsonb_typeof(p_body->'approve') is distinct from 'boolean'
   or jsonb_typeof(p_body->'reason') is distinct from 'string'
   or length(trim(p_body->>'reason'))<3 or private.bal_comment_units(p_body->>'reason')>1000 then
   raise exception 'invalid deferral decision body' using errcode='22023';end if;
 if not coalesce(private.bal_family_authority(p_patient,'bal.defer.approve'),false) then raise exception 'family approval required' using errcode='42501';end if;
 perform private.require_cap(p_patient,'bal.defer.approve');
 select * into d from public.bal_deferrals where care_recipient_id=p_patient and id=(p_body->>'id')::uuid for update;
 if not found then raise exception 'balance deferral not found' using errcode='P0002';end if;
 if d.status<>'pending' then raise exception 'balance deferral already decided or superseded' using errcode='PT409';end if;
 v_approve:=(p_body->>'approve')::boolean;v_reason:=trim(p_body->>'reason');
 select * into a from public.bal_assignments where id=d.assignment_id and care_recipient_id=p_patient for update;
 if v_approve then
   select * into s from public.scheduled_shifts where id=d.target_shift_id and care_recipient_id=p_patient for share;
 end if;
 ctx:=private.bal_deferral_context(d.id);
 if v_approve and not coalesce((ctx->>'canApprove')::boolean,false) then
   raise exception 'obsolete balance deferral target or assignment' using errcode='PT409';end if;
 select full_name into strict v_name from public.profiles where id=auth.uid();
 v_snapshot:=jsonb_build_object('actor',jsonb_build_object('id',auth.uid(),'name',v_name),'recordedAt',statement_timestamp(),
   'outcome',case when v_approve then 'approved' else 'rejected' end,'reason',v_reason,
   'proposal',to_jsonb(d)-'decision_snapshot','sourceAssignment',to_jsonb(a),'sourceContext',ctx,
   'deadlineChanged',v_approve);
 if v_approve then
   update public.bal_assignments set status='deferred',version=version+1 where id=a.id;
   v_id:=private.bal_assign(p_patient,a.cycle_id,d.target_shift_id,'deferred');
   update public.bal_obligations set effective_due=greatest(effective_due,(d.target_snapshot->>'ends_at')::timestamptz)
     where cycle_id=a.cycle_id and state='pending';
 end if;
 update public.bal_deferrals set status=case when v_approve then 'approved' else 'rejected' end,
   decided_by=auth.uid(),decided_at=statement_timestamp(),decision_reason=v_reason,decision_snapshot=v_snapshot
   where id=d.id returning * into d;
 perform private.bal_event(p_patient,d.cycle_id,case when v_approve then v_id else d.assignment_id end,
   case when v_approve then 'bal.cycle.deferred' else 'bal.cycle.deferral_rejected' end,v_reason,to_jsonb(d),
   'deferral:'||d.id||':'||d.status);
 v_result:=to_jsonb(d);
 insert into private.bal_commands(care_recipient_id,actor_id,key,request,result) values(p_patient,auth.uid(),p_key,v_request,v_result);
 perform private.require_cap(p_patient,'bal.defer.approve');
 if not coalesce(private.bal_family_authority(p_patient,'bal.defer.approve'),false) then raise exception 'family approval required' using errcode='42501';end if;
 if v_approve and (not private.schedule_worker(p_patient,s.professional_id) or not private.member_can(p_patient,s.professional_id,'bal.count')) then
   raise exception 'deferral target authority changed' using errcode='42501';end if;
 return v_result;
end;$$;
revoke execute on function private.decide_bal_deferral(uuid,jsonb,uuid,integer) from public,anon,authenticated,service_role;

do $$declare d text;needle text:=E'begin\n perform private.require_cap(p_patient,''bal.read'');';
 aggregate text:='jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select * from public.bal_deferrals';begin
 d:=replace(pg_get_functiondef('public.balance_command(uuid,text,jsonb,uuid,integer)'::regprocedure),E'\r\n',E'\n');
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected balance decision dispatch';end if;
 d:=replace(d,needle,E'begin\n if p_action=''decide_deferral'' then return private.decide_bal_deferral(p_patient,p_body,p_key,p_version);end if;\n perform private.require_cap(p_patient,''bal.read'');');execute d;
 d:=replace(pg_get_functiondef('public.balance_workspace(uuid)'::regprocedure),E'\r\n',E'\n');
 if length(d)-length(replace(d,aggregate,''))<>length(aggregate) then raise exception 'unexpected balance deferral read model';end if;
 d:=replace(d,aggregate,'jsonb_agg(to_jsonb(x)||jsonb_build_object(''decisionContext'',private.bal_deferral_context(x.id)) order by x.created_at desc) from (select * from public.bal_deferrals');execute d;
end;$$;
