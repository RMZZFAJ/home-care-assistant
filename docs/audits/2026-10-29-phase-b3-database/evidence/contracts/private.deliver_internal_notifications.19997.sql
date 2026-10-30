CREATE OR REPLACE FUNCTION private.deliver_internal_notifications()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n public.requisition_notifications;allowed boolean;begin
 for n in select * from public.requisition_notifications where channel='internal' and state='pending' and next_attempt_at<=now() order by created_at for update skip locked limit 100 loop
 allowed:=case
 when n.document_id is not null then private.member_can(n.care_recipient_id,n.recipient_user_id,(select lower(type)||'.read' from public.operational_documents where id=n.document_id))
 when n.requisition_id is not null then private.member_can(n.care_recipient_id,n.recipient_user_id,'req.read')
 when n.alert_event_id is not null then exists(select 1 from public.stock_alert_events e where e.id=n.alert_event_id and e.state='open' and private.member_can(n.care_recipient_id,n.recipient_user_id,case when e.location='FAMILY' then 'stock.family.read' else 'stock.team.read' end))
 when n.consumption_report_id is not null then exists(select 1 from public.consumption_reports r where r.id=n.consumption_report_id and (r.reported_by=n.recipient_user_id or private.member_can(n.care_recipient_id,n.recipient_user_id,'consumption.confirm')) and private.member_can(n.care_recipient_id,n.recipient_user_id,'consumption.report'))
 when n.reminder_id is not null then exists(select 1 from public.operational_reminders r where r.id=n.reminder_id and r.user_id=n.recipient_user_id and r.acknowledged_at is null and private.reminder_recipient_can(r.id,n.recipient_user_id)) else false end;
 update public.requisition_notifications set state=case when coalesce(allowed,false) then 'delivered' else 'cancelled' end,delivered_at=case when allowed then now() end,attempted_at=now(),attempts=attempts+1,provider_reference=case when allowed then 'internal' end where id=n.id;
 end loop;
end;$function$
