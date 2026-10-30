CREATE OR REPLACE FUNCTION private.schedule_worker(p_patient uuid, p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id
 where m.care_recipient_id=p_patient and m.user_id=p_user and m.status='active' and p.status='active' and m.role in ('professional','supervisor'));
$function$
