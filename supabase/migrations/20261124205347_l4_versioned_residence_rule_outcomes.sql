alter table private.reviewed_residence_rule_attempts drop constraint reviewed_residence_rule_attempts_purpose_check;
alter table private.reviewed_residence_rule_attempts add constraint reviewed_residence_rule_attempts_purpose_check
  check (purpose in ('alertRule', 'notificationRecipient', 'settings', 'notification_rule'));

create function private.require_reviewed_residence_rule_scope(p_patient uuid, p_mode text, p_purpose text)
returns void language plpgsql set search_path = '' as $$
begin
  if p_purpose in ('alertRule', 'notificationRecipient') then
    perform private.require_administrative_preparation_scope(p_patient, p_mode, p_purpose, null, true);
    return;
  end if;
  if p_patient is null or p_mode is null or p_mode not in ('patient', 'global') then
    raise exception 'invalid residence rule scope' using errcode = '22023';
  end if;
  if private.auth_session() is null
    or not exists (select 1 from public.care_recipients where id = p_patient and is_active)
    or not coalesce(case p_mode
      when 'global' then public.is_global_administrator()
      when 'patient' then public.can_manage_recipient(p_patient)
        and (p_purpose <> 'notification_rule' or private.can(p_patient, 'notifications.manage'))
    end, false) then
    raise exception 'residence rule intent unavailable' using errcode = '42501';
  end if;
end;
$$;
revoke all on function private.require_reviewed_residence_rule_scope(uuid, text, text)
  from public, anon, authenticated, service_role;

create or replace function public.reviewed_residence_rule_command(
  p_patient uuid, p_mode text, p_purpose text, p_key uuid, p_fields jsonb, p_reference_hash text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  receipt private.reviewed_residence_rule_attempts;
  intent text;
  result jsonb;
  official jsonb;
  expected_version integer;
  versioned boolean := p_purpose in ('settings', 'notification_rule');
begin
  if p_purpose is null or p_purpose not in ('alertRule', 'notificationRecipient', 'settings', 'notification_rule') or p_key is null
    or ((p_fields is null or versioned) and p_reference_hash is not null)
    or (p_fields is not null and not versioned and coalesce(p_reference_hash, '') !~ '^[a-f0-9]{64}$') then
    raise exception 'invalid residence rule intent' using errcode = '22023';
  end if;
  perform private.require_reviewed_residence_rule_scope(p_patient, p_mode, p_purpose);

  if p_fields is not null then
    if versioned then
      if jsonb_typeof(p_fields) is distinct from 'object'
        or jsonb_typeof(p_fields->'change') is distinct from 'object'
        or jsonb_typeof(p_fields->'expectedVersion') is distinct from 'number'
        or (p_fields->>'expectedVersion') !~ '^[1-9][0-9]{0,9}$'
        or (p_fields - 'change' - 'expectedVersion') <> '{}'::jsonb
        or octet_length(p_fields::text) > 65536 then
        raise exception 'invalid residence rule change' using errcode = '22023';
      end if;
      if (p_fields->>'expectedVersion')::bigint > 2147483647 then
        raise exception 'invalid residence rule version' using errcode = '22023';
      end if;
      expected_version := (p_fields->>'expectedVersion')::integer;
    else
      perform private.validate_administrative_preparation_fields(p_purpose, null, p_fields);
      if p_purpose = 'notificationRecipient' and (
        p_fields->>'recipientUserId' = ''
        or (p_fields->>'channel' = 'email' and btrim(p_fields->>'destination') !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')
        or (p_fields->>'channel' = 'whatsapp' and btrim(p_fields->>'destination') !~ '^[+][1-9][0-9]{7,14}$')) then
        raise exception 'invalid notification destination' using errcode = '22023';
      end if;
    end if;
    intent := encode(extensions.digest(jsonb_build_array(p_fields, p_reference_hash)::text, 'sha256'), 'hex');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('reviewed-residence-rule:' || actor || ':' || p_key, 0));
  perform pg_advisory_xact_lock(hashtextextended('stock:' || p_patient, 0));
  perform private.require_reviewed_residence_rule_scope(p_patient, p_mode, p_purpose);
  select * into receipt from private.reviewed_residence_rule_attempts where actor_id = actor and key = p_key;
  if found then
    if (receipt.patient_id, receipt.mode, receipt.purpose) is distinct from (p_patient, p_mode, p_purpose) then
      raise exception 'residence rule intent unavailable' using errcode = '42501';
    end if;
    if receipt.intent_hash is not null and intent is not null and receipt.intent_hash <> intent then
      raise exception 'residence rule intent differs' using errcode = 'PT409';
    end if;
    result := receipt.outcome;
  else
    if p_fields is not null then
      if versioned then
        official := public.configure_patient_access(p_patient, p_purpose, p_fields->'change', p_key, expected_version);
        perform private.require_reviewed_residence_rule_scope(p_patient, p_mode, p_purpose);
        if official->>'id' is null or official->>'status' is distinct from (case p_mode when 'global' then 'pending' else 'applied' end) then
          raise exception 'residence rule outcome unavailable' using errcode = 'PT409';
        end if;
        result := case p_mode
          when 'global' then jsonb_build_object('kind', 'proposal', 'proposalId', official->'id')
          else jsonb_build_object('kind', 'policy', 'action', p_purpose, 'recordId', official->'id')
        end;
      else
        if p_purpose = 'alertRule' and not private.residence_rule_custody_allowed(p_patient, p_mode, p_fields->>'location') then
          raise exception 'custody unavailable' using errcode = '42501';
        end if;
        result := private.commit_administrative_preparation(p_patient, p_mode, p_purpose, null, p_fields, p_reference_hash, p_key);
      end if;
    end if;
    insert into private.reviewed_residence_rule_attempts (actor_id, key, patient_id, mode, purpose, intent_hash, outcome)
      values (actor, p_key, p_patient, p_mode, p_purpose, intent, result);
  end if;
  return jsonb_build_object('key', p_key, 'patientId', p_patient, 'mode', p_mode, 'purpose', p_purpose,
    'state', case when result is null then 'closed' else 'recorded' end, 'outcome', result);
end;
$$;

revoke all on function public.reviewed_residence_rule_command(uuid, text, text, uuid, jsonb, text)
  from public, anon, authenticated, service_role;
grant execute on function public.reviewed_residence_rule_command(uuid, text, text, uuid, jsonb, text) to authenticated;

notify pgrst, 'reload schema';
