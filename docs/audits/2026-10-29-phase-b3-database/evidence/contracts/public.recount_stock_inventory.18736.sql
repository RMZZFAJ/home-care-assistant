CREATE OR REPLACE FUNCTION public.recount_stock_inventory(p_inventory_id uuid)
 RETURNS stock_inventories
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare i public.stock_inventories;v public.stock_inventories;
begin
  select * into i from public.stock_inventories where id=p_inventory_id for update;
  if not found or not public.recipient_can(i.care_recipient_id,'count') or i.status in ('approved','cancelled') then raise exception 'inventory cannot be recounted' using errcode='42501'; end if;
  update public.stock_inventories set status='cancelled',review_reason='substituído por nova contagem' where id=i.id;
  v:=public.create_stock_inventory(i.care_recipient_id,i.location);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'inventory.recounted','stock_inventory',v.id,jsonb_build_object('care_recipient_id',i.care_recipient_id,'previous_inventory_id',i.id));
  return v;
end; $function$
