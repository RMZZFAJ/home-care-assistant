CREATE OR REPLACE FUNCTION public.configure_recipient_notification(p_care_recipient_id uuid, p_recipient_user_id uuid, p_recipient_group text, p_channel text, p_destination text, p_enabled boolean, p_include_team_alerts boolean DEFAULT false)
 RETURNS recipient_notification_settings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.recipient_notification_settings;
begin
  if not public.recipient_can(p_care_recipient_id,'admin') then raise exception 'notification admin authorization required' using errcode='42501';end if;
  if not exists(select 1 from public.profiles p where p.id=p_recipient_user_id and p.status='active' and
    (p.role='admin' and p.global_scope or exists(select 1 from public.care_recipient_memberships m
      where m.user_id=p.id and m.care_recipient_id=p_care_recipient_id and m.status='active')))
  then raise exception 'recipient is not an active patient member';end if;
  if p_recipient_group is null or p_recipient_group not in ('family','supervision','care_team','other')
    or p_channel is null or p_channel not in ('internal','email','whatsapp') or p_enabled is null
    or p_include_team_alerts is null
    or p_channel<>'internal' and (p_destination is null or length(trim(p_destination)) not between 3 and 254)
    or p_channel='email' and p_destination!~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    or p_channel='whatsapp' and p_destination!~'^[+][1-9][0-9]{7,14}$'
  then raise exception 'invalid notification destination';end if;
  insert into public.recipient_notification_settings(
    care_recipient_id,recipient_user_id,recipient_group,channel,destination,is_enabled,include_team_alerts
  ) values(p_care_recipient_id,p_recipient_user_id,p_recipient_group,p_channel,
    case when p_channel='internal' then null else trim(p_destination) end,p_enabled,
    p_recipient_group='family' and p_include_team_alerts)
  on conflict(care_recipient_id,recipient_user_id,channel) do update set
    recipient_group=excluded.recipient_group,destination=excluded.destination,
    is_enabled=excluded.is_enabled,include_team_alerts=excluded.include_team_alerts returning * into v;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'notification.settings.updated','notification_setting',v.id,
    jsonb_build_object('care_recipient_id',p_care_recipient_id,'channel',p_channel,
      'enabled',p_enabled,'include_team_alerts',v.include_team_alerts));
  return v;
end; $function$
