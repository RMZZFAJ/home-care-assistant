CREATE OR REPLACE FUNCTION public.recipient_role(p_recipient_id uuid)
 RETURNS profile_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select m.role from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id
 where m.user_id=auth.uid() and m.care_recipient_id=p_recipient_id and m.status='active' and p.status='active' and private.has_patient_authority(p_recipient_id);
$function$
