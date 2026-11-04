CREATE OR REPLACE FUNCTION public.admin_list_memberships(p_care_recipient_id uuid)
 RETURNS TABLE(id uuid, care_recipient_id uuid, user_id uuid, role profile_role, can_manage_stock boolean, can_count_stock boolean, status text, created_at timestamp with time zone, full_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select m.id,m.care_recipient_id,m.user_id,m.role,m.can_manage_stock,m.can_count_stock,m.status,m.created_at,p.full_name
  from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id
  where m.care_recipient_id=p_care_recipient_id and public.can_manage_recipient(p_care_recipient_id)
  order by p.full_name,m.id;
$function$
