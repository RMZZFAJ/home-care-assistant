CREATE OR REPLACE FUNCTION private.effective_requisition_product(p_item uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select coalesce(i.product_id,r.product_id) from public.requisition_items i
 left join public.requisition_item_resolutions r on r.requisition_item_id=i.id where i.id=p_item;
$function$
