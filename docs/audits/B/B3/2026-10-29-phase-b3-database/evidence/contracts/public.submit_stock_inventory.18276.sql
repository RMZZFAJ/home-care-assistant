CREATE OR REPLACE FUNCTION public.submit_stock_inventory(p_inventory_id uuid)
 RETURNS stock_inventories
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare i public.stock_inventories;
begin
  select * into i from public.stock_inventories where id=p_inventory_id for update;
  if not found or i.status<>'draft' or not public.recipient_can(i.care_recipient_id,'count') then raise exception 'inventory cannot be submitted' using errcode='42501'; end if;
  if not exists(select 1 from public.stock_inventory_items where inventory_id=i.id)
    or exists(select 1 from public.stock_inventory_items where inventory_id=i.id and (not is_counted or expected_quantity is null or counted_quantity<>expected_quantity and justification is null)) then raise exception 'complete all counts and justify divergences'; end if;
  update public.stock_inventories set status='submitted',counted_at=now() where id=i.id returning * into i;
  return i;
end; $function$
