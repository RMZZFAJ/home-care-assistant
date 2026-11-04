CREATE OR REPLACE FUNCTION public.v4_review_archive_requisition(p_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.requisition_lifecycle;begin
 select * into strict s from public.requisition_lifecycle where requisition_id=p_id;
 perform private.require_cap(s.care_recipient_id,'req.archive');
 perform pg_advisory_xact_lock(hashtextextended('stock:'||s.care_recipient_id,0));
 select * into strict s from public.requisition_lifecycle where requisition_id=p_id for update;
 if length(trim(coalesce(p_reason,''))) not between 3 and 1000 then raise exception 'archive reason required';end if;
 perform private.refresh_requisition_lifecycle(p_id);
 select * into s from public.requisition_lifecycle where requisition_id=p_id;
 if s.archived_at is not null then return public.requisition_progress(p_id);end if;
 if s.completed_at is null then raise exception 'operational completion required';end if;
 update public.requisition_lifecycle set archived_at=now(),archived_by=auth.uid(),archive_reason=trim(p_reason) where requisition_id=p_id;
 update public.operational_documents set version=version+1 where id=p_id;
 perform private.record_document_event(p_id,'req.archived.manual',jsonb_build_object('reason',trim(p_reason),'scienceSatisfied',private.science_satisfied(p_id)),gen_random_uuid());
 return public.requisition_progress(p_id);
end;$function$
