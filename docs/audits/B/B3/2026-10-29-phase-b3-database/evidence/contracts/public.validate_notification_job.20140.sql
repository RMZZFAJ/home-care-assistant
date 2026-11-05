CREATE OR REPLACE FUNCTION public.validate_notification_job(p_id uuid, p_worker_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n public.requisition_notifications;r public.notification_event_rules;begin
 if not public.v4_validate_notification_job(p_id,p_worker_id) then return false;end if;
 select * into strict n from public.requisition_notifications where id=p_id for update;
 if n.channel='whatsapp' and n.event_key is not null then
 select * into r from public.notification_event_rules where care_recipient_id=n.care_recipient_id and subject_role=(select role::text from public.care_recipient_memberships where care_recipient_id=n.care_recipient_id and user_id=n.recipient_user_id) and event=case n.event_key when 'com.submit' then 'com.issued' when 'ent.submit' then 'ent.issued' else n.event_key end;
 if not private.whatsapp_event_supported(n.event_key) or r.event is not null and (not('whatsapp'=any(r.channels)) or r.mode='silent') then
 update public.requisition_notifications set state='cancelled',last_error='EVENT_DISABLED',leased_by=null,lease_expires_at=null where id=n.id;return false;end if;
 end if;return true;
end;$function$
