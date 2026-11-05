CREATE OR REPLACE FUNCTION private.init_requisition_science(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d public.operational_documents;s jsonb;targets uuid[];begin
 select * into strict d from public.operational_documents where id=p_id and type='REQ';
 if exists(select 1 from public.requisition_lifecycle where requisition_id=p_id) then return;end if;
 select coalesce(settings,'{}') into s from public.patient_settings where care_recipient_id=d.care_recipient_id;
 s:='{"scienceRequired":true,"scienceRoles":["admin","family"],"scienceUsers":[],"scienceRequirement":"any","scienceByDispatch":true,"scienceAutomatic":false,"archiveDays":7,"reminderHours":2,"reminderRepeatHours":24}'::jsonb||coalesce(s,'{}');
 select coalesce(array_agg(m.user_id),'{}') into targets from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id
 where m.care_recipient_id=d.care_recipient_id and m.status='active' and p.status='active'
 and (s->'scienceRoles' ? m.role::text or s->'scienceUsers' ? m.user_id::text) and private.member_can(d.care_recipient_id,m.user_id,'req.science');
 insert into public.requisition_lifecycle(requisition_id,care_recipient_id,policy,eligible_users,next_reminder_at)
 values(p_id,d.care_recipient_id,s,targets,now()+make_interval(hours=>(s->>'reminderHours')::integer));
end;$function$
