CREATE OR REPLACE FUNCTION private.stock_quantity(p_patient uuid, p_product text, p_location text)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select coalesce(sum(case when destination_location=p_location then quantity else 0 end-case when source_location=p_location then quantity else 0 end),0)
 from public.stock_movements where care_recipient_id=p_patient and product_id=p_product;
$function$
