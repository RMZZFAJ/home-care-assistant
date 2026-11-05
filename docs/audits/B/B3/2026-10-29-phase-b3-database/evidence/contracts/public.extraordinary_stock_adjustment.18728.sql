CREATE OR REPLACE FUNCTION public.extraordinary_stock_adjustment(p_care_recipient_id uuid, p_product_id text, p_quantity integer, p_location text, p_justification text, p_confirmation boolean, p_idempotency_key uuid)
 RETURNS stock_movements
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v public.stock_movements;v_hash text;
begin
  if not public.is_global_administrator() or not public.recipient_can(p_care_recipient_id,'stock') or not coalesce(p_confirmation,false) then raise exception 'confirmed global administrator required' using errcode='42501'; end if;
  if p_quantity is null or p_quantity=0 or p_quantity=-2147483648 or p_location is null or p_location not in ('FAMILY','CARE_TEAM') or p_idempotency_key is null or p_justification is null or length(trim(p_justification)) not between 1 and 1000 then raise exception 'invalid extraordinary adjustment'; end if;
  v_hash:=encode(digest(jsonb_build_array('extraordinary',p_care_recipient_id,p_product_id,p_quantity,p_location,trim(p_justification))::text,'sha256'),'hex');
  perform pg_advisory_xact_lock(hashtextextended('movement:'||auth.uid()||':'||p_idempotency_key,0));
  select * into v from public.stock_movements where performed_by=auth.uid() and idempotency_key=p_idempotency_key;
  if found then if v.payload_hash is distinct from v_hash then raise exception 'idempotency conflict'; end if;return v;end if;
  if not exists(select 1 from public.care_recipient_products where care_recipient_id=p_care_recipient_id and product_id=p_product_id and is_active) then raise exception 'invalid patient catalogue product'; end if;
  insert into public.stock_movements(product_id,quantity,movement_type,performed_by,justification,care_recipient_id,source_location,destination_location,idempotency_key,reference_type,payload_hash,extraordinary_confirmed)
  values(p_product_id,abs(p_quantity),'adjustment',auth.uid(),trim(p_justification),p_care_recipient_id,case when p_quantity<0 then p_location end,case when p_quantity>0 then p_location end,p_idempotency_key,'extraordinary_adjustment',v_hash,true) returning * into v;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'stock.extraordinary.adjustment','stock_movement',v.id,jsonb_build_object('care_recipient_id',p_care_recipient_id,'quantity',p_quantity,'location',p_location,'reason',trim(p_justification),'confirmed',true));
  return v;
end; $function$
