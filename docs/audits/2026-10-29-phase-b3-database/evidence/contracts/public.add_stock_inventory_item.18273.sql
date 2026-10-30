CREATE OR REPLACE FUNCTION public.add_stock_inventory_item(p_inventory_id uuid, p_product_id text, p_counted_quantity bigint, p_justification text DEFAULT NULL::text)
 RETURNS stock_inventory_items
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.stock_inventory_items; i public.stock_inventories;
begin
  select * into i from public.stock_inventories where id=p_inventory_id for update;
  if not found or i.status<>'draft' then raise exception 'inventory not editable'; end if;
  if not public.recipient_can(i.care_recipient_id,'count') then raise exception 'inventory authorization required' using errcode='42501'; end if;
  if p_counted_quantity is null or p_counted_quantity<0 or p_counted_quantity>2147483647 then raise exception 'invalid count'; end if;
  update public.stock_inventory_items set counted_quantity=p_counted_quantity,justification=nullif(trim(p_justification),''),is_counted=true where inventory_id=p_inventory_id and product_id=p_product_id returning * into v;
  if not found then raise exception 'product absent from inventory snapshot; open a new inventory'; end if;
  return v;
end; $function$
