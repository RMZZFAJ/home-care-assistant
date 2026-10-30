CREATE OR REPLACE FUNCTION public.admin_list_products()
 RETURNS SETOF products
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select p from public.products p where public.is_global_administrator() order by p.name; $function$
