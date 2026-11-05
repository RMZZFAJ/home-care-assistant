CREATE OR REPLACE FUNCTION public.admin_list_recipients()
 RETURNS SETOF care_recipients
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select r from public.care_recipients r where public.can_manage_recipient(r.id) order by r.display_name;
$function$
