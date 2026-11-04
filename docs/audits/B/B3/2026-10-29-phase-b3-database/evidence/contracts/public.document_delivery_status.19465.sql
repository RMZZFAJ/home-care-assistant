CREATE OR REPLACE FUNCTION public.document_delivery_status(p_document uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d public.operational_documents;begin
 select * into d from public.operational_documents where id=p_document;
 if not found or not private.can(d.care_recipient_id,lower(d.type)||'.read') then raise exception 'document permission required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'requisition_id',requisition_id,'recipient_group',recipient_group,'recipient_label',recipient_label,'channel',channel,'state',state,'attempts',attempts,'attempted_at',attempted_at,'error_code',case when last_error is null then null when last_error in ('PDF_TEMPLATE_VARIANT_REQUIRED','TEMPLATE_NOT_APPROVED','EVENT_TEMPLATE_NOT_CONFIGURED','EVENT_APP_ONLY','EVENT_DISABLED','INVALID_DESTINATION','PROVIDER_RATE_LIMIT','PROVIDER_RESULT_UNCERTAIN','PROVIDER_REJECTED','CHANNEL_NOT_CONFIGURED','META_COUNTRY_RESTRICTED_130497','DOCUMENT_TEMPLATE_NOT_CONFIGURED','MEDIA_UPLOAD_FAILED','DOCUMENT_PREPARATION_FAILED') then last_error else 'PROCESSING_FAILED' end,'seen_at',seen_at)) from public.requisition_notifications where coalesce(document_id,requisition_id)=p_document),'[]');
end;$function$
