CREATE OR REPLACE FUNCTION private.move_stock(p_patient uuid, p_product text, p_quantity numeric, p_source text, p_destination text, p_reason text, p_reference text, p_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_id uuid;begin
 if p_quantity<=0 then raise exception 'positive quantity required';end if;
 insert into public.stock_movements(care_recipient_id,product_id,quantity,movement_type,performed_by,source_location,destination_location,justification,reference_type,reference_id)
 values(p_patient,p_product,p_quantity,case when p_source is null then 'inbound'::public.stock_movement_type when p_destination is null then 'outbound'::public.stock_movement_type else 'outbound'::public.stock_movement_type end,
 auth.uid(),p_source,p_destination,p_reason,p_reference,p_id) returning id into v_id;return v_id;
end;$function$
