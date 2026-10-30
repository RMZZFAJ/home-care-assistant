CREATE OR REPLACE FUNCTION public.complete_notification_job(p_id uuid, p_worker_id uuid, p_state text, p_provider_reference text DEFAULT NULL::text, p_error text DEFAULT NULL::text)
 RETURNS requisition_notifications
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result public.requisition_notifications;begin
 result:=public.v4_complete_notification_job(p_id,p_worker_id,p_state,p_provider_reference,p_error);
 if p_state='pending' and p_error in ('TEMPLATE_NOT_APPROVED','EVENT_TEMPLATE_NOT_CONFIGURED','DOCUMENT_TEMPLATE_NOT_CONFIGURED','CHANNEL_NOT_CONFIGURED','PDF_TEMPLATE_VARIANT_REQUIRED') then
 update public.requisition_notifications set state='pending',next_attempt_at='infinity'::timestamptz where id=p_id returning * into result;
 end if;return result;
end;$function$
