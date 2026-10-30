CREATE OR REPLACE FUNCTION private.can(p_patient uuid, p_capability text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select public.can_access_recipient(p_patient) and private.member_can(p_patient,auth.uid(),p_capability)
 and (public.recipient_role(p_patient)<>'admin' or p_capability like '%.read' or private.admin_assurance());
$function$
