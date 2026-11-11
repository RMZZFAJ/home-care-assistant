create table private.catalogue_preparations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  patient_id uuid not null references public.care_recipients(id),
  mode text not null check (mode in ('patient', 'global')),
  purpose text not null check (purpose in ('create', 'edit', 'adopt')),
  target_id text,
  revision integer not null check (revision > 0),
  state text not null check (state in ('active', 'discarded', 'consumed', 'acknowledged')),
  fields jsonb,
  reference_hash text,
  saved_at timestamptz not null default clock_timestamp(),
  outcome jsonb,
  foreign key (patient_id, target_id) references public.care_recipient_products(care_recipient_id, product_id),
  check ((purpose = 'edit') = (target_id is not null)),
  check ((state = 'active') = (fields is not null and reference_hash is not null)),
  check ((state in ('consumed', 'acknowledged')) = (outcome is not null))
);
create unique index catalogue_preparation_slot
  on private.catalogue_preparations(owner_id, patient_id, mode, purpose, target_id)
  nulls not distinct where state in ('active', 'consumed');
create index catalogue_preparation_owner_fk on private.catalogue_preparations(owner_id);
create index catalogue_preparation_target_fk on private.catalogue_preparations(patient_id, target_id);

create table private.catalogue_preparation_commands (
  owner_id uuid not null references public.profiles(id),
  key uuid not null,
  preparation_id uuid not null references private.catalogue_preparations(id),
  intent_hash text not null,
  receipt jsonb not null,
  primary key (owner_id, key)
);
create index catalogue_preparation_command_fk on private.catalogue_preparation_commands(preparation_id);
alter table private.catalogue_preparations enable row level security;
alter table private.catalogue_preparation_commands enable row level security;
revoke all on private.catalogue_preparations, private.catalogue_preparation_commands from public, anon, authenticated, service_role;

create function private.require_catalogue_preparation_scope(
  p_patient uuid, p_mode text, p_purpose text, p_target text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_purpose is null or p_purpose not in ('create', 'edit', 'adopt')
    or (p_purpose = 'edit') <> (p_target is not null)
    or (p_target is not null and length(p_target) not between 1 and 120) then
    raise exception 'invalid catalogue preparation scope' using errcode = '22023';
  end if;
  if private.auth_session() is null or p_mode is null or p_mode not in ('patient', 'global')
    or not exists (select 1 from public.care_recipients where id = p_patient and is_active) then
    raise exception 'catalogue preparation unavailable' using errcode = '42501';
  end if;
  if p_mode = 'global' then
    if not public.is_global_administrator() then
      raise exception 'catalogue preparation unavailable' using errcode = '42501';
    end if;
  else
    perform private.require_cap(p_patient, 'catalog.manage');
  end if;
  if p_target is not null and not exists (
    select 1 from public.care_recipient_products where care_recipient_id = p_patient and product_id = p_target
  ) then
    raise exception 'catalogue preparation unavailable' using errcode = '42501';
  end if;
end;
$$;

create function private.catalogue_preparation_version(p_patient uuid, p_mode text)
returns integer language sql stable set search_path = '' as $$
  select case when p_mode = 'global' then
    coalesce((select version from public.patient_settings where care_recipient_id = p_patient), 1) end;
$$;

create function private.catalogue_preparation_reference(
  p_patient uuid, p_mode text, p_purpose text, p_target text, p_model text default null
) returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_item jsonb;
  v_units jsonb;
  v_models jsonb;
  v_version integer := private.catalogue_preparation_version(p_patient, p_mode);
begin
  if p_purpose = 'adopt' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', model.id, 'name', model.name, 'unit', model.unit, 'category', model.category, 'aliases', model.aliases,
      'hash', encode(extensions.digest(jsonb_build_array(p_patient, p_mode, v_version, to_jsonb(model),
        (select jsonb_agg(to_jsonb(unit) order by unit.id) from public.measurement_units unit
          where unit.code = model.unit and (unit.care_recipient_id is null or unit.care_recipient_id = p_patient))
      )::text, 'sha256'), 'hex')
    ) order by model.name, model.id), '[]'::jsonb)
    into v_models
    from public.products model
    where model.owner_care_recipient_id is null and model.is_active and (p_model is null or model.id = p_model)
      and not exists (select 1 from public.care_recipient_products item
        where item.care_recipient_id = p_patient and item.product_id = model.id);
    return jsonb_build_object('models', v_models);
  end if;

  select to_jsonb(item) into v_item from public.care_recipient_products item
    where item.care_recipient_id = p_patient and item.product_id = p_target;
  select coalesce(jsonb_agg(to_jsonb(unit) order by unit.id), '[]'::jsonb) into v_units
    from public.measurement_units unit where unit.care_recipient_id is null or unit.care_recipient_id = p_patient;
  return jsonb_build_object('item', v_item, 'hash', encode(extensions.digest(
    jsonb_build_array(p_patient, p_mode, p_purpose, v_version, v_item, v_units)::text, 'sha256'), 'hex'));
