CREATE OR REPLACE FUNCTION public.transition_requisition_status(p_requisition_id uuid, p_to_status requisition_status, p_reason text DEFAULT NULL::text)
 RETURNS requisitions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare patient_id uuid;begin
 if p_to_status<>'cancelled' then raise exception 'requisition progress is derived from confirmed events';end if;
 select care_recipient_id into patient_id from public.requisitions where id=p_requisition_id;
 perform private.require_cap(patient_id,'req.review');
 perform pg_advisory_xact_lock(hashtextextended('stock:'||patient_id,0));
 if exists(select 1 from public.requisition_lifecycle where requisition_id=p_requisition_id and (completed_at is not null or archived_at is not null)) then raise exception 'completed requisition requires compensating operations';end if;
 if exists(select 1 from public.document_request_links k join public.requisition_items i on i.id=k.requisition_item_id join public.document_lines l on l.id=k.document_line_id join public.operational_documents d on d.id=l.document_id where i.requisition_id=p_requisition_id and d.status<>'cancelled' and d.type='ENT') then raise exception 'resolve linked deliveries before cancellation';end if;
 return public.v3_transition_requisition_status(p_requisition_id,p_to_status,p_reason);
end;$function$
