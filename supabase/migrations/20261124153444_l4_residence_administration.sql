create table private.closed_residence_identification_attempts (
  care_recipient_id uuid not null references public.care_recipients(id) on delete cascade,
  actor_id uuid not null,
  intent_key uuid not null,
  closed_at timestamptz not null default now(),
  primary key (care_recipient_id, actor_id, intent_key)
);
revoke all on private.closed_residence_identification_attempts from public, anon, authenticated, service_role;

create function public.residence_administration_snapshot(p_patient uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  residence public.care_recipients;
begin
  if not public.can_manage_recipient(p_patient) and not public.is_global_administrator() then
    raise exception 'residence administration required' using errcode = '42501';
  end if;
  select * into residence from public.care_recipients where id = p_patient;
  if not found then raise exception 'residence unavailable' using errcode = '42501'; end if;
  return jsonb_build_object(
    'patientId', residence.id,
    'identity', jsonb_build_object('displayName', residence.display_name, 'active', residence.is_active, 'development', residence.is_development),
    'version', coalesce((select version from public.patient_settings where care_recipient_id = p_patient), 1),
    'activeMembers', (select count(*) from public.care_recipient_memberships m join public.profiles p on p.id = m.user_id
      where m.care_recipient_id = p_patient and m.status = 'active' and p.status = 'active'),
    'pendingInvitations', (select count(*) from public.care_recipient_invitations i
      where i.care_recipient_id = p_patient and i.status = 'pending' and i.expires_at > now()),
    'pendingProposals', (select count(*) from public.access_change_requests c where c.care_recipient_id = p_patient and c.status = 'pending')
  );
end;
$$;

create function public.residence_identification_command(
  p_patient uuid, p_key uuid, p_action text, p_version integer default null,
  p_before jsonb default null, p_identity jsonb default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  is_global boolean;
  residence public.care_recipients;
  receipt public.access_change_requests;
  change jsonb;
  result jsonb;
begin
  if p_key is null or p_action is null or p_action not in ('save', 'recover') then
    raise exception 'invalid identification intent' using errcode = '22023';
  end if;
  if not public.can_manage_recipient(p_patient) and not public.is_global_administrator() then
    raise exception 'residence administration required' using errcode = '42501';
  end if;
  -- Serialize with the existing governance command and its decisions.
  perform pg_advisory_xact_lock(hashtextextended('stock:' || p_patient, 0));
  is_global := public.is_global_administrator();
  if not public.can_manage_recipient(p_patient) and not is_global then
    raise exception 'residence administration required' using errcode = '42501';
  end if;
  select * into residence from public.care_recipients where id = p_patient for update;
  if not found then raise exception 'residence unavailable' using errcode = '42501'; end if;
  select * into receipt from public.access_change_requests
    where care_recipient_id = p_patient and idempotency_key = p_key;
  if found and (receipt.proposed_by is distinct from auth.uid() or receipt.kind <> 'administration'
    or receipt.proposed->>'operation' is distinct from 'recipient') then
    raise exception 'identification intent unavailable' using errcode = '42501';
  end if;
  if p_action = 'recover' then
    if receipt.id is not null then
      return jsonb_build_object('state', receipt.status, 'id', receipt.id);
    end if;
    insert into private.closed_residence_identification_attempts (care_recipient_id, actor_id, intent_key)
      values (p_patient, auth.uid(), p_key) on conflict do nothing;
    return jsonb_build_object('state', 'closed');
  end if;
  if exists (select 1 from private.closed_residence_identification_attempts
    where care_recipient_id = p_patient and actor_id = auth.uid() and intent_key = p_key) then
    return jsonb_build_object('state', 'closed');
  end if;
  if p_version is null or p_version < 1 or jsonb_typeof(p_before) is distinct from 'object'
    or jsonb_typeof(p_identity) is distinct from 'object'
    or jsonb_typeof(p_identity->'displayName') is distinct from 'string'
    or length(btrim(p_identity->>'displayName')) not between 2 and 160
    or jsonb_typeof(p_identity->'active') is distinct from 'boolean'
    or jsonb_typeof(p_identity->'development') is distinct from 'boolean' then
    raise exception 'invalid residence identification' using errcode = '22023';
  end if;
  if receipt.id is null and p_before is distinct from jsonb_build_object(
    'displayName', residence.display_name, 'active', residence.is_active, 'development', residence.is_development) then
    raise exception 'stale residence identification' using errcode = 'PT409';
  end if;
  if not is_global and p_before->'development' is distinct from p_identity->'development' then
    raise exception 'global administration required for development flag' using errcode = '42501';
  end if;
  change := jsonb_build_object('operation', 'recipient', 'args', jsonb_build_object(
    'action', 'recipient', 'id', p_patient, 'displayName', btrim(p_identity->>'displayName'),
    'isActive', p_identity->'active', 'isDevelopment', p_identity->'development'));
  result := public.configure_patient_access(p_patient, 'administration', change, p_key, p_version);
  return jsonb_build_object('state', result->'status', 'id', result->'id');
end;
$$;

revoke all on function public.residence_administration_snapshot(uuid),
  public.residence_identification_command(uuid, uuid, text, integer, jsonb, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.residence_administration_snapshot(uuid),
  public.residence_identification_command(uuid, uuid, text, integer, jsonb, jsonb) to authenticated;
