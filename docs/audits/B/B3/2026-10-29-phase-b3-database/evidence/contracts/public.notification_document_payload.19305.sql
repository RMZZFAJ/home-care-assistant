CREATE OR REPLACE FUNCTION public.notification_document_payload(p_id uuid, p_worker_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n public.requisition_notifications;d public.operational_documents;e public.document_events;begin
 if not public.validate_notification_job(p_id,p_worker_id) then raise exception 'invalid notification job' using errcode='42501';end if;
 select * into n from public.requisition_notifications where id=p_id;
 select * into d from public.operational_documents where id=coalesce(n.document_id,n.requisition_id);
 if not found then return null;end if;
 if n.document_event_id is not null then select * into e from public.document_events where id=n.document_event_id;
 else select * into e from public.document_events where document_id=d.id order by version limit 1;end if;
 return jsonb_build_object('documentId',d.id,'patientId',d.care_recipient_id,'code',d.code,'type',d.type,'protocol',d.protocol,'version',e.version,'snapshot',e.body,'hash',e.content_hash,
 'eventKey',coalesce(n.event_key,e.action),'recipientName',n.recipient_label,'isDesignatedRecipient',n.recipient_user_id=d.recipient_id,'includePdf',n.include_pdf,
 'shortPatientName',coalesce((select nullif(settings->>'patientShortName','') from public.patient_settings where care_recipient_id=d.care_recipient_id),e.body->'actors'->'patient'->>'name'));
end;$function$
