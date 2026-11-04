CREATE OR REPLACE FUNCTION private.guard_catalogue_unit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if not exists(select 1 from public.measurement_units where code=new.unit and (care_recipient_id is null or care_recipient_id=new.care_recipient_id)) then raise exception 'unknown patient measurement unit';end if;
 if tg_op='UPDATE' and (old.unit<>new.unit or old.quantity_decimals<>new.quantity_decimals) and
 (exists(select 1 from public.stock_movements where care_recipient_id=new.care_recipient_id and product_id=new.product_id) or exists(select 1 from public.document_lines where care_recipient_id=new.care_recipient_id and product_id=new.product_id) or exists(select 1 from public.requisition_items where care_recipient_id=new.care_recipient_id and product_id=new.product_id))
 then raise exception 'unit with operational history is immutable';end if;return new;
end;$function$
