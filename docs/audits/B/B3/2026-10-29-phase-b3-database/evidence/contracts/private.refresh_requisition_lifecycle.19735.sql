CREATE OR REPLACE FUNCTION private.refresh_requisition_lifecycle(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.requisition_lifecycle;total integer;fulfilled integer;blocked boolean;current_state jsonb;changed boolean;begin
 select * into s from public.requisition_lifecycle where requisition_id=p_id for update;
 if not found then return;end if;
 select count(*),count(*) filter(where exists(select 1 from public.document_request_links k join public.document_lines l on l.id=k.document_line_id join public.operational_documents d on d.id=l.document_id
 where k.requisition_item_id=i.id and d.type='ENT' and d.status<>'cancelled' and l.accepted_quantity>0)) into total,fulfilled
 from public.requisition_items i where i.requisition_id=p_id;
 select exists(select 1 from public.document_request_links k join public.requisition_items i on i.id=k.requisition_item_id join public.document_lines l on l.id=k.document_line_id join public.operational_documents d on d.id=l.document_id
 where i.requisition_id=p_id and d.type='ENT' and (d.status='cancellation_pending' or coalesce((l.metadata->>'issueOpen')::boolean,false))) into blocked;

 select coalesce(jsonb_agg(jsonb_build_object('itemId',i.id,'deliveryId',d.id,'lineId',l.id,'accepted',l.accepted_quantity::text,'reconciled',l.reconciled_quantity::text,'issueOpen',coalesce((l.metadata->>'issueOpen')::boolean,false),'status',d.status) order by i.id,d.id,l.id),'[]') into current_state
 from public.requisition_items i join public.document_request_links k on k.requisition_item_id=i.id join public.document_lines l on l.id=k.document_line_id join public.operational_documents d on d.id=l.document_id and d.type='ENT' where i.requisition_id=p_id;
 changed:=current_state is distinct from s.fulfillment_state;
 if changed then
 update public.requisition_lifecycle set fulfillment_state=current_state where requisition_id=p_id;
 if (total>0 and total=fulfilled and not blocked)=(s.completed_at is not null) then
 update public.operational_documents set version=version+1 where id=p_id;
 perform private.record_document_event(p_id,'req.fulfillment_updated',jsonb_build_object('fulfilled',fulfilled,'total',total,'operationalIssue',blocked),gen_random_uuid());end if;end if;
 if total>0 and total=fulfilled and not blocked then
 if s.completed_at is null then
 update public.requisition_lifecycle set completed_at=now(),manual_archive_required=manual_archive_required or not coalesce(private.science_satisfied(p_id),false) where requisition_id=p_id;
 update public.operational_documents set version=version+1 where id=p_id;
 perform private.record_document_event(p_id,'req.completed',jsonb_build_object('fulfilled',fulfilled,'total',total,'sciencePending',not coalesce(private.science_satisfied(p_id),false)),gen_random_uuid());end if;
 elsif s.completed_at is not null then
 update public.requisition_lifecycle set completed_at=null,manual_archive_required=true,archived_at=null,archived_by=null,archive_reason=null where requisition_id=p_id;
 update public.operational_documents set version=version+1 where id=p_id;
 perform private.record_document_event(p_id,'req.reopened',jsonb_build_object('fulfilled',fulfilled,'total',total,'operationalIssue',blocked,'previousArchivedAt',s.archived_at,'previousArchiveReason',s.archive_reason),gen_random_uuid());
 end if;
end;$function$
