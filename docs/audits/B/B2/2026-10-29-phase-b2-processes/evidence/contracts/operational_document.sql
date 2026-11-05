CREATE OR REPLACE FUNCTION public.operational_document(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d public.operational_documents;begin
 select * into d from public.operational_documents where id=p_id;
 if not found or not private.can(d.care_recipient_id,lower(d.type)||'.read') then raise exception 'document not found' using errcode='42501';end if;
 return to_jsonb(d)||jsonb_build_object('lines',coalesce((select jsonb_agg(to_jsonb(l)||jsonb_build_object('requisitionItemIds',coalesce((select jsonb_agg(requisition_item_id) from public.document_request_links where document_line_id=l.id),'[]')) order by l.category_snapshot,l.name_snapshot) from public.document_lines l where document_id=p_id),'[]'),
 'events',coalesce((select jsonb_agg(jsonb_build_object('id',id,'version',version,'action',action,'actorId',actor_id,'createdAt',created_at,'hash',content_hash) order by version) from public.document_events where document_id=p_id),'[]'),
 'receipts',coalesce((select jsonb_agg(to_jsonb(r) order by created_at) from public.purchase_receipts r where document_id=p_id),'[]'),
 'approvals',coalesce((select jsonb_agg(to_jsonb(a)) from public.bal_approvals a where document_id=p_id),'[]'),
 'fullyCheckedLines',(select count(*) from public.document_lines where document_id=p_id and fully_checked),
 'totalLines',(select count(*) from public.document_lines where document_id=p_id));
end;$function$
