-- Inbox history uses the live read entitlement of the actual destination.
-- Transport eligibility is separate: seen or resolved history may be readable.
create function private.inbox_notice_visible(n public.requisition_notifications)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  reminder public.operational_reminders;
  can_read_team boolean;
begin
  if auth.uid() is null or not public.can_access_recipient(n.care_recipient_id)
    or (n.recipient_user_id is distinct from auth.uid() and not public.can_manage_recipient(n.care_recipient_id)) then
    return false;
  end if;

  if n.document_id is not null then
    return exists (
      select 1 from public.operational_documents d
      where d.id = n.document_id and d.care_recipient_id = n.care_recipient_id
        and private.can(d.care_recipient_id, lower(d.type) || '.read')
    );
  elsif n.requisition_id is not null then
    return private.can(n.care_recipient_id, 'req.read') and exists (
      select 1 from public.requisitions r
      where r.id = n.requisition_id and r.care_recipient_id = n.care_recipient_id
    );
  end if;

  -- The non-document referral RPCs require the patient to be active.
  if not exists (select 1 from public.care_recipients p where p.id = n.care_recipient_id and p.is_active) then
    return false;
  end if;
  if n.alert_event_id is not null then
    return exists (
      select 1 from public.stock_alert_events a
      where a.id = n.alert_event_id and a.care_recipient_id = n.care_recipient_id
        and private.can(a.care_recipient_id, case a.location
          when 'FAMILY' then 'stock.family.read' else 'stock.team.read' end)
    );
  elsif n.consumption_report_id is not null then
    return exists (
      select 1 from public.consumption_reports r
      where r.id = n.consumption_report_id and r.care_recipient_id = n.care_recipient_id
        and private.can(r.care_recipient_id, case r.location
          when 'FAMILY' then 'stock.family.read' else 'stock.team.read' end)
    );
  end if;

  select m.* into reminder from public.operational_reminders m
   where m.id = n.reminder_id and m.care_recipient_id = n.care_recipient_id
     and (m.user_id = auth.uid() or public.can_manage_recipient(m.care_recipient_id));
  if not found then return false; end if;

  if reminder.kind = 'schedule' and n.event_key like 'schedule.%' then
    can_read_team := private.can(n.care_recipient_id, 'schedule.read.team');
    return exists (
      select 1 from public.shift_events e
      where e.id = reminder.shift_event_id and e.care_recipient_id = n.care_recipient_id
        and (can_read_team or e.professional_id = auth.uid()
          and private.can(e.care_recipient_id, 'schedule.read.own'))
    );
  elsif reminder.kind = 'bal_cycle' and n.event_key like 'bal.cycle.%' then
    return private.can(n.care_recipient_id, 'bal.read') and exists (
      select 1 from public.bal_cycle_events e
      where e.id = reminder.bal_event_id and e.care_recipient_id = n.care_recipient_id
    );
  elsif reminder.kind = 'bal' and n.event_key = 'bal.reminder' then
    return private.can(n.care_recipient_id, 'bal.read');
  elsif reminder.kind = 'shift' and coalesce(n.event_key, '') not like 'schedule.%'
    and coalesce(n.event_key, '') not like 'bal.cycle.%'
    and n.event_key is distinct from 'bal.reminder' then
    return private.can(n.care_recipient_id, 'stock.team.read');
  end if;
  return false;
end;
$$;

revoke all on function private.inbox_notice_visible(public.requisition_notifications)
  from public, anon, authenticated, service_role;
grant execute on function private.inbox_notice_visible(public.requisition_notifications) to authenticated;

alter policy authorized_notification_read on public.requisition_notifications
  using (private.inbox_notice_visible(requisition_notifications));

create or replace function public.mark_notification_seen(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.requisition_notifications n set seen_at = coalesce(n.seen_at, now())
   where n.id = p_id and n.recipient_user_id = auth.uid() and private.inbox_notice_visible(n);
  if not found then raise exception 'notification not found' using errcode = '42501'; end if;
end;
$$;

-- Page, total and bell count use the same RLS-filtered rows and snapshot.
create function public.read_personal_inbox(
  p_patient uuid, p_offset integer, p_size integer, p_surface text, p_unread boolean, p_id uuid default null
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  result jsonb;
begin
  if p_patient is null or p_offset is null or p_offset not between 0 and 10000000
    or p_size is null or p_size not between 1 and 100 or p_surface is null
    or p_surface not in ('bell', 'center') or p_unread is null then
    raise exception 'invalid inbox query' using errcode = '22023';
  end if;

  with visible as materialized (
    select n.id, n.care_recipient_id, n.document_id, n.requisition_id, n.alert_event_id,
      n.consumption_report_id, n.reminder_id, n.silent, n.event_key, n.channel, n.state,
      n.created_at, n.seen_at, n.document_event_id
    from public.requisition_notifications n
    where n.care_recipient_id = p_patient and n.recipient_user_id = (select auth.uid())
      and (p_id is null or n.id = p_id)
  ), filtered as (
    select * from visible where (p_surface <> 'bell' or not silent) and (not p_unread or seen_at is null)
  ), paged as (
    select * from filtered order by created_at desc, id limit p_size offset p_offset
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'unreadCount', (select count(*) from visible where not silent and seen_at is null),
    'data', coalesce((
      select jsonb_agg((to_jsonb(n) - 'document_event_id') || jsonb_build_object(
        'operational_documents', case when d.id is not null then
          jsonb_build_object('type', d.type, 'code', d.code, 'status', d.status) end,
        'document_events', case when e.id is not null then
          jsonb_build_object('action', e.action, 'actorName', e.actor_name) end
      ) order by n.created_at desc, n.id)
      from paged n
      left join public.operational_documents d on d.id = n.document_id and d.care_recipient_id = n.care_recipient_id
      left join public.document_events e on e.id = n.document_event_id and e.document_id = d.id
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

revoke all on function public.read_personal_inbox(uuid, integer, integer, text, boolean, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.read_personal_inbox(uuid, integer, integer, text, boolean, uuid) to authenticated;
