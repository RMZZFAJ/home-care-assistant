create table private.reviewed_residence_rule_attempts (
  actor_id uuid not null,
  key uuid not null,
  patient_id uuid not null,
  mode text not null check (mode in ('patient', 'global')),
  purpose text not null check (purpose in ('alertRule', 'notificationRecipient')),
  intent_hash text,
  outcome jsonb,
  recorded_at timestamptz not null default clock_timestamp(),
  primary key (actor_id, key),
  check ((outcome is null) = (intent_hash is null))
);
alter table private.reviewed_residence_rule_attempts enable row level security;
revoke all on private.reviewed_residence_rule_attempts from public, anon, authenticated, service_role;

create function private.residence_rule_custody_allowed(p_patient uuid, p_mode text, p_location text)
returns boolean language sql stable set search_path = '' as $$
  select case when p_location in ('CARE_TEAM', 'FAMILY') then
    p_mode = 'global' or private.can(p_patient, case p_location
      when 'FAMILY' then 'stock.family.read' else 'stock.team.read' end)
    else false end;
$$;

create function public.reviewed_residence_rule_read(
  p_patient uuid, p_mode text, p_purpose text, p_selection text default null, p_option text default null
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  records jsonb;
  choices jsonb;
  custodies jsonb;
begin
  if p_purpose is null or p_purpose not in ('alertRule', 'notificationRecipient')
    or (p_selection is null) <> (p_option is null) then
    raise exception 'invalid residence rule selection' using errcode = '22023';
  end if;
  perform private.require_administrative_preparation_scope(p_patient, p_mode, p_purpose, null, true);

  if p_selection is not null then
    if p_purpose = 'alertRule' and not private.residence_rule_custody_allowed(p_patient, p_mode, p_option) then
      raise exception 'custody unavailable' using errcode = '42501';
    end if;
    return private.administrative_preparation_reference(p_patient, p_mode, p_purpose, null, p_selection, p_option);
  end if;

  if p_purpose = 'alertRule' then
    select coalesce(jsonb_agg(location order by location), '[]') into custodies
      from unnest(array['CARE_TEAM', 'FAMILY']) location
      where private.residence_rule_custody_allowed(p_patient, p_mode, location);
    select coalesce(jsonb_agg(jsonb_build_object('id', product_id, 'name', name, 'unit', unit,
      'decimals', quantity_decimals, 'active', is_active) order by sort_order, name, product_id), '[]') into choices
      from public.care_recipient_products where care_recipient_id = p_patient and jsonb_array_length(custodies) > 0;
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'productId', product_id, 'location', location,
      'lowThreshold', trim_scale(low_threshold)::text, 'criticalThreshold', trim_scale(critical_threshold)::text,
      'isEnabled', is_enabled) order by location, product_id), '[]') into records
      from public.stock_alert_rules
      where care_recipient_id = p_patient and custodies ? location::text;
    return jsonb_build_object('rules', records, 'choices', choices, 'custodies', custodies);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.full_name, 'role', m.role)
    order by p.full_name, p.id), '[]') into choices
    from public.care_recipient_memberships m join public.profiles p on p.id = m.user_id
    where m.care_recipient_id = p_patient and m.status = 'active' and p.status = 'active';
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'recipientUserId', r.recipient_user_id, 'name', p.full_name,
    'memberActive', p.status = 'active' and coalesce(m.status = 'active', false),
    'recipientGroup', r.recipient_group, 'channel', r.channel, 'destination', coalesce(r.destination, ''),
    'includeTeamAlerts', r.include_team_alerts, 'isEnabled', r.is_enabled,
    'destinationVerified', case r.channel
      when 'internal' then true
      when 'email' then coalesce(u.email_confirmed_at is not null and lower(u.email) = lower(r.destination), false)
      when 'whatsapp' then exists (select 1 from public.verified_phones v where v.user_id = r.recipient_user_id
        and u.phone_confirmed_at is not null and '+' || ltrim(u.phone, '+') = v.phone and v.phone = r.destination)
      else false end
    ) order by p.full_name, r.recipient_user_id, r.channel), '[]') into records
    from public.recipient_notification_settings r
    join public.profiles p on p.id = r.recipient_user_id
    left join public.care_recipient_memberships m on m.care_recipient_id = r.care_recipient_id and m.user_id = r.recipient_user_id
    left join auth.users u on u.id = r.recipient_user_id
    where r.care_recipient_id = p_patient;
  return jsonb_build_object('rules', records, 'choices', choices);
end;
$$;

