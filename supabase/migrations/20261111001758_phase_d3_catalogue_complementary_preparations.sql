-- Use the existing owner/revision/receipt store for the remaining catalogue
-- editors. Global unit creation has no patient. Presentation edits and
-- product identity edits have distinct foreign-key anchors.
alter table private.catalogue_preparations
  alter column patient_id drop not null,
  drop constraint catalogue_preparations_purpose_check,
  drop constraint catalogue_preparations_check,
  drop constraint catalogue_preparations_patient_id_target_id_fkey,
  add column product_target_id text generated always as (
    case when purpose in ('edit','identity') then target_id end
  ) stored,
  add column presentation_target_id uuid generated always as (
    case when purpose = 'presentation_edit' then target_id::uuid end
  ) stored,
  add foreign key (patient_id, product_target_id) references public.care_recipient_products(care_recipient_id, product_id),
  add foreign key (presentation_target_id) references public.product_presentations(id),
  add constraint catalogue_preparation_purpose check (
    purpose in ('create','edit','adopt','unit_create','unit_configure','presentation_create','presentation_edit','identity')
    and (purpose in ('edit','presentation_edit','identity')) = (target_id is not null)
    and (patient_id is null) = (purpose = 'unit_create' and mode = 'global')
    and (mode = 'patient' or purpose in ('create','edit','adopt','unit_create'))
  );
drop index private.catalogue_preparation_target_fk;
create index catalogue_preparation_target_fk on private.catalogue_preparations(patient_id, product_target_id);
create index catalogue_preparation_presentation_fk on private.catalogue_preparations(presentation_target_id)
  where presentation_target_id is not null;

