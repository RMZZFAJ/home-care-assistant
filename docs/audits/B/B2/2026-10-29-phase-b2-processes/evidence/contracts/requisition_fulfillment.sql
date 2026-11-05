CREATE OR REPLACE FUNCTION public.requisition_fulfillment(p_requisition uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare p uuid;begin
 select care_recipient_id into p from public.requisitions where id=p_requisition;
 if not private.can(p,'req.read') then raise exception 'required permission' using errcode='42501';end if;
 return (select jsonb_build_object('total',count(*),'fulfilled',count(*) filter(where attended),'lines',coalesce(jsonb_agg(jsonb_build_object('id',i.id,'productId',private.effective_requisition_product(i.id),'attended',attended,'deliveries',deliveries)),'[]'))
 from (select i.*,exists(select 1 from public.document_request_links x join public.document_lines l on l.id=x.document_line_id join public.operational_documents d on d.id=l.document_id where x.requisition_item_id=i.id and d.type='ENT' and d.status<>'cancelled' and l.accepted_quantity>0) attended,
 coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'code',d.code,'acceptedQuantity',l.accepted_quantity::text,'status',d.status)) from public.document_request_links x join public.document_lines l on l.id=x.document_line_id join public.operational_documents d on d.id=l.document_id where x.requisition_item_id=i.id and d.type='ENT'),'[]') deliveries
 from public.requisition_items i where i.requisition_id=p_requisition) i);
end;$function$
