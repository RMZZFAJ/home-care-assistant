CREATE OR REPLACE FUNCTION public.guard_patient_product_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_owner uuid;
begin
  select owner_care_recipient_id into v_owner from public.products where id=new.product_id;
  if v_owner is not null and v_owner<>new.care_recipient_id then raise exception 'exclusive product belongs to another patient' using errcode='23514';end if;
  return new;
end; $function$
