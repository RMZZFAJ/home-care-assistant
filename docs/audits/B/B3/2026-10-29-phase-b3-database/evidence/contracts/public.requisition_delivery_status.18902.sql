CREATE OR REPLACE FUNCTION public.requisition_delivery_status(p_requisition_ids uuid[])
 RETURNS TABLE(requisition_id uuid, id uuid, recipient_group text, recipient_label text, channel text, state text, attempts integer, attempted_at timestamp with time zone, delivered_at timestamp with time zone, read_at timestamp with time zone, error_code text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if auth.uid() is null or coalesce(cardinality(p_requisition_ids),0) not between 1 and 100 then raise exception 'invalid status request' using errcode='42501';end if;
 return query select coalesce(n.requisition_id,n.document_id),n.id,n.recipient_group,n.recipient_label,n.channel,n.state,n.attempts,n.attempted_at,n.delivered_at,n.read_at,
 case when n.last_error is null then null when n.last_error in ('INVALID_DESTINATION','PROVIDER_RATE_LIMIT','PROVIDER_RESULT_UNCERTAIN','PROVIDER_REJECTED','CHANNEL_NOT_CONFIGURED','META_COUNTRY_RESTRICTED_130497','DOCUMENT_TEMPLATE_NOT_CONFIGURED','MEDIA_UPLOAD_FAILED','DOCUMENT_PREPARATION_FAILED') then n.last_error else 'PROCESSING_FAILED' end
 from public.requisition_notifications n join public.requisitions r on r.id=coalesce(n.requisition_id,n.document_id) where r.id=any(p_requisition_ids) and private.can(r.care_recipient_id,'req.read') order by n.created_at,n.id;
end;$function$
