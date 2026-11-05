CREATE OR REPLACE FUNCTION public.record_stock_movement(p_care_recipient_id uuid, p_product_id text, p_quantity integer, p_movement_type stock_movement_type, p_source_location text, p_destination_location text, p_justification text, p_idempotency_key uuid DEFAULT NULL::uuid, p_reference_type text DEFAULT NULL::text, p_reference_id uuid DEFAULT NULL::uuid)
 RETURNS stock_movements
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v public.stock_movements;v_hash text;
begin
  if not public.recipient_can(p_care_recipient_id,'stock') then raise exception 'stock management not authorized' using errcode='42501'; end if;
  if p_quantity is null or p_quantity<=0 or p_movement_type is null or p_justification is null or length(trim(p_justification)) not between 1 and 1000 or p_idempotency_key is null then raise exception 'invalid stock movement'; end if;
  v_hash:=encode(digest(jsonb_build_array(p_care_recipient_id,p_product_id,p_quantity,p_movement_type,p_source_location,p_destination_location,trim(p_justification),p_reference_type,p_reference_id)::text,'sha256'),'hex');
  perform pg_advisory_xact_lock(hashtextextended('movement:'||auth.uid()||':'||p_idempotency_key,0));
  select * into v from public.stock_movements where performed_by=auth.uid() and idempotency_key=p_idempotency_key;
  if found then
    if v.payload_hash is distinct from v_hash then raise exception 'idempotency conflict' using errcode='23505'; end if;
    return v;
  end if;
  if not exists(select 1 from public.care_recipient_products where care_recipient_id=p_care_recipient_id and product_id=p_product_id and is_active) then raise exception 'invalid patient catalogue product'; end if;
  insert into public.stock_movements(product_id,quantity,movement_type,performed_by,justification,care_recipient_id,source_location,destination_location,idempotency_key,reference_type,reference_id,payload_hash)
  values(p_product_id,p_quantity,p_movement_type,auth.uid(),trim(p_justification),p_care_recipient_id,p_source_location,p_destination_location,p_idempotency_key,p_reference_type,p_reference_id,v_hash) returning * into v;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'stock.movement.created','stock_movement',v.id,jsonb_build_object('care_recipient_id',p_care_recipient_id,'product_id',p_product_id,'quantity',p_quantity,'source_before',v.source_balance_before,'source_after',v.source_balance_after,'destination_before',v.destination_balance_before,'destination_after',v.destination_balance_after));
  return v;
end; $function$
