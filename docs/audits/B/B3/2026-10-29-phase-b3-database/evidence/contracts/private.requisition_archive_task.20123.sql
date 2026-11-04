CREATE OR REPLACE FUNCTION private.requisition_archive_task(p_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.requisition_lifecycle s join public.operational_documents d on d.id=s.requisition_id join public.requisitions r on r.id=d.id where d.id=p_id and not r.is_historical and d.status not in ('draft','cancelled') and s.archived_at is null and s.completed_at is not null and private.can(d.care_recipient_id,'req.archive'));
$function$
