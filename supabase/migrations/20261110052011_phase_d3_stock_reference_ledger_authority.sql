-- Internal reference facts come from the authoritative ledger,independent of disclosure permission.
create or replace function private.stock_movement_preparation_snapshot(p_patient uuid,p_product text,p_reference uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare product jsonb;origin jsonb;balance numeric;ledger text;begin
 perform private.require_stock_movement_preparation_scope(p_patient,'family_movement',p_patient);
 select jsonb_build_object('id',c.product_id,'name',c.name,'unit',c.unit,'decimals',c.quantity_decimals,'active',c.is_active) into product from public.care_recipient_products c where c.care_recipient_id=p_patient and c.product_id=p_product;
 if product is null then raise exception 'stock material unavailable' using errcode='42501';end if;
 if p_reference is not null then
  select jsonb_build_object('id',m.id,'productId',m.product_id,'quantity',m.quantity::text,'sourceLocation',m.source_location,'destinationLocation',m.destination_location,'recordedAt',m.created_at,'performedBy',m.performed_by,'reason',m.justification) into origin from public.stock_movements m where m.id=p_reference and m.care_recipient_id=p_patient and m.product_id=p_product and m.reference_type='family_manual';
  if origin is null then raise exception 'stock compensation unavailable' using errcode='42501';end if;
 end if;
 balance:=private.stock_quantity(p_patient,p_product,'FAMILY');
 select encode(extensions.digest(coalesce(jsonb_agg(m.id order by m.id),'[]'::jsonb)::text,'sha256'),'hex') into ledger from public.stock_movements m where m.care_recipient_id=p_patient and m.product_id=p_product and (m.source_location='FAMILY' or m.destination_location='FAMILY');
 return jsonb_build_object('patientId',p_patient,'product',product,'balance',coalesce(balance,0)::text,'origin',origin,'ledgerHash',ledger);
end;$$;



revoke all on function private.stock_movement_preparation_snapshot(uuid,text,uuid) from public,anon,authenticated,service_role;
