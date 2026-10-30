CREATE OR REPLACE FUNCTION public.admin_adopt_product(p_care_recipient_id uuid, p_product_id text)
 RETURNS care_recipient_products
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select private.adopt_catalogue_model(p_care_recipient_id, p_product_id);
$function$