create function private.require_catalogue_preparation_access(
  p_patient uuid, p_mode text, p_purpose text, p_target text, p_receipt boolean
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_purpose is null or p_purpose not in ('create','edit','adopt','unit_create','unit_configure','presentation_create','presentation_edit','identity')
    or (p_purpose in ('edit','presentation_edit','identity')) <> (p_target is not null)
    or (p_target is not null and length(p_target) not between 1 and 120)
    or (p_purpose = 'presentation_edit' and p_target !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$')
    or p_mode is null or p_mode not in ('patient','global')
    or (p_patient is null) <> (p_purpose = 'unit_create' and p_mode = 'global')
    or (p_mode = 'global' and p_purpose not in ('create','edit','adopt','unit_create')) then
    raise exception 'invalid catalogue preparation scope' using errcode = '22023';
  end if;
  if private.auth_session() is null then
    raise exception 'catalogue preparation unavailable' using errcode = '42501';
  end if;
  if p_mode = 'global' then
    if not public.is_global_administrator() or (p_patient is not null and not exists (
      select 1 from public.care_recipients where id = p_patient and is_active
    )) then
      raise exception 'catalogue preparation unavailable' using errcode = '42501';
    end if;
  elsif p_receipt then
    if not public.can_access_recipient(p_patient) then
      raise exception 'catalogue preparation unavailable' using errcode = '42501';
    end if;
  else
    perform private.require_cap(p_patient, 'catalog.manage');
  end if;
  if p_purpose in ('edit','identity') and not exists (
    select 1 from public.care_recipient_products where care_recipient_id = p_patient and product_id = p_target
  ) or p_purpose = 'presentation_edit' and not exists (
    select 1 from public.product_presentations where care_recipient_id = p_patient and id = p_target::uuid
  ) then
    raise exception 'catalogue preparation unavailable' using errcode = '42501';
  end if;
end;
$$;

create or replace function private.require_catalogue_preparation_scope(
  p_patient uuid, p_mode text, p_purpose text, p_target text
) returns void language sql security definer set search_path = '' as $$
  select private.require_catalogue_preparation_access(p_patient, p_mode, p_purpose, p_target, false);
$$;

create function private.catalogue_complementary_reference(
  p_patient uuid, p_mode text, p_purpose text, p_target text, p_selection text
) returns jsonb language plpgsql set search_path = '' as $$
declare
  v_product jsonb;
  v_presentation jsonb;
  v_units jsonb;
  v_reference jsonb;
begin
  if p_selection is not null and length(p_selection) not between 1 and 120 then
    raise exception 'invalid catalogue selection' using errcode = '22023';
  end if;
  if p_purpose = 'identity' then
    if p_selection is not null and (p_target = p_selection or not exists (
      select 1 from public.care_recipient_products where care_recipient_id = p_patient and product_id = p_selection
    )) then
      return jsonb_build_object('hash',null,'unavailable',true,
        'identity',private.catalogue_identity_snapshot(p_patient,p_target,null));
    end if;
    v_reference := private.catalogue_identity_snapshot(p_patient, p_target, p_selection);
    return jsonb_build_object('hash', v_reference->>'referenceHash', 'identity', v_reference);
  end if;

  if p_purpose = 'presentation_edit' then
    select to_jsonb(presentation) into v_presentation from public.product_presentations presentation
      where care_recipient_id = p_patient and id = p_target::uuid;
    p_selection := v_presentation->>'product_id';
  end if;
  if p_purpose in ('unit_configure','presentation_create','presentation_edit') then
    select jsonb_build_object('id', product_id, 'name', name, 'unit', unit,
      'decimals', quantity_decimals, 'active', is_active) into v_product
    from public.care_recipient_products where care_recipient_id = p_patient and product_id = p_selection;
  end if;
  if p_purpose = 'unit_configure' then
    select coalesce(jsonb_agg(to_jsonb(unit) order by unit.id), '[]'::jsonb) into v_units
      from public.measurement_units unit where unit.care_recipient_id is null or unit.care_recipient_id = p_patient;
  end if;
  return jsonb_build_object('hash', encode(extensions.digest(jsonb_build_array(
    p_patient,p_mode,p_purpose,p_target,p_selection,v_product,v_presentation,v_units)::text,'sha256'),'hex'),
    'product', v_product, 'presentation', v_presentation, 'units', v_units);
end;
$$;

create function public.catalogue_preparation_current(
  p_patient uuid, p_mode text, p_purpose text, p_target text, p_selection text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_reference jsonb;
begin
  perform private.require_catalogue_preparation_scope(p_patient,p_mode,p_purpose,p_target);
  if p_purpose not in ('unit_configure','presentation_create','presentation_edit','identity') then
    raise exception 'invalid catalogue selection' using errcode = '22023';
  end if;
  v_reference := private.catalogue_complementary_reference(p_patient,p_mode,p_purpose,p_target,p_selection);
  perform private.require_catalogue_preparation_scope(p_patient,p_mode,p_purpose,p_target);
  return v_reference;
end;
$$;

create or replace function public.catalogue_preparation_read(
  p_patient uuid, p_mode text, p_purpose text, p_target text, p_key uuid default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_draft jsonb;
  v_receipt jsonb;
  v_reference jsonb;
begin
  perform private.require_catalogue_preparation_access(p_patient,p_mode,p_purpose,p_target,p_key is not null);
  if p_key is not null then
    select c.receipt into v_receipt
    from private.catalogue_preparation_commands c
    join private.catalogue_preparations d on d.id = c.preparation_id
    where c.owner_id = auth.uid() and c.key = p_key and d.owner_id = auth.uid()
      and d.patient_id is not distinct from p_patient and d.mode = p_mode and d.purpose = p_purpose
      and d.target_id is not distinct from p_target;
    return jsonb_build_object('receipt', v_receipt);
  end if;

  select jsonb_build_object('id', id, 'revision', revision, 'state', state, 'fields', fields,
    'referenceHash', reference_hash, 'savedAt', saved_at, 'outcome', outcome)
  into v_draft from private.catalogue_preparations
  where owner_id = auth.uid() and patient_id is not distinct from p_patient and mode = p_mode and purpose = p_purpose
    and target_id is not distinct from p_target and state in ('active', 'consumed');
  if p_purpose in ('create','edit','adopt') then
    v_reference := private.catalogue_preparation_reference(p_patient, p_mode, p_purpose, p_target);
  else
    v_reference := private.catalogue_complementary_reference(p_patient,p_mode,p_purpose,p_target,
      nullif(v_draft->'fields'->>(case when p_purpose='identity' then 'successorId' else 'productId' end),''));
  end if;
  perform private.require_catalogue_preparation_scope(p_patient,p_mode,p_purpose,p_target);
  return jsonb_build_object('draft', v_draft, 'reference', v_reference);
end;
$$;

-- Partial saves permit an incomplete selection and exact decimal text. Each
-- purpose admits only its flat fields and the native operation checks final
-- business invariants again inside the same transaction as the receipt.
create function private.validate_catalogue_complementary_fields(p_purpose text,p_fields jsonb)
returns void language plpgsql set search_path = '' as $$
declare v_limits jsonb;
begin
  v_limits := case p_purpose
    when 'unit_create' then '{"code":30,"name":80,"dimension":8,"decimals":16}'
    when 'unit_configure' then '{"productId":120,"unit":30,"decimals":16}'
    when 'identity' then '{"identityAction":16,"successorId":120,"reason":1000}'
    else '{"productId":120,"name":160,"barcode":14,"factor":64}'
  end;
  if jsonb_typeof(p_fields) is distinct from 'object' then
    raise exception 'invalid catalogue preparation fields' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_each_text(v_limits) field
      where jsonb_typeof(p_fields->field.key) is distinct from 'string'
        or private.bal_comment_units(p_fields->>field.key) > field.value::integer)
    or exists (select 1 from jsonb_object_keys(p_fields) field where not (v_limits ? field)
      and (field <> 'active' or p_purpose not in ('presentation_create','presentation_edit')))
    or (p_purpose in ('presentation_create','presentation_edit') and jsonb_typeof(p_fields->'active') is distinct from 'boolean')
    or (p_purpose = 'unit_create' and p_fields->>'dimension' not in ('count','volume','mass','package'))
    or (p_purpose = 'identity' and p_fields->>'identityAction' not in ('','retire','reactivate','clear_successor')) then
    raise exception 'invalid catalogue preparation fields' using errcode = '22023';
  end if;
end;
$$;

create function private.commit_catalogue_complementary_preparation(
  p_patient uuid,p_mode text,p_purpose text,p_target text,p_fields jsonb,p_hash text,p_key uuid
) returns jsonb language plpgsql set search_path = '' as $$
declare
  v_selection text := nullif(p_fields->>(case when p_purpose='identity' then 'successorId' else 'productId' end),'');
  v_reference jsonb;
  v_result jsonb;
  v_factor text;
  v_decimals text := p_fields->>'decimals';
  v_id uuid;
begin
  v_reference := private.catalogue_complementary_reference(p_patient,p_mode,p_purpose,p_target,v_selection);
  if v_reference->>'hash' is distinct from p_hash then
    raise exception 'stale catalogue preparation reference' using errcode = 'PT409';
  end if;
  if p_purpose in ('unit_create','unit_configure') and v_decimals !~ '^[0-6]$' then
    raise exception 'invalid measurement precision' using errcode = '22023';
  end if;
  if p_purpose = 'unit_create' then
    v_id := public.create_measurement_unit(p_patient,btrim(p_fields->>'code'),btrim(p_fields->>'name'),
      p_fields->>'dimension',v_decimals::integer);
    return jsonb_build_object('unitId',v_id);
  elsif p_purpose = 'unit_configure' then
    if v_reference->'product' = 'null'::jsonb or v_reference->'product'->'active' <> 'true'::jsonb then
      raise exception 'patient product not available' using errcode = '22023';
    end if;
    perform public.configure_catalogue_unit(p_patient,v_selection,p_fields->>'unit',v_decimals::integer);
    return jsonb_build_object('productId',v_selection);
  elsif p_purpose = 'identity' then
    v_result := public.catalogue_identity_command(p_patient,p_target,v_selection,p_hash,
      jsonb_build_object('action',p_fields->>'identityAction','reason',btrim(p_fields->>'reason')),p_key);
    return jsonb_build_object('eventId',v_result->'result'->'event'->'id','productId',p_target,
      'actorName',v_result->'result'->'event'->'actor_name','identityAction',v_result->'result'->'event'->'action');
  end if;
  if v_reference->'product' = 'null'::jsonb or v_selection is distinct from v_reference->'product'->>'id'
    or (p_purpose = 'presentation_create' and v_reference->'product'->'active' <> 'true'::jsonb) then
    raise exception 'patient product not available' using errcode = '22023';
  end if;
  v_factor := replace(btrim(p_fields->>'factor'), ',', '.');
  if v_factor !~ '^[0-9]+([.][0-9]{1,6})?$' then
    raise exception 'invalid presentation factor or precision' using errcode = '22023';
  end if;
  v_result := public.catalogue_presentation_command(p_patient,p_target::uuid,(v_reference->'presentation'->>'version')::integer,
    jsonb_build_object('productId',v_selection,'name',btrim(p_fields->>'name'),'barcode',p_fields->>'barcode',
      'baseQuantity',v_factor,'active',p_fields->'active'),p_key);
  return jsonb_build_object('presentationId',v_result->'result'->'id','version',v_result->'result'->'version','productId',v_selection);
end;
$$;

create or replace function public.catalogue_preparation_command(
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
  v_complementary boolean := p_purpose not in ('create','edit','adopt');
begin
  perform private.require_catalogue_preparation_access(p_patient, p_mode, p_purpose, p_target, p_action = 'commit');
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
  perform private.require_catalogue_preparation_access(p_patient, p_mode, p_purpose, p_target, p_action = 'commit');
  select * into v_command from private.catalogue_preparation_commands where owner_id = auth.uid() and key = p_key;
  if found then
    if v_command.intent_hash <> v_intent then
      raise exception 'catalogue preparation intent differs' using errcode = '23505';
    end if;
    return v_command.receipt;
  end if;

  perform private.require_catalogue_preparation_scope(p_patient, p_mode, p_purpose, p_target);
  select * into v_draft from private.catalogue_preparations
    where owner_id = auth.uid() and patient_id is not distinct from p_patient and mode = p_mode and purpose = p_purpose
      and target_id is not distinct from p_target and state in ('active', 'consumed') for update;
  if v_draft.id is distinct from p_id or coalesce(v_draft.revision, 0) <> p_revision
    or (v_draft.state = 'consumed' and p_action <> 'acknowledge')
    or (p_action = 'acknowledge' and v_draft.state is distinct from 'consumed') then
    raise exception 'stale catalogue preparation revision' using errcode = 'PT409';
  end if;

  if p_action in ('save', 'commit') then
    if v_complementary then
      perform private.validate_catalogue_complementary_fields(p_purpose, p_fields);
    else
      v_args := private.catalogue_preparation_arguments(p_patient, p_purpose, p_target, p_fields, p_action = 'commit');
    end if;
  end if;
  if p_action = 'commit' then
    if p_patient is not null then
      perform pg_advisory_xact_lock(hashtextextended('stock:' || p_patient, 0));
      perform pg_advisory_xact_lock(hashtextextended('catalogue:' || p_patient, 0));
    end if;
    perform private.require_catalogue_preparation_scope(p_patient, p_mode, p_purpose, p_target);
    if v_complementary then
      v_outcome := private.commit_catalogue_complementary_preparation(p_patient,p_mode,p_purpose,p_target,p_fields,p_reference_hash,p_key);
    else
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
        raise exception 'stale catalogue preparation reference' using errcode = 'PT409';
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

revoke all on function private.require_catalogue_preparation_access(uuid,text,text,text,boolean),
  private.catalogue_complementary_reference(uuid,text,text,text,text),
  private.validate_catalogue_complementary_fields(text,jsonb),
  private.commit_catalogue_complementary_preparation(uuid,text,text,text,jsonb,text,uuid),
  public.catalogue_preparation_current(uuid,text,text,text,text)
  from public,anon,authenticated,service_role;
grant execute on function public.catalogue_preparation_current(uuid,text,text,text,text) to authenticated;
