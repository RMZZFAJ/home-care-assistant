CREATE OR REPLACE FUNCTION public.my_active_context()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select to_jsonb(a)-'session_id'-'user_id' from private.authority_sessions a
 where a.session_id=private.auth_session() and a.user_id=auth.uid()
 and (a.mode='global' and private.global_identity() or a.mode='patient' and exists(
 select 1 from public.care_recipient_memberships m where m.user_id=a.user_id and m.care_recipient_id=a.care_recipient_id and m.status='active'));
$function$
