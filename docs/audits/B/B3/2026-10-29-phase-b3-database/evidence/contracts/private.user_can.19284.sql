CREATE OR REPLACE FUNCTION private.user_can(p_patient uuid, p_user uuid, p_cap text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select private.member_can(p_patient,p_user,p_cap);$function$
