CREATE OR REPLACE FUNCTION public.recipient_can(p_recipient_id uuid, p_operation text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.care_recipients where id=p_recipient_id and is_active)
 and private.can(p_recipient_id,case p_operation when 'admin' then 'access.manage' when 'submit' then 'req.create'
 when 'review' then 'req.review' when 'stock' then 'stock.family.manage' when 'count' then 'bal.count' else p_operation end);
$function$
