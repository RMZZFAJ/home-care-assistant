CREATE OR REPLACE FUNCTION public.family_stock_movement(p_patient uuid, p_product text, p_quantity numeric, p_action text, p_reason text, p_key uuid, p_reference uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v public.stock_movements;v_id uuid;h text;begin
 perform private.require_cap(p_patient,'stock.family.manage');
 if p_quantity<=0 or p_quantity is null or p_quantity>1000000000 or p_action not in ('inbound','outbound','correction_in','correction_out') or length(trim(coalesce(p_reason,''))) not between 3 and 1000 or p_key is null then raise exception 'invalid family movement';end if;
 h:=encode(extensions.digest(jsonb_build_array(p_patient,p_product,p_quantity,p_action,trim(p_reason),p_reference)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
 select * into v from public.stock_movements where performed_by=auth.uid() and idempotency_key=p_key;
 if found then if v.payload_hash<>h then raise exception 'idempotency conflict' using errcode='23505';end if;return v.id;end if;
 if p_reference is not null and not exists(select 1 from public.stock_movements where id=p_reference and care_recipient_id=p_patient and product_id=p_product and reference_type='family_manual') then raise exception 'invalid compensation reference';end if;
 v_id:=private.move_stock(p_patient,p_product,p_quantity,case when p_action in ('outbound','correction_out') then 'FAMILY' end,case when p_action in ('inbound','correction_in') then 'FAMILY' end,trim(p_reason),'family_manual',p_reference);
 update public.stock_movements set idempotency_key=p_key,payload_hash=h where id=v_id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'stock.family.'||p_action,'stock_movement',v_id,jsonb_build_object('care_recipient_id',p_patient));
 return v_id;
end;$function$