end;
$$;

create function public.catalogue_preparation_read(
  p_patient uuid, p_mode text, p_purpose text, p_target text, p_key uuid default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_draft jsonb;
  v_receipt jsonb;
begin
  perform private.require_catalogue_preparation_scope(p_patient, p_mode, p_purpose, p_target);
  if p_key is not null then
    select c.receipt into v_receipt
    from private.catalogue_preparation_commands c
    join private.catalogue_preparations d on d.id = c.preparation_id
    where c.owner_id = auth.uid() and c.key = p_key and d.owner_id = auth.uid()
      and d.patient_id = p_patient and d.mode = p_mode and d.purpose = p_purpose
      and d.target_id is not distinct from p_target;
    return jsonb_build_object('receipt', v_receipt);
  end if;

  select jsonb_build_object('id', id, 'revision', revision, 'state', state, 'fields', fields,
    'referenceHash', reference_hash, 'savedAt', saved_at, 'outcome', outcome)
  into v_draft from private.catalogue_preparations
  where owner_id = auth.uid() and patient_id = p_patient and mode = p_mode and purpose = p_purpose
    and target_id is not distinct from p_target and state in ('active', 'consumed');
  return jsonb_build_object('draft', v_draft, 'reference',
    private.catalogue_preparation_reference(p_patient, p_mode, p_purpose, p_target));
end;
$$;

-- Partial input uses the same flat shape as the editor. Final validation also
-- runs here because authenticated callers can invoke the RPC directly.
create function private.catalogue_preparation_arguments(
  p_patient uuid, p_purpose text, p_target text, p_fields jsonb, p_final boolean
) returns jsonb language plpgsql set search_path = '' as $$
declare
  v_aliases text[];
  v_order text;
begin
  if jsonb_typeof(p_fields) is distinct from 'object' or octet_length(p_fields::text) > 36000 then
    raise exception 'invalid catalogue preparation fields' using errcode = '22023';
  end if;
  if p_purpose = 'adopt' then
    if p_fields - 'modelId' <> '{}'::jsonb or jsonb_typeof(p_fields->'modelId') is distinct from 'string'
      or length(p_fields->>'modelId') > 120 or (p_final and p_fields->>'modelId' = '') then
      raise exception 'invalid catalogue model' using errcode = '22023';
    end if;
    return jsonb_build_object('action', 'adoptProduct', 'careRecipientId', p_patient, 'productId', p_fields->>'modelId');
  end if;

  if p_fields - array['name', 'category', 'unit', 'aliases', 'description', 'sortOrder', 'isActive'] <> '{}'::jsonb
    or jsonb_typeof(p_fields->'isActive') is distinct from 'boolean'
    or exists (select 1 from (values ('name', 160), ('category', 20), ('unit', 30), ('aliases', 4900),
      ('description', 2000), ('sortOrder', 24)) as field(key, limit_length)
      where jsonb_typeof(p_fields->field.key) is distinct from 'string' or length(p_fields->>field.key) > field.limit_length)
    or p_fields->>'category' not in ('medicamentos', 'higiene', 'dieta') then
    raise exception 'invalid catalogue preparation fields' using errcode = '22023';
  end if;
  if not p_final then return null; end if;

  select coalesce(array_agg(btrim(value) order by position), array[]::text[]) into v_aliases
    from unnest(string_to_array(p_fields->>'aliases', ',')) with ordinality as alias(value, position)
    where btrim(value) <> '';
  v_order := p_fields->>'sortOrder';
  if length(btrim(p_fields->>'name')) < 2 or btrim(p_fields->>'unit') = ''
    or cardinality(v_aliases) > 30 or exists (select 1 from unnest(v_aliases) alias where length(alias) > 160)
    or v_order !~ '^[0-9]{1,7}$' or (v_order ~ '^[0-9]{1,7}$' and v_order::integer > 1000000) then
    raise exception 'invalid catalogue preparation fields' using errcode = '22023';
  end if;
  return jsonb_build_object('action', 'product', 'careRecipientId', p_patient, 'id', p_target,
    'name', btrim(p_fields->>'name'), 'unit', btrim(p_fields->>'unit'), 'category', p_fields->>'category',
    'aliases', v_aliases, 'description', btrim(p_fields->>'description'), 'sortOrder', v_order::integer,
    'isActive', p_fields->'isActive');
end;
$$;

create function public.catalogue_preparation_command(
  p_patient uuid, p_mode text, p_purpose text, p_target text, p_action text, p_key uuid,
  p_id uuid, p_revision integer, p_fields jsonb, p_reference_hash text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_draft private.catalogue_preparations;
  v_command private.catalogue_preparation_commands;
  v_intent text;
  v_reference jsonb;
  v_hash text;
  v_args jsonb;
  v_product_id text;
  v_proposal jsonb;
  v_outcome jsonb;
  v_state text;
  v_receipt jsonb;
begin
  perform private.require_catalogue_preparation_scope(p_patient, p_mode, p_purpose, p_target);
  if p_key is null or p_action is null or p_action not in ('save', 'commit', 'discard', 'acknowledge')
    or p_revision is null or p_revision not between 0 and 2147483646 or (p_id is null) <> (p_revision = 0)
    or (p_action in ('save', 'commit') and (p_fields is null or p_reference_hash is null or p_reference_hash !~ '^[a-f0-9]{64}$'))
    or (p_action in ('discard', 'acknowledge') and (p_id is null or p_fields is not null or p_reference_hash is not null))
    or octet_length(p_fields::text) > 36000 then
    raise exception 'invalid catalogue preparation command' using errcode = '22023';
  end if;

  v_intent := encode(extensions.digest(jsonb_build_array(
    p_patient, p_mode, p_purpose, p_target, p_action, p_id, p_revision, p_fields, p_reference_hash
  )::text, 'sha256'), 'hex');
  perform pg_advisory_xact_lock(hashtextextended('catalogue-preparation-key:' || auth.uid() || ':' || p_key, 0));
  perform pg_advisory_xact_lock(hashtextextended(jsonb_build_array(
    'catalogue-preparation-slot', auth.uid(), p_patient, p_mode, p_purpose, p_target
  )::text, 0));
  perform private.require_catalogue_preparation_scope(p_patient, p_mode, p_purpose, p_target);
  select * into v_command from private.catalogue_preparation_commands where owner_id = auth.uid() and key = p_key;
  if found then
    if v_command.intent_hash <> v_intent then
      raise exception 'catalogue preparation intent differs' using errcode = '23505';
    end if;
    return v_command.receipt;
  end if;

  select * into v_draft from private.catalogue_preparations
    where owner_id = auth.uid() and patient_id = p_patient and mode = p_mode and purpose = p_purpose
      and target_id is not distinct from p_target and state in ('active', 'consumed') for update;
  if v_draft.id is distinct from p_id or coalesce(v_draft.revision, 0) <> p_revision
    or (v_draft.state = 'consumed' and p_action <> 'acknowledge')
    or (p_action = 'acknowledge' and v_draft.state is distinct from 'consumed') then
    raise exception 'stale catalogue preparation revision' using errcode = '40001';
  end if;

  if p_action in ('save', 'commit') then
    v_args := private.catalogue_preparation_arguments(p_patient, p_purpose, p_target, p_fields, p_action = 'commit');
  end if;
  if p_action = 'commit' then
    perform pg_advisory_xact_lock(hashtextextended('stock:' || p_patient, 0));
    perform pg_advisory_xact_lock(hashtextextended('catalogue:' || p_patient, 0));
    perform private.require_catalogue_preparation_scope(p_patient, p_mode, p_purpose, p_target);
    if p_purpose = 'adopt' then
      -- Prevent a model edit from slipping between reference check and copy.
      perform 1 from public.products where id = v_args->>'productId' and owner_care_recipient_id is null for share;
    end if;
    v_reference := private.catalogue_preparation_reference(p_patient, p_mode, p_purpose, p_target, v_args->>'productId');
    if p_purpose = 'adopt' then
      select model->>'hash' into v_hash from jsonb_array_elements(v_reference->'models') model
        where model->>'id' = v_args->>'productId';
    else
      v_hash := v_reference->>'hash';
    end if;
    if v_hash is distinct from p_reference_hash then
      raise exception 'stale catalogue preparation reference' using errcode = '40001';
    end if;
    if p_mode = 'global' then
      v_proposal := public.configure_patient_access(p_patient, 'administration',
        jsonb_build_object('operation', v_args->>'action', 'args', v_args), p_key,
        private.catalogue_preparation_version(p_patient, p_mode));
      if v_proposal->>'status' is distinct from 'pending' or v_proposal->>'id' is null then
        raise exception 'catalogue proposal unavailable' using errcode = '42501';
      end if;
      v_outcome := jsonb_build_object('proposalId', v_proposal->'id');
    elsif p_purpose = 'adopt' then
      v_product_id := (public.admin_adopt_product(p_patient, v_args->>'productId')).product_id;
      v_outcome := jsonb_build_object('productId', v_product_id);
    else
      v_product_id := (public.admin_upsert_recipient_product(p_patient, p_target, v_args->>'name',
        (v_args->>'category')::public.product_category, v_args->>'unit',
        array(select jsonb_array_elements_text(v_args->'aliases')), (v_args->>'isActive')::boolean,
        v_args->>'description', (v_args->>'sortOrder')::integer)).product_id;
      v_outcome := jsonb_build_object('productId', v_product_id);
    end if;
  end if;
  perform private.require_catalogue_preparation_scope(p_patient, p_mode, p_purpose, p_target);

  v_state := case p_action when 'save' then 'active' when 'commit' then 'consumed'
    when 'discard' then 'discarded' else 'acknowledged' end;
  if p_id is null then
    insert into private.catalogue_preparations(owner_id, patient_id, mode, purpose, target_id, revision, state,
      fields, reference_hash, outcome)
    values (auth.uid(), p_patient, p_mode, p_purpose, p_target, 1, v_state,
      case when p_action = 'save' then p_fields end,
      case when p_action = 'save' then p_reference_hash end, v_outcome)
    returning * into v_draft;
  else
    update private.catalogue_preparations set revision = revision + 1, state = v_state,
      fields = case when p_action = 'save' then p_fields end,
      reference_hash = case when p_action = 'save' then p_reference_hash end,
      outcome = case when p_action = 'acknowledge' then outcome else v_outcome end,
      saved_at = clock_timestamp()
    where id = p_id returning * into v_draft;
  end if;
  v_receipt := jsonb_build_object('ownerId', auth.uid(), 'patientId', p_patient, 'mode', p_mode,
    'purpose', p_purpose, 'targetId', p_target, 'key', p_key, 'action', p_action,
    'id', v_draft.id, 'revision', v_draft.revision, 'state', v_state, 'outcome', v_draft.outcome);
  insert into private.catalogue_preparation_commands(owner_id, key, preparation_id, intent_hash, receipt)
    values (auth.uid(), p_key, v_draft.id, v_intent, v_receipt);
  return v_receipt;
end;
$$;

revoke all on function private.require_catalogue_preparation_scope(uuid,text,text,text),
  private.catalogue_preparation_version(uuid,text), private.catalogue_preparation_reference(uuid,text,text,text,text),
  private.catalogue_preparation_arguments(uuid,text,text,jsonb,boolean),
  public.catalogue_preparation_read(uuid,text,text,text,uuid),
  public.catalogue_preparation_command(uuid,text,text,text,text,uuid,uuid,integer,jsonb,text)
  from public, anon, authenticated, service_role;
grant execute on function public.catalogue_preparation_read(uuid,text,text,text,uuid),
  public.catalogue_preparation_command(uuid,text,text,text,text,uuid,uuid,integer,jsonb,text)
  to authenticated;
