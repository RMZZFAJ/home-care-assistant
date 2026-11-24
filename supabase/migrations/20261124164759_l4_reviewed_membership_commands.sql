create table private.reviewed_membership_attempts (
  actor_id uuid not null,
  key uuid not null,
  patient_id uuid not null,
  mode text not null,
  purpose text not null,
  target_id uuid,
  session_id uuid not null,
  self_transition boolean not null default false,
  intent_hash text,
  outcome jsonb,
  recorded_at timestamptz not null default clock_timestamp(),
  primary key (actor_id, key),
  check ((outcome is null) = (intent_hash is null))
);
alter table private.reviewed_membership_attempts enable row level security;
revoke all on private.reviewed_membership_attempts from public, anon, authenticated, service_role;

create function public.reviewed_membership_reference(
  p_patient uuid, p_mode text, p_purpose text, p_target uuid, p_selection uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_purpose is null or p_purpose not in ('membership', 'membershipStatus') then
    raise exception 'invalid membership scope' using errcode = '22023';
  end if;
  perform private.require_administrative_preparation_scope(p_patient, p_mode, p_purpose, p_target, true);
  return private.administrative_preparation_reference(p_patient, p_mode, p_purpose, p_target, p_selection::text, null);
end;
$$;

create function public.reviewed_membership_command(
  p_patient uuid, p_mode text, p_purpose text, p_target uuid, p_key uuid, p_fields jsonb, p_reference_hash text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  current_session uuid := private.auth_session();
  receipt private.reviewed_membership_attempts;
  intent text;
  result jsonb;
  own_transition boolean := false;
begin
  if actor is null or current_session is null then
    raise exception 'membership administration unavailable' using errcode = '42501';
  end if;
  if p_patient is null or p_mode is null or p_mode not in ('patient', 'global')
    or p_purpose is null or p_purpose not in ('membership', 'membershipStatus')
    or (p_purpose = 'membershipStatus' and p_target is null) or p_key is null
    or (p_fields is null and p_reference_hash is not null)
    or (p_fields is not null and coalesce(p_reference_hash, '') !~ '^[a-f0-9]{64}$') then
    raise exception 'invalid membership intent' using errcode = '22023';
  end if;
  if p_fields is not null then
    perform private.validate_administrative_preparation_fields(p_purpose, p_target, p_fields);
    if p_purpose = 'membership' and nullif(p_fields->>'userId', '') is null then
      raise exception 'missing membership account' using errcode = '22023';
    end if;
    intent := encode(extensions.digest(jsonb_build_array(p_fields, p_reference_hash)::text, 'sha256'), 'hex');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('reviewed-membership:' || actor || ':' || p_key, 0));
  select * into receipt from private.reviewed_membership_attempts where actor_id = actor and key = p_key;
  if found then
    if (receipt.patient_id, receipt.mode, receipt.purpose) is distinct from (p_patient, p_mode, p_purpose)
      or receipt.target_id is distinct from p_target then
      raise exception 'membership intent unavailable' using errcode = '42501';
    end if;
    if not (receipt.self_transition and receipt.session_id = current_session) then
      perform private.require_administrative_preparation_scope(p_patient, p_mode, p_purpose, p_target, true);
    end if;
    if receipt.intent_hash is not null and intent is not null and receipt.intent_hash <> intent then
      raise exception 'membership intent differs' using errcode = 'PT409';
    end if;
    result := receipt.outcome;
  else
    perform private.require_administrative_preparation_scope(p_patient, p_mode, p_purpose, p_target, true);
    if p_fields is not null then
      perform pg_advisory_xact_lock(hashtextextended('stock:' || p_patient, 0));
      perform private.require_administrative_preparation_scope(p_patient, p_mode, p_purpose, p_target, true);
      result := private.commit_administrative_preparation(p_patient, p_mode, p_purpose, p_target, p_fields, p_reference_hash, p_key);
      -- A successful self-transition can remove the permission needed by a retry.
      own_transition := p_mode = 'patient' and result->>'kind' = 'local' and result->>'userId' = actor::text
        and not public.can_manage_recipient(p_patient)
        and private.admin_assurance() and exists (
          select 1 from private.authority_sessions where session_id = current_session and user_id = actor
            and mode = 'patient' and care_recipient_id = p_patient
        );
    end if;
    insert into private.reviewed_membership_attempts
      (actor_id, key, patient_id, mode, purpose, target_id, session_id, self_transition, intent_hash, outcome)
    values (actor, p_key, p_patient, p_mode, p_purpose, p_target, current_session, own_transition, intent, result);
  end if;
  return jsonb_build_object('key', p_key, 'patientId', p_patient, 'mode', p_mode, 'purpose', p_purpose,
    'targetId', p_target, 'state', case when result is null then 'closed' else 'recorded' end, 'outcome', result);
end;
$$;

-- Stop new membership drafts while preserving existing submitted receipts and their exact replays.
alter function public.administrative_preparation_command(uuid, text, text, uuid, text, uuid, uuid, integer, jsonb, text) set schema private;
revoke all on function private.administrative_preparation_command(uuid, text, text, uuid, text, uuid, uuid, integer, jsonb, text)
  from public, anon, authenticated, service_role;

create function public.administrative_preparation_command(
  p_patient uuid, p_mode text, p_purpose text, p_subject uuid, p_action text, p_key uuid,
  p_id uuid, p_revision integer, p_fields jsonb, p_reference_hash text
) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_purpose in ('membership', 'membershipStatus') and p_action = 'save' and not exists (
    select 1 from private.administrative_preparation_commands where owner_id = auth.uid() and key = p_key
  ) then
    raise exception 'membership form must be reviewed before submission' using errcode = 'PT409';
  end if;
  return private.administrative_preparation_command(p_patient, p_mode, p_purpose, p_subject, p_action,
    p_key, p_id, p_revision, p_fields, p_reference_hash);
end;
$$;

revoke all on function public.reviewed_membership_reference(uuid, text, text, uuid, uuid),
  public.reviewed_membership_command(uuid, text, text, uuid, uuid, jsonb, text),
  public.administrative_preparation_command(uuid, text, text, uuid, text, uuid, uuid, integer, jsonb, text)
  from public, anon, authenticated, service_role;
grant execute on function public.reviewed_membership_reference(uuid, text, text, uuid, uuid),
  public.reviewed_membership_command(uuid, text, text, uuid, uuid, jsonb, text),
  public.administrative_preparation_command(uuid, text, text, uuid, text, uuid, uuid, integer, jsonb, text) to authenticated;

notify pgrst, 'reload schema';
