CREATE OR REPLACE FUNCTION private.adopt_catalogue_model(p_patient uuid, p_product text)
 RETURNS care_recipient_products
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare model public.products;
begin
  perform private.require_cap(p_patient, 'catalog.manage');
  perform pg_advisory_xact_lock(hashtextextended('catalogue:' || p_patient, 0));
  if not exists (select 1 from public.care_recipients where id = p_patient and is_active) then
    raise exception 'inactive patient' using errcode = '42501';
  end if;
  select * into model from public.products
    where id = p_product and owner_care_recipient_id is null and is_active;
  if not found then raise exception 'template not found'; end if;
  if exists (select 1 from public.care_recipient_products where care_recipient_id = p_patient and product_id = model.id) then
    raise exception 'template already adopted' using errcode = '23505';
  end if;
  return public.admin_upsert_recipient_product(p_patient, model.id, model.name, model.category, model.unit, model.aliases, true);
end;
$function$
