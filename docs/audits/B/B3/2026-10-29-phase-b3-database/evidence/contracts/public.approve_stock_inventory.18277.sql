CREATE OR REPLACE FUNCTION public.approve_stock_inventory(p_inventory_id uuid)
 RETURNS stock_inventories
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare i public.stock_inventories;x public.stock_inventory_items;v_current uuid;v_delta bigint;
begin
  select * into i from public.stock_inventories where id=p_inventory_id for update;
  if not found or not public.recipient_can(i.care_recipient_id,'review') then raise exception 'inventory approval required' using errcode='42501'; end if;
  if i.status='approved' then return i; end if;
  if i.status not in ('submitted','under_review') or i.reference_at is null then raise exception 'inventory must be recounted from a current snapshot'; end if;
  perform pg_advisory_xact_lock(hashtextextended('stock:'||i.care_recipient_id,0));
  -- Validate all references before inserting any adjustment.
  for x in select * from public.stock_inventory_items where inventory_id=i.id order by product_id loop
    select id into v_current from public.stock_movements where care_recipient_id=i.care_recipient_id and product_id=x.product_id and (source_location=i.location or destination_location=i.location) order by movement_revision desc limit 1;
    if v_current is distinct from x.reference_movement_id or x.expected_quantity is null or not x.is_counted then raise exception 'inventory reference changed; recount required' using errcode='P0001'; end if;
  end loop;
  for x in select * from public.stock_inventory_items where inventory_id=i.id order by product_id loop
    v_delta:=x.counted_quantity-x.expected_quantity;
    if abs(v_delta)>2147483647 then raise exception 'inventory adjustment exceeds allowed quantity'; end if;
    if v_delta<>0 then
      if x.justification is null then raise exception 'divergence justification required'; end if;
      insert into public.stock_movements(product_id,quantity,movement_type,performed_by,justification,care_recipient_id,source_location,destination_location,reference_type,reference_id)
      values(x.product_id,abs(v_delta)::integer,'adjustment',auth.uid(),x.justification,i.care_recipient_id,case when v_delta<0 then i.location end,case when v_delta>0 then i.location end,'inventory',i.id);
    end if;
  end loop;
  update public.stock_inventories set status='approved',approved_by=auth.uid(),approved_at=now() where id=i.id returning * into i;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'inventory.approved','stock_inventory',i.id,jsonb_build_object('care_recipient_id',i.care_recipient_id));
  return i;
end; $function$
