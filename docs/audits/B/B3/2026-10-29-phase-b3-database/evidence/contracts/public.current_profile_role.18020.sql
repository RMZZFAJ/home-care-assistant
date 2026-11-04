CREATE OR REPLACE FUNCTION public.current_profile_role()
 RETURNS profile_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select role from public.profiles where id = auth.uid() and status = 'active';
$function$
