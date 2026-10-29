CREATE OR REPLACE FUNCTION public.archive_requisition(p_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare patient uuid;begin
 select care_recipient_id into strict patient from public.requisition_lifecycle where requisition_id=p_id;
 perform private.require_cap(patient,'req.archive');
 perform pg_advisory_xact_lock(hashtextextended('stock:'||patient,0));
 perform private.require_cap(patient,'req.archive');
 return public.v4_review_archive_requisition(p_id,p_reason);
end;$function$
