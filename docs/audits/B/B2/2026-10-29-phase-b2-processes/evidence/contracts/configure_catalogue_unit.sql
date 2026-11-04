CREATE OR REPLACE FUNCTION public.configure_catalogue_unit(p_patient uuid, p_product text, p_unit text, p_decimals integer, p_barcode text DEFAULT NULL::text, p_presentation text DEFAULT NULL::text, p_base_quantity numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_id uuid;begin
 perform private.require_cap(p_patient,'catalog.manage');
 if p_decimals not between 0 and 6 or not exists(select 1 from public.measurement_units where code=p_unit and (care_recipient_id is null or care_recipient_id=p_patient)) then raise exception 'invalid measurement unit';end if;
 if exists(select 1 from public.stock_movements where care_recipient_id=p_patient and product_id=p_product) and exists(select 1 from public.care_recipient_products where care_recipient_id=p_patient and product_id=p_product and (unit<>p_unit or quantity_decimals<>p_decimals)) then raise exception 'unit with operational history is immutable';end if;
 update public.care_recipient_products set unit=p_unit,quantity_decimals=p_decimals where care_recipient_id=p_patient and product_id=p_product;
 if not found then raise exception 'product not found';end if;
 if p_barcode is not null then
 if p_base_quantity<=0 or p_base_quantity<>round(p_base_quantity,p_decimals) or length(trim(coalesce(p_presentation,'')))<2 then raise exception 'invalid presentation';end if;
 insert into public.product_presentations(care_recipient_id,product_id,barcode,name,base_quantity) values(p_patient,p_product,p_barcode,p_presentation,p_base_quantity)
 on conflict(care_recipient_id,barcode) do update set name=excluded.name,base_quantity=excluded.base_quantity where public.product_presentations.product_id=excluded.product_id returning id into v_id;
 if v_id is null then raise exception 'barcode already associated with another product';end if;
 end if;
 return jsonb_build_object('presentationId',v_id);
end;$function$
