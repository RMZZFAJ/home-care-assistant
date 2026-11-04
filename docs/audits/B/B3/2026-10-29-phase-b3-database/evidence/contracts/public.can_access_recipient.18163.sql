CREATE OR REPLACE FUNCTION public.can_access_recipient(p_recipient_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select public.recipient_role(p_recipient_id) is not null;
$function$
