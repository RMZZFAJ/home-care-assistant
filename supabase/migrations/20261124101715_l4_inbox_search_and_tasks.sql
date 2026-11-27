-- Present a task only when the actor can still perform the act behind the notice.
create function private.inbox_notice_task(p_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  n public.requisition_notifications;
  d public.operational_documents;
  event text;
  review jsonb;
begin
  select * into n from public.requisition_notifications
   where id = p_id and recipient_user_id = auth.uid();
  if not found or not private.inbox_notice_visible(n) then return null; end if;
  event := coalesce(n.event_key, (select e.action from public.document_events e
    where e.id = n.document_event_id and e.document_id = n.document_id));

  if event in ('req.issued', 'req.registered_author', 'req.reminder')
    and private.requisition_science_task(coalesce(n.document_id, n.requisition_id), auth.uid()) then
    return 'req.science';
  end if;
  if n.document_id is null or event is null then return null; end if;
  select * into d from public.operational_documents
   where id = n.document_id and care_recipient_id = n.care_recipient_id;
  if not found or d.workflow_data->'documentArchive'->>'archivedAt' is not null
    and d.workflow_data->'documentArchive'->>'decision' is distinct from 'reverse' then return null; end if;

  if d.type = 'ENT' and event in ('ent.issued', 'ent.submit', 'ent.reminder')
    and d.status = 'pending_receipt' and d.recipient_id = auth.uid()
    and d.workflow_data->>'acceptedAt' is null and private.can(d.care_recipient_id, 'ent.receive') then
    return 'ent.receive';
  elsif d.type = 'COM' and event in ('com.issued', 'com.submit') and d.status = 'pending_approval'
    and private.can(d.care_recipient_id, 'com.approve') then
    return 'com.approve';
  elsif d.type = 'BAL' and event in ('bal.issued', 'bal.submit', 'bal.recount') and d.status = 'submitted' then
    review := private.bal_review_context(d.id);
    if review->>'reviewRequired' = 'true' and jsonb_array_length(review->'eligibleGroups') > 0 then
      return 'bal.review';
    end if;
  end if;
  return null;
end;
$$;

revoke all on function private.inbox_notice_task(uuid) from public, anon, authenticated, service_role;
grant execute on function private.inbox_notice_task(uuid) to authenticated;

drop function public.read_personal_inbox(uuid, integer, integer, text, boolean, uuid);

create function public.read_personal_inbox(
  p_patient uuid, p_offset integer, p_size integer, p_surface text, p_unread boolean, p_id uuid default null,
  p_kind text default null, p_search text default '', p_tasks boolean default false,
  p_event_keys text[] default '{}'
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  result jsonb;
  term text := lower(public.unaccent(btrim(p_search)));
begin
  if p_patient is null or p_offset is null or p_offset not between 0 and 10000000
    or p_size is null or p_size not between 1 and 100 or p_surface is null
    or p_surface not in ('bell', 'center') or p_unread is null or p_tasks is null
    or p_kind is not null and p_kind not in ('REQ', 'ENT', 'COM', 'BAL')
    or p_search is null or length(p_search) > 120 or p_event_keys is null or cardinality(p_event_keys) > 200 then
    raise exception 'invalid inbox query' using errcode = '22023';
  end if;

  with visible as materialized (
    select n.id, n.care_recipient_id, n.document_id, n.requisition_id, n.alert_event_id,
      n.consumption_report_id, n.reminder_id, n.silent, n.event_key, n.channel, n.state,
      n.created_at, n.seen_at, d.type as kind,
      coalesce(d.code, r.code, r.protocol) as reference_code,
      case when d.id is not null then jsonb_build_object('type', d.type, 'code', d.code, 'status', d.status) end as document,
      e.action, e.actor_name, private.inbox_notice_task(n.id) as task
    from public.requisition_notifications n
    left join public.operational_documents d on d.id = n.document_id and d.care_recipient_id = n.care_recipient_id
    left join public.document_events e on e.id = n.document_event_id and e.document_id = d.id
    left join public.requisitions r on r.id = n.requisition_id and r.care_recipient_id = n.care_recipient_id
    where n.care_recipient_id = p_patient and n.recipient_user_id = (select auth.uid())
      and (p_id is null or n.id = p_id)
  ), filtered as (
    select * from visible n
    where (p_surface <> 'bell' or not n.silent) and (not p_unread or n.seen_at is null)
      and (not p_tasks or n.task is not null)
      and (p_kind is null or coalesce(n.kind, case when n.requisition_id is not null then 'REQ' end) = p_kind)
      and (term = '' or coalesce(n.event_key, n.action) = any(p_event_keys)
        or strpos(lower(public.unaccent(concat_ws(' ', n.reference_code, n.actor_name, coalesce(n.event_key, n.action)))), term) > 0)
  ), paged as (
    select * from filtered order by created_at desc, id limit p_size offset p_offset
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'unreadCount', (select count(*) from visible where not silent and seen_at is null),
    'actionCount', (select count(*) from visible where task is not null),
    'data', coalesce((
      select jsonb_agg((to_jsonb(n) - array['kind', 'action', 'actor_name', 'document']) || jsonb_build_object(
        'operational_documents', n.document,
        'document_events', case when n.action is not null then jsonb_build_object('action', n.action, 'actorName', n.actor_name) end
      ) order by n.created_at desc, n.id) from paged n
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

revoke all on function public.read_personal_inbox(uuid, integer, integer, text, boolean, uuid, text, text, boolean, text[])
  from public, anon, authenticated, service_role;
grant execute on function public.read_personal_inbox(uuid, integer, integer, text, boolean, uuid, text, text, boolean, text[])
  to authenticated;
