create table private.governance_proposal_attempts (
  actor_id uuid not null,
  attempt_key uuid not null,
  patient_id uuid not null,
  proposal_id uuid not null,
  session_id uuid not null,
  decision text check (decision in ('approve', 'reject')),
  review_reference text,
  confirmed_status text check (confirmed_status in ('applied', 'rejected', 'awaiting_acceptance')),
  invitation_id uuid,
  own_transition boolean not null default false,
  recorded_at timestamptz not null default clock_timestamp(),
  primary key (actor_id, attempt_key),
  check ((decision is null) = (review_reference is null)),
  check ((decision is null) = (confirmed_status is null)),
  check ((confirmed_status is not distinct from 'awaiting_acceptance') = (invitation_id is not null))
);
alter table private.governance_proposal_attempts enable row level security;
revoke all on private.governance_proposal_attempts from public, anon, authenticated, service_role;

create function private.governance_proposal_reference(
  p_row public.access_change_requests, p_version integer, p_current jsonb
) returns text language sql immutable set search_path = '' as $$
  select encode(extensions.digest(jsonb_build_array(
    p_row.id, p_row.care_recipient_id, p_row.status, p_row.proposed_by, p_row.kind,
    p_row.base_version, p_row.proposed, p_version, p_current
  )::text, 'sha256'), 'hex');
$$;
revoke all on function private.governance_proposal_reference(public.access_change_requests, integer, jsonb)
  from public, anon, authenticated, service_role;

