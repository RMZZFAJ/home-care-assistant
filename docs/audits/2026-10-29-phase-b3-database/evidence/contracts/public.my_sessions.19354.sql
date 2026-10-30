CREATE OR REPLACE FUNCTION public.my_sessions()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'createdAt',created_at,'updatedAt',updated_at,'userAgent',user_agent,'current',id::text=auth.jwt()->>'session_id')),'[]') from auth.sessions where user_id=auth.uid();
$function$
