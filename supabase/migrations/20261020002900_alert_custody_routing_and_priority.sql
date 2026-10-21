-- Alert routing follows custody and configured groups. Ordinary requisition
-- notifications keep their established recipients. Team alerts reach family
-- only through an explicit administrative opt-in.
alter table public.recipient_notification_settings
  add column include_team_alerts boolean not null default false;

drop function public.configure_recipient_notification(uuid,uuid,text,text,text,boolean);
create function public.configure_recipient_notification(
  p_care_recipient_id uuid,p_recipient_user_id uuid,p_recipient_group text,
  p_channel text,p_destination text,p_enabled boolean,p_include_team_alerts boolean default false
) returns public.recipient_notification_settings
language plpgsql security definer set search_path=public as $$
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
end; $$;
revoke all on function public.configure_recipient_notification(uuid,uuid,text,text,text,boolean,boolean)
  from public,anon,authenticated;
grant execute on function public.configure_recipient_notification(uuid,uuid,text,text,text,boolean,boolean)
  to authenticated;

create or replace function public.enqueue_patient_event(p_patient uuid,p_requisition uuid,p_alert uuid) returns void
language sql security definer set search_path=public as $$
  insert into public.requisition_notifications(
    requisition_id,care_recipient_id,alert_event_id,recipient_user_id,recipient_group,
    recipient_label,channel,destination
  )
  select p_requisition,p_patient,p_alert,p.id,s.recipient_group,p.full_name,s.channel,s.destination
  from public.recipient_notification_settings s
  join public.profiles p on p.id=s.recipient_user_id and p.status='active'
  left join public.care_recipient_memberships m on m.user_id=p.id
    and m.care_recipient_id=p_patient and m.status='active'
  left join public.stock_alert_events e on e.id=p_alert and e.care_recipient_id=p_patient
  where s.care_recipient_id=p_patient and s.is_enabled
    and (p.role='admin' and p.global_scope or m.id is not null)
    and (p_alert is null or e.state='open' and (
      p.role='admin' and p.global_scope or m.role='admin'
      or e.location='FAMILY' and s.recipient_group='family'
      or e.location='CARE_TEAM' and (s.recipient_group in ('care_team','supervision')
        or s.recipient_group='family' and s.include_team_alerts)))
  on conflict do nothing;
$$;
revoke all on function public.enqueue_patient_event(uuid,uuid,uuid) from public,anon,authenticated;

create or replace function public.claim_notification_jobs(
  p_limit integer,p_worker_id uuid,p_external_enabled boolean default false
) returns setof public.requisition_notifications
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_global_administrator() and coalesce(auth.role(),'')<>'service_role'
  then raise exception 'worker authorization required' using errcode='42501';end if;
  if p_worker_id is null then raise exception 'worker identity required';end if;
  update public.requisition_notifications set
    state=case when channel='internal' then 'pending' else 'uncertain' end,
    leased_by=null,lease_expires_at=null,last_error='processing lease expired'
    where state='processing' and lease_expires_at<now();
  update public.requisition_notifications n set state='cancelled',last_error='recipient access revoked'
    where n.state='pending' and not exists(select 1 from public.profiles p
      where p.id=n.recipient_user_id and p.status='active' and
        (p.role='admin' and p.global_scope or exists(select 1 from public.care_recipient_memberships m
          where m.care_recipient_id=n.care_recipient_id and m.user_id=p.id and m.status='active')));
  -- An alert resolved before its send is no longer actionable. Preserve the
  -- outbox row as cancelled instead of sending an obsolete warning.
  update public.requisition_notifications n set state='cancelled',last_error='stock alert resolved before send'
    where n.state='pending' and n.alert_event_id is not null and exists(
      select 1 from public.stock_alert_events e where e.id=n.alert_event_id and e.state='resolved');
  return query update public.requisition_notifications n set state='processing',
    attempts=n.attempts+1,attempted_at=now(),leased_by=p_worker_id,
    lease_expires_at=now()+interval '2 minutes'
    where n.id in (
      select candidate.id from public.requisition_notifications candidate
      left join public.stock_alert_events e on e.id=candidate.alert_event_id
      where candidate.state='pending'
        and (candidate.channel='internal' or candidate.channel='whatsapp' and coalesce(p_external_enabled,false))
        and candidate.next_attempt_at<=now() and candidate.attempts<5
      order by case when e.severity='critical' then 0 else 1 end,
        candidate.next_attempt_at,candidate.id
      for update of candidate skip locked
      limit greatest(1,least(coalesce(p_limit,50),100))
    ) returning n.*;
end; $$;
