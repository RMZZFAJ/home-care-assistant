CREATE OR REPLACE FUNCTION public.is_global_administrator()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select private.global_identity() and private.admin_assurance() and exists(select 1 from private.authority_sessions where session_id=private.auth_session() and user_id=auth.uid() and mode='global');
$function$
