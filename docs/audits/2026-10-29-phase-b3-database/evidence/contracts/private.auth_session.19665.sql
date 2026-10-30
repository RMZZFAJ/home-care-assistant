CREATE OR REPLACE FUNCTION private.auth_session()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select s.id from auth.sessions s join public.profiles p on p.id=s.user_id
 where s.id=nullif(auth.jwt()->>'session_id','')::uuid and s.user_id=auth.uid()
 and p.status='active' and (s.not_after is null or s.not_after>now());
$function$
