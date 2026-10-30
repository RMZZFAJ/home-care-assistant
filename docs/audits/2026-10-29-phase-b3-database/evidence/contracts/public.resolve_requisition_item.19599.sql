CREATE OR REPLACE FUNCTION public.resolve_requisition_item(p_item uuid, p_product text, p_reason text, p_key uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare i public.requisition_items;r public.requisition_item_resolutions;begin
 select * into strict i from public.requisition_items where id=p_item for update;
 perform private.require_cap(i.care_recipient_id,'catalog.manage');
 perform private.require_cap(i.care_recipient_id,'req.review');
 if p_key is null or p_reason is null or length(trim(p_reason)) not between 3 and 1000
 or i.product_id is not null or i.custom_name is null then raise exception 'invalid custom item resolution';end if;
 select * into r from public.requisition_item_resolutions where resolved_by=auth.uid() and idempotency_key=p_key;
 if found then
 if r.requisition_item_id<>p_item or r.product_id<>p_product or r.reason<>trim(p_reason) then raise exception 'idempotency conflict' using errcode='23505';end if;
 return to_jsonb(r);end if;
 if exists(select 1 from public.requisition_item_resolutions where requisition_item_id=p_item)
 or not exists(select 1 from public.care_recipient_products where care_recipient_id=i.care_recipient_id and product_id=p_product and is_active)
 or not exists(select 1 from public.requisitions where id=i.requisition_id and status<>'cancelled') then raise exception 'invalid custom item product';end if;
 insert into public.requisition_item_resolutions(requisition_item_id,care_recipient_id,product_id,resolved_by,reason,idempotency_key)
 values(i.id,i.care_recipient_id,p_product,auth.uid(),trim(p_reason),p_key) returning * into r;
 update public.operational_documents set version=version+1 where id=i.requisition_id;
 perform private.record_document_event(i.requisition_id,'req.item_resolved',
 jsonb_build_object('itemId',i.id,'originalName',i.custom_name,'productId',p_product,'reason',trim(p_reason)),p_key);
 return to_jsonb(r);
end;$function$
