CREATE OR REPLACE FUNCTION public.create_stock_inventory(p_care_recipient_id uuid, p_location text)
 RETURNS stock_inventories
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.stock_inventories;
begin
  if not public.recipient_can(p_care_recipient_id,'count') then raise exception 'inventory authorization required' using errcode='42501'; end if;
  if p_location is null or p_location not in ('FAMILY','CARE_TEAM') then raise exception 'invalid location'; end if;
  perform pg_advisory_xact_lock(hashtextextended('stock:'||p_care_recipient_id,0));
  insert into public.stock_inventories(care_recipient_id,location,counted_by,reference_at) values(p_care_recipient_id,p_location,auth.uid(),clock_timestamp()) returning * into v;
  -- Snapshot every active product, including zero balances, while movement writers are excluded.
  insert into public.stock_inventory_items(inventory_id,product_id,counted_quantity,expected_quantity,reference_movement_id)
  select v.id,p.product_id,0,coalesce((select balance from public.current_stock_balances where care_recipient_id=p_care_recipient_id and product_id=p.product_id and location=p_location),0),
    (select id from public.stock_movements where care_recipient_id=p_care_recipient_id and product_id=p.product_id and (source_location=p_location or destination_location=p_location) order by movement_revision desc limit 1)
  from public.care_recipient_products p where p.care_recipient_id=p_care_recipient_id and p.is_active;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'inventory.created','stock_inventory',v.id,jsonb_build_object('care_recipient_id',p_care_recipient_id));
  return v;
end; $function$
