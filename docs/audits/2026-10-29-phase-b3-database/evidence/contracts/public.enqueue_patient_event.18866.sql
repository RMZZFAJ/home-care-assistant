CREATE OR REPLACE FUNCTION public.enqueue_patient_event(p_patient uuid, p_requisition uuid, p_alert uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare e public.stock_alert_events;m record;begin
 if p_alert is null then return;end if;
 select * into e from public.stock_alert_events where id=p_alert and care_recipient_id=p_patient and state='open';if not found then return;end if;
 for m in select user_id,role from public.care_recipient_memberships where care_recipient_id=p_patient and status='active' and role<>'reader' loop
 if not private.member_can(p_patient,m.user_id,case when e.location='FAMILY' then 'stock.family.read' else 'stock.team.read' end) then continue;end if;
 if e.location='CARE_TEAM' and m.role='family' and not exists(select 1 from public.recipient_notification_settings where care_recipient_id=p_patient and recipient_user_id=m.user_id and recipient_group='family' and include_team_alerts and is_enabled) then continue;end if;
 perform private.enqueue_notice(p_patient,m.user_id,'stock.alert',null,null,e.id);end loop;
end;$function$
