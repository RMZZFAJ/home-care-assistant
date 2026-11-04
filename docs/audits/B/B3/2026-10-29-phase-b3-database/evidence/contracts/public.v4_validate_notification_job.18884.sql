CREATE OR REPLACE FUNCTION public.v4_validate_notification_job(p_id uuid, p_worker_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n public.requisition_notifications;d public.operational_documents;e public.stock_alert_events;r public.consumption_reports;rem public.operational_reminders;allowed boolean:=false;begin
 if not public.is_global_administrator() and coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'worker authorization required' using errcode='42501';end if;
 select * into n from public.requisition_notifications where id=p_id and leased_by=p_worker_id and state='processing' and lease_expires_at>now() for update;if not found then return false;end if;
 if n.document_id is not null then select * into d from public.operational_documents where id=n.document_id;allowed:=private.member_can(n.care_recipient_id,n.recipient_user_id,lower(d.type)||'.read');
 elsif n.requisition_id is not null then allowed:=private.member_can(n.care_recipient_id,n.recipient_user_id,'req.read');
 elsif n.alert_event_id is not null then select * into e from public.stock_alert_events where id=n.alert_event_id;allowed:=e.state='open' and private.member_can(n.care_recipient_id,n.recipient_user_id,case when e.location='FAMILY' then 'stock.family.read' else 'stock.team.read' end);
 elsif n.consumption_report_id is not null then select * into r from public.consumption_reports where id=n.consumption_report_id;allowed:=private.member_can(n.care_recipient_id,n.recipient_user_id,'consumption.report') and (r.reported_by=n.recipient_user_id or private.member_can(n.care_recipient_id,n.recipient_user_id,'consumption.confirm'));
 elsif n.reminder_id is not null then select * into rem from public.operational_reminders where id=n.reminder_id;allowed:=rem.user_id=n.recipient_user_id and rem.acknowledged_at is null and private.reminder_recipient_can(rem.id,n.recipient_user_id);end if;
 if n.channel='whatsapp' then allowed:=allowed and coalesce((select (notification_preferences->>'whatsapp')::boolean from public.profiles where id=n.recipient_user_id),false)
 and exists(select 1 from public.verified_phones v join auth.users u on u.id=v.user_id where v.user_id=n.recipient_user_id and u.phone_confirmed_at is not null and '+'||ltrim(u.phone,'+')=v.phone and ltrim(v.phone,'+')=ltrim(n.destination,'+'));end if;
 if coalesce(allowed,false) then return true;end if;
 update public.requisition_notifications set state='cancelled',last_error='RECIPIENT_REVOKED_OR_CONTACT_UNVERIFIED',leased_by=null,lease_expires_at=null where id=n.id;return false;
end;$function$
