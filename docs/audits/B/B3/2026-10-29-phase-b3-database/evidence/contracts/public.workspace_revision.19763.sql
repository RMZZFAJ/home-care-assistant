CREATE OR REPLACE FUNCTION public.workspace_revision()
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select coalesce((select revision from private.workspace_revisions where user_id=auth.uid() and private.auth_session() is not null),0);
$function$