create function public.reviewed_residence_rule_command(
  p_patient uuid, p_mode text, p_purpose text, p_key uuid, p_fields jsonb, p_reference_hash text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  receipt private.reviewed_residence_rule_attempts;
  intent text;
  result jsonb;
begin
  if p_purpose is null or p_purpose not in ('alertRule', 'notificationRecipient') or p_key is null
    or (p_fields is null and p_reference_hash is not null)
    or (p_fields is not null and coalesce(p_reference_hash, '') !~ '^[a-f0-9]{64}$') then
    raise exception 'invalid residence rule intent' using errcode = '22023';
  end if;
  perform private.require_administrative_preparation_scope(p_patient, p_mode, p_purpose, null, true);
  if p_fields is not null then
    perform private.validate_administrative_preparation_fields(p_purpose, null, p_fields);
    if p_purpose = 'notificationRecipient' and (
      p_fields->>'recipientUserId' = ''
      or (p_fields->>'channel' = 'email' and btrim(p_fields->>'destination') !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')
      or (p_fields->>'channel' = 'whatsapp' and btrim(p_fields->>'destination') !~ '^[+][1-9][0-9]{7,14}$')) then
      raise exception 'invalid notification destination' using errcode = '22023';
    end if;
    intent := encode(extensions.digest(jsonb_build_array(p_fields, p_reference_hash)::text, 'sha256'), 'hex');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('reviewed-residence-rule:' || actor || ':' || p_key, 0));
  perform pg_advisory_xact_lock(hashtextextended('stock:' || p_patient, 0));
  perform private.require_administrative_preparation_scope(p_patient, p_mode, p_purpose, null, true);
  select * into receipt from private.reviewed_residence_rule_attempts where actor_id = actor and key = p_key;
  if found then
    if (receipt.patient_id, receipt.mode, receipt.purpose) is distinct from (p_patient, p_mode, p_purpose) then
      raise exception 'residence rule intent unavailable' using errcode = '42501';
    end if;
    if receipt.intent_hash is not null and intent is not null and receipt.intent_hash <> intent then
      raise exception 'residence rule intent differs' using errcode = 'PT409';
    end if;
    result := receipt.outcome;
  elsif p_fields is not null then
    if p_purpose = 'alertRule' and not private.residence_rule_custody_allowed(p_patient, p_mode, p_fields->>'location') then
      raise exception 'custody unavailable' using errcode = '42501';
    end if;
    result := private.commit_administrative_preparation(p_patient, p_mode, p_purpose, null, p_fields, p_reference_hash, p_key);
    insert into private.reviewed_residence_rule_attempts (actor_id, key, patient_id, mode, purpose, intent_hash, outcome)
      values (actor, p_key, p_patient, p_mode, p_purpose, intent, result);
  else
    insert into private.reviewed_residence_rule_attempts (actor_id, key, patient_id, mode, purpose)
      values (actor, p_key, p_patient, p_mode, p_purpose);
  end if;
  return jsonb_build_object('key', p_key, 'patientId', p_patient, 'mode', p_mode, 'purpose', p_purpose,
    'state', case when result is null then 'closed' else 'recorded' end, 'outcome', result);
end;
$$;

-- Serialize the legacy notification write with reviewed edits and proposal decisions.
alter function public.configure_recipient_notification(uuid, uuid, text, text, text, boolean, boolean) set schema private;
revoke all on function private.configure_recipient_notification(uuid, uuid, text, text, text, boolean, boolean)
  from public, anon, authenticated, service_role;

create function public.configure_recipient_notification(
  p_care_recipient_id uuid, p_recipient_user_id uuid, p_recipient_group text,
  p_channel text, p_destination text, p_enabled boolean, p_include_team_alerts boolean default false
) returns public.recipient_notification_settings language plpgsql security definer set search_path = '' as $$
begin
  if not public.recipient_can(p_care_recipient_id, 'admin') then
    raise exception 'notification admin authorization required' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('stock:' || p_care_recipient_id, 0));
  return private.configure_recipient_notification(p_care_recipient_id, p_recipient_user_id, p_recipient_group,
    p_channel, p_destination, p_enabled, p_include_team_alerts);
end;
$$;

-- Preserve exact retrieval and replay of previous preparations without creating new drafts.
create or replace function public.administrative_preparation_command(
  p_patient uuid, p_mode text, p_purpose text, p_subject uuid, p_action text, p_key uuid,
  p_id uuid, p_revision integer, p_fields jsonb, p_reference_hash text
) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_action = 'save' and p_purpose in ('membership', 'membershipStatus', 'alertRule', 'notificationRecipient') and not exists (
    select 1 from private.administrative_preparation_commands where owner_id = auth.uid() and key = p_key
  ) then
    raise exception 'administrative form must be reviewed before submission' using errcode = 'PT409';
  end if;
  return private.administrative_preparation_command(p_patient, p_mode, p_purpose, p_subject, p_action,
    p_key, p_id, p_revision, p_fields, p_reference_hash);
end;
$$;

revoke all on function private.residence_rule_custody_allowed(uuid, text, text),
  public.reviewed_residence_rule_read(uuid, text, text, text, text),
  public.reviewed_residence_rule_command(uuid, text, text, uuid, jsonb, text),
  public.configure_recipient_notification(uuid, uuid, text, text, text, boolean, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.reviewed_residence_rule_read(uuid, text, text, text, text),
  public.reviewed_residence_rule_command(uuid, text, text, uuid, jsonb, text),
  public.configure_recipient_notification(uuid, uuid, text, text, text, boolean, boolean) to authenticated;

notify pgrst, 'reload schema';