create or replace function public.patient_governance_changes(
  p_patient uuid, p_status text default 'open', p_kind text default null,
  p_query text default '', p_page integer default 1, p_size integer default 20
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb; current_version integer;
begin
  if not public.can_manage_recipient(p_patient) and not public.is_global_administrator() then
    raise exception 'administrator authorization required' using errcode = '42501';
  end if;
  if not exists(select 1 from public.care_recipients where id = p_patient) then
    raise exception 'patient unavailable' using errcode = '42501';
  end if;
  if p_page is null or p_page not between 1 and 1000000 or p_size is null or p_size not between 1 and 50
    or p_status is null or p_status not in ('open','all','pending','awaiting_acceptance','applied','rejected')
    or p_kind is not null and p_kind not in ('capability','settings','membership','notification_rule','administration')
    or p_query is null or length(p_query)>160 then
    raise exception 'invalid governance query' using errcode = '22023';
  end if;
  current_version := coalesce((select version from public.patient_settings where care_recipient_id = p_patient), 1);
  with matching as materialized (
    select c.* from public.access_change_requests c where c.care_recipient_id = p_patient
      and (p_status = 'all' or p_status = 'open' and c.status in ('pending','awaiting_acceptance') or c.status = p_status)
      and (p_kind is null or c.kind = p_kind)
      and (btrim(p_query) = '' or strpos(lower(c.id::text || ' ' || c.kind || ' ' || c.proposed::text), lower(btrim(p_query))) > 0)
  ), page_rows as (
    select id from matching order by created_at desc, id desc limit p_size offset ((p_page::bigint-1)*p_size)
  ), projected as materialized (
    select c.id, c.created_at, c as request, private.access_change_current(p_patient,c.kind,c.proposed) as current_value,
      coalesce(p.full_name, 'Identidade histórica') as proposer_name,
      case when c.approved_by is not null then coalesce(a.full_name, 'Identidade histórica') end as reviewer_name,
      (select s.full_name from public.profiles s where s.id::text =
        coalesce(c.proposed->>'userId',c.proposed->>'subjectUser',c.proposed->'args'->>'userId',c.proposed->'args'->>'recipientUserId')) as subject_name
    from page_rows page join public.access_change_requests c on c.id = page.id
    left join public.profiles p on p.id = c.proposed_by
    left join public.profiles a on a.id = c.approved_by
  )
  select jsonb_build_object('total', (select count(*) from matching), 'page', p_page, 'pageSize', p_size,
    'changes', coalesce(jsonb_agg(
      (to_jsonb(r.request) - 'idempotency_key') || jsonb_build_object(
        'resolution', (r.request).resolution - 'invitationHash', 'current', r.current_value,
        'proposerName', r.proposer_name, 'reviewerName', r.reviewer_name, 'subjectName', r.subject_name,
        'currentVersion', current_version,
        'reviewReference', case when (r.request).status = 'pending'
          then private.governance_proposal_reference(r.request, current_version, r.current_value) end
      ) order by r.created_at desc, r.id desc), '[]'::jsonb))
    into result from projected r;
  return result;
end;
$$;

create function public.review_governance_proposal(
  p_patient uuid, p_proposal uuid, p_key uuid,
  p_decision text, p_reference text, p_invitation_hash text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  current_session uuid := private.auth_session();
  attempt private.governance_proposal_attempts;
  proposal public.access_change_requests;
  current_version integer;
  current_value jsonb;
  result jsonb;
  issued_link boolean := false;
begin
  if actor is null or current_session is null or not public.my_session_valid() then
    raise exception 'active session required' using errcode = '42501';
  end if;
  if p_patient is null or p_proposal is null or p_key is null
    or (p_decision is null and (p_reference is not null or p_invitation_hash is not null))
    or (p_decision is not null and (p_decision not in ('approve','reject') or coalesce(p_reference,'') !~ '^[0-9a-f]{64}$'))
    or (p_decision is distinct from 'approve' and p_invitation_hash is not null)
    or (p_invitation_hash is not null and p_invitation_hash !~ '^[0-9a-f]{64}$') then
    raise exception 'invalid proposal attempt' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('governance-proposal:' || actor || ':' || p_key, 0));
  perform pg_advisory_xact_lock(hashtextextended('stock:' || p_patient, 0));
  if not public.my_session_valid() then raise exception 'active session required' using errcode = '42501'; end if;
  select * into attempt from private.governance_proposal_attempts
    where actor_id = actor and attempt_key = p_key;
  if found then
    if (attempt.patient_id, attempt.proposal_id) is distinct from (p_patient, p_proposal) then
      raise exception 'proposal attempt unavailable' using errcode = '42501';
    end if;
    if not public.can_manage_recipient(p_patient) and not (
      p_decision is null and attempt.own_transition and attempt.session_id = current_session and private.admin_assurance()
      and exists (select 1 from private.authority_sessions s where s.session_id = current_session
        and s.user_id = actor and s.mode = 'patient' and s.care_recipient_id = p_patient)
    ) then raise exception 'local administrator required' using errcode = '42501'; end if;
    if p_decision is not null and attempt.decision is null then
      raise exception 'proposal attempt closed' using errcode = 'PT410';
    end if;
    if p_decision is not null and (attempt.decision, attempt.review_reference) is distinct from (p_decision, p_reference) then
      raise exception 'proposal attempt differs' using errcode = 'PT409';
    end if;
  else
    if not public.can_manage_recipient(p_patient) then
      raise exception 'local administrator required' using errcode = '42501';
    end if;
    select * into proposal from public.access_change_requests
      where id = p_proposal and care_recipient_id = p_patient for update;
    if not found or proposal.proposed_by = actor then
      raise exception 'distinct patient administrator required' using errcode = '42501';
    end if;
    if p_decision is not null then
      current_version := coalesce((select version from public.patient_settings where care_recipient_id = p_patient), 1);
      current_value := private.access_change_current(p_patient, proposal.kind, proposal.proposed);
      if proposal.status <> 'pending' or p_reference <> private.governance_proposal_reference(proposal, current_version, current_value)
        or (p_decision = 'approve' and proposal.base_version <> current_version) then
        raise exception 'reviewed proposal reference changed' using errcode = 'PT409';
      end if;
      result := public.configure_patient_access(p_patient, proposal.kind,
        proposal.proposed || case when p_invitation_hash is null then '{}'::jsonb
          else jsonb_build_object('invitationTokenHash', p_invitation_hash) end,
        p_key, current_version, p_proposal, p_decision);
      issued_link := (result->>'status' = 'awaiting_acceptance' and p_invitation_hash is not null
        and result->'resolution'->>'invitationHash' = p_invitation_hash) is true;
    end if;
    insert into private.governance_proposal_attempts (
      actor_id, attempt_key, patient_id, proposal_id, session_id, decision, review_reference, confirmed_status, invitation_id, own_transition
    ) values (
      actor, p_key, p_patient, p_proposal, current_session, p_decision, p_reference, result->>'status',
      (result->'resolution'->>'invitationId')::uuid,
      result is not null and not public.can_manage_recipient(p_patient)
    ) returning * into attempt;
  end if;
  return jsonb_build_object('careRecipientId', p_patient, 'proposalId', p_proposal, 'attemptKey', p_key,
    'state', case when attempt.confirmed_status is null then 'closed' else 'recorded' end,
    'status', attempt.confirmed_status, 'invitationId', attempt.invitation_id, 'issuedLink', issued_link);
end;
$$;
revoke all on function public.review_governance_proposal(uuid, uuid, uuid, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.review_governance_proposal(uuid, uuid, uuid, text, text, text) to authenticated;
