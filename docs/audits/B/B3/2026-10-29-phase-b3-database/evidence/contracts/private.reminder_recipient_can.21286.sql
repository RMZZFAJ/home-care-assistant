CREATE OR REPLACE FUNCTION private.reminder_recipient_can(p_reminder uuid, p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select coalesce((select r.user_id=p_user and r.acknowledged_at is null and case r.kind
 when 'schedule' then private.member_can(r.care_recipient_id,p_user,'schedule.read.own') or private.member_can(r.care_recipient_id,p_user,'schedule.read.team')
 when 'bal_cycle' then private.member_can(r.care_recipient_id,p_user,'bal.read')
 when 'bal' then private.member_can(r.care_recipient_id,p_user,'bal.count') else private.member_can(r.care_recipient_id,p_user,'consumption.report') end
 from public.operational_reminders r where r.id=p_reminder),false);
$function$
