CREATE OR REPLACE FUNCTION private.v3_apply_access_change(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.access_change_requests;x jsonb;begin
 select * into strict c from public.access_change_requests where id=p_id;
 x:=c.proposed;
 if c.kind='settings' then
 update public.patient_settings set settings=settings||x,version=version+1,updated_at=now() where care_recipient_id=c.care_recipient_id;
 elsif c.kind='capability' then
 if x->>'subjectUser' is not null then
 insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(c.care_recipient_id,x->>'capability',(x->>'subjectUser')::uuid,(x->>'enabled')::boolean)
 on conflict(care_recipient_id,capability,subject_user) where subject_user is not null do update set enabled=excluded.enabled;
 else
 insert into public.capability_overrides(care_recipient_id,capability,subject_role,enabled) values(c.care_recipient_id,x->>'capability',x->>'subjectRole',(x->>'enabled')::boolean)
 on conflict(care_recipient_id,capability,subject_role) where subject_role is not null do update set enabled=excluded.enabled;
 end if;
 update public.patient_settings set version=version+1,updated_at=now() where care_recipient_id=c.care_recipient_id;
 elsif c.kind='membership' then
 perform public.admin_upsert_membership(c.care_recipient_id,(x->>'userId')::uuid,(x->>'role')::public.profile_role,false,false);
 update public.patient_settings set version=version+1,updated_at=now() where care_recipient_id=c.care_recipient_id;
 end if;
 update public.access_change_requests set status='applied',decided_at=now() where id=p_id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'access.applied','access_change',p_id,jsonb_build_object('care_recipient_id',c.care_recipient_id,'kind',c.kind));
end;$function$
