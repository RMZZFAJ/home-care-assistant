CREATE OR REPLACE FUNCTION public.select_active_context(p_patient uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare sid uuid:=private.auth_session();begin
 if sid is null then raise exception 'active Auth session required' using errcode='42501';end if;
 if p_patient is null then
 if not private.global_identity() then raise exception 'global authorization required' using errcode='42501';end if;
 elsif not exists(select 1 from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=auth.uid() and status='active') then
 raise exception 'active patient membership required' using errcode='42501';end if;
 insert into private.authority_sessions(session_id,user_id,mode,care_recipient_id)
 values(sid,auth.uid(),case when p_patient is null then 'global' else 'patient' end,p_patient)
 on conflict(session_id) do update set mode=excluded.mode,care_recipient_id=excluded.care_recipient_id,revision=private.authority_sessions.revision+1,updated_at=now();
 insert into public.audit_events(actor_id,action,entity_type,metadata) values(auth.uid(),'authority.selected','session',jsonb_build_object('care_recipient_id',p_patient,'mode',case when p_patient is null then 'global' else 'patient' end));
 return public.my_active_context();
end;$function$
