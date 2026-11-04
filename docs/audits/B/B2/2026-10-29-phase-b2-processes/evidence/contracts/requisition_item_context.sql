CREATE OR REPLACE FUNCTION public.requisition_item_context(p_patient uuid, p_products text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if not private.can(p_patient,'req.read') or cardinality(p_products)>1000 then raise exception 'required permission' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('productId',c.product_id,'familyStock',case when private.can(p_patient,'req.family_stock') then private.stock_quantity(p_patient,c.product_id,'FAMILY')::text else null end,
 'pending',coalesce((select jsonb_agg(jsonb_build_object('requisitionId',r.id,'lineId',i.id,'code',coalesce(d.code,r.protocol),'createdAt',r.created_at,'status',r.status)) from public.requisition_items i join public.requisitions r on r.id=i.requisition_id left join public.operational_documents d on d.id=r.id where i.care_recipient_id=p_patient and private.effective_requisition_product(i.id)=c.product_id and r.status<>'cancelled' and not exists(select 1 from public.document_request_links k join public.document_lines dl on dl.id=k.document_line_id join public.operational_documents od on od.id=dl.document_id where k.requisition_item_id=i.id and od.type='ENT' and od.status<>'cancelled' and dl.accepted_quantity>0)),'[]')))
 from public.care_recipient_products c where c.care_recipient_id=p_patient and c.product_id=any(p_products)),'[]');
end;$function$
