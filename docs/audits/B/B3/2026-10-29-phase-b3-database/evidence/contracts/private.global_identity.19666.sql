CREATE OR REPLACE FUNCTION private.global_identity()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.profiles where id=auth.uid() and status='active' and role='admin' and global_scope);
$function$
