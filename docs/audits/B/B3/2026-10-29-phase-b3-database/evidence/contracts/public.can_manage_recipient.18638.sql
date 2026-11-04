CREATE OR REPLACE FUNCTION public.can_manage_recipient(p_recipient_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select coalesce(public.recipient_role(p_recipient_id)='admin' and private.admin_assurance(),false);
$function$
