CREATE OR REPLACE FUNCTION public.derive_item_patient()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_table_name='requisition_items' then
    select care_recipient_id into new.care_recipient_id from public.requisitions where id=new.requisition_id;
  else
    select care_recipient_id into new.care_recipient_id from public.stock_inventories where id=new.inventory_id;
  end if;
  return new;
end; $function$
