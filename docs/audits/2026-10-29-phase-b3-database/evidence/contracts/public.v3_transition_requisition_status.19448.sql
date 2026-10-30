CREATE OR REPLACE FUNCTION public.v3_transition_requisition_status(p_requisition_id uuid, p_to_status requisition_status, p_reason text DEFAULT NULL::text)
 RETURNS requisitions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare r public.requisitions;begin
 if p_to_status='delivered' then raise exception 'physical fulfillment is derived from ENT receipts';end if;
 r:=public.legacy_transition_requisition_status(p_requisition_id,p_to_status,p_reason);
 if exists(select 1 from public.operational_documents where id=r.id) then
 update public.operational_documents set status=r.status::text,version=version+1 where id=r.id;
 perform private.record_document_event(r.id,'req.status',jsonb_build_object('status',p_to_status,'reason',p_reason),gen_random_uuid());end if;
 return r;
end;$function$
