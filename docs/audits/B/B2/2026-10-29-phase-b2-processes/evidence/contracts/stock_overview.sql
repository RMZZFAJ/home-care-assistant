CREATE OR REPLACE FUNCTION public.stock_overview(p_patient uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare family boolean:=private.can(p_patient,'stock.family.read');team boolean:=private.can(p_patient,'stock.team.read');begin
 if not(family or team) then raise exception 'stock permission required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('productId',c.product_id,'name',c.name,'unit',c.unit,'decimals',c.quantity_decimals,'active',c.is_active,
 'family',case when family then jsonb_build_object('confirmed',private.stock_quantity(p_patient,c.product_id,'FAMILY')::text,
 'incoming',coalesce((select sum(l.quantity-l.accepted_quantity-l.reconciled_quantity) from public.document_lines l join public.operational_documents d on d.id=l.document_id where d.care_recipient_id=p_patient and d.type='ENT' and d.payload->>'destination'='FAMILY' and d.status in ('pending_receipt','disputed','cancellation_pending') and l.product_id=c.product_id),0)::text,
 'purchasePending',coalesce((select sum(l.approved_quantity-l.accepted_quantity) from public.document_lines l join public.operational_documents d on d.id=l.document_id where d.care_recipient_id=p_patient and d.type='COM' and d.status in ('approved','partially_approved','purchasing','purchased','partially_received') and l.product_id=c.product_id),0)::text,
 'minimum',(select low_threshold from public.stock_alert_rules where care_recipient_id=p_patient and product_id=c.product_id and location='FAMILY' and is_enabled)) else null end,
 'team',case when team then jsonb_build_object('confirmed',private.stock_quantity(p_patient,c.product_id,'CARE_TEAM')::text,
 'incoming',coalesce((select sum(l.quantity-l.accepted_quantity-l.reconciled_quantity) from public.document_lines l join public.operational_documents d on d.id=l.document_id where d.care_recipient_id=p_patient and d.type='ENT' and d.payload->>'destination'='CARE_TEAM' and d.status in ('pending_receipt','disputed','cancellation_pending') and l.product_id=c.product_id),0)::text,
 'minimum',(select low_threshold from public.stock_alert_rules where care_recipient_id=p_patient and product_id=c.product_id and location='CARE_TEAM' and is_enabled)) else null end,
 'disputed',coalesce((select sum(l.quantity-l.accepted_quantity-l.reconciled_quantity) from public.document_lines l join public.operational_documents d on d.id=l.document_id where d.care_recipient_id=p_patient and d.type='ENT' and d.status in ('disputed','cancellation_pending') and l.product_id=c.product_id),0)::text) order by c.category,c.sort_order,c.name)
 from public.care_recipient_products c where c.care_recipient_id=p_patient),'[]');
end;$function$
