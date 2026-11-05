CREATE OR REPLACE FUNCTION public.retry_notification_job(p_id uuid, p_confirm_uncertain boolean DEFAULT false)
 RETURNS requisition_notifications
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.requisition_notifications;v_previous text;
begin
  select * into v from public.requisition_notifications where id=p_id for update;
  if not found or not public.can_manage_recipient(v.care_recipient_id) then raise exception 'notification retry not authorized' using errcode='42501';end if;
  if v.state not in ('failed','uncertain') then raise exception 'notification is not retryable';end if;
  if v.state='uncertain' and not coalesce(p_confirm_uncertain,false) then raise exception 'uncertain notification requires explicit reconciliation confirmation';end if;
  v_previous:=v.state;
  update public.requisition_notifications set state='pending',attempts=0,next_attempt_at=now(),leased_by=null,lease_expires_at=null,last_error=null where id=v.id returning * into v;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'notification.retry.requested','notification',v.id,jsonb_build_object('care_recipient_id',v.care_recipient_id,'previous_state',v_previous,'confirmed_uncertain',coalesce(p_confirm_uncertain,false)));
  return v;
end; $function$
