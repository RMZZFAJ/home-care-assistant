CREATE OR REPLACE FUNCTION public.admin_list_profiles()
 RETURNS TABLE(id uuid, full_name text, role profile_role, status text, global_scope boolean, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.id, p.full_name, p.role, p.status, p.global_scope, p.created_at
  from public.profiles p
  where public.is_global_administrator()
  order by p.full_name;
$function$
