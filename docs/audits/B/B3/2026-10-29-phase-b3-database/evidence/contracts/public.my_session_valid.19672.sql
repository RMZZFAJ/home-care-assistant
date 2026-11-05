CREATE OR REPLACE FUNCTION public.my_session_valid()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select private.auth_session() is not null;$function$
