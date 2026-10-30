CREATE OR REPLACE FUNCTION private.bal_family_authority(p_patient uuid, p_cap text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select private.can(p_patient,p_cap) and exists(select 1 from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=auth.uid() and status='active' and role in ('admin','family'));
$function$
