CREATE OR REPLACE FUNCTION public.find_patient_product_by_alias(p_care_recipient_id uuid, p_query text)
 RETURNS TABLE(product_id text, name text, category product_category, unit text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select c.product_id,c.name,c.category,c.unit from public.care_recipient_products c
  where public.can_access_recipient(p_care_recipient_id) and c.care_recipient_id=p_care_recipient_id and c.is_active
    and exists(select 1 from unnest(array_append(c.aliases,c.name)) a where unaccent(lower(trim(a)))=unaccent(lower(trim(p_query))));
$function$
