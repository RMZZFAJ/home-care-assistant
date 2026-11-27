create table private.reviewed_catalogue_actions (
  actor_id uuid not null references auth.users(id) on delete cascade,
  key uuid not null,
  patient_id uuid references public.care_recipients(id),
  mode text not null check (mode in ('patient', 'global')),
  purpose text not null,
  target_id text,
  intent_hash text check (intent_hash ~ '^[a-f0-9]{64}$'),
  outcome jsonb,
  recorded_at timestamptz not null default clock_timestamp(),
  primary key (actor_id, key),
  check ((intent_hash is null) = (outcome is null))
);
create index reviewed_catalogue_actions_patient on private.reviewed_catalogue_actions (patient_id);
alter table private.reviewed_catalogue_actions enable row level security;
revoke all on private.reviewed_catalogue_actions from public, anon, authenticated, service_role;

create function public.reviewed_catalogue_reference(
  p_patient uuid, p_mode text, p_purpose text, p_target text, p_selection text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  reference jsonb;
  units jsonb;
  unit_locked boolean;
begin
  perform private.require_catalogue_preparation_scope(p_patient,p_mode,p_purpose,p_target);
  if p_purpose in ('create','edit','adopt') then
    if p_selection is not null then
      raise exception 'invalid catalogue selection' using errcode = '22023';
    end if;
    reference := private.catalogue_preparation_reference(p_patient,p_mode,p_purpose,p_target);
    if p_purpose <> 'adopt' then
      select coalesce(jsonb_agg(jsonb_build_object('code',u.code,'name',u.name) order by u.name,u.code), '[]'::jsonb)
        into units from public.measurement_units u
        where u.care_recipient_id is null or u.care_recipient_id = p_patient;
      unit_locked := p_target is not null and (
        exists (select 1 from public.stock_movements where care_recipient_id=p_patient and product_id=p_target)
        or exists (select 1 from public.document_lines where care_recipient_id=p_patient and product_id=p_target)
        or exists (select 1 from public.requisition_items where care_recipient_id=p_patient and product_id=p_target)
        or exists (select 1 from public.stock_inventory_items where care_recipient_id=p_patient and product_id=p_target)
        or exists (select 1 from public.product_presentations where care_recipient_id=p_patient and product_id=p_target)
      );
      reference := reference || jsonb_build_object('units',units,'unitLocked',unit_locked);
    end if;
  else
    reference := private.catalogue_complementary_reference(p_patient,p_mode,p_purpose,p_target,p_selection);
  end if;
  perform private.require_catalogue_preparation_scope(p_patient,p_mode,p_purpose,p_target);
  return reference;
end;
$$;

create function private.commit_reviewed_catalogue_product(
  p_patient uuid, p_mode text, p_purpose text, p_target text, p_fields jsonb, p_hash text, p_key uuid
) returns jsonb language plpgsql set search_path = '' as $$
declare
  args jsonb := private.catalogue_preparation_arguments(p_patient,p_purpose,p_target,p_fields,true);
  reference jsonb;
  current_hash text;
  product_id text;
  proposal jsonb;
begin
  if p_purpose = 'adopt' then
    perform 1 from public.products where id = args->>'productId' and owner_care_recipient_id is null for share;
  end if;
  reference := private.catalogue_preparation_reference(p_patient,p_mode,p_purpose,p_target,args->>'productId');
  if p_purpose = 'adopt' then
    select model->>'hash' into current_hash from jsonb_array_elements(reference->'models') model
      where model->>'id' = args->>'productId';
  else
    current_hash := reference->>'hash';
  end if;
  if current_hash is distinct from p_hash then
    raise exception 'stale catalogue preparation reference' using errcode = 'PT409';
  end if;
  if p_purpose = 'edit' and args->'isActive' is distinct from reference->'item'->'is_active' then
    raise exception 'catalogue status requires a reviewed identity decision' using errcode = '22023';
  end if;
  if p_mode = 'global' then
    proposal := public.configure_patient_access(p_patient,'administration',
      jsonb_build_object('operation',args->>'action','args',args),p_key,
      private.catalogue_preparation_version(p_patient,p_mode));
    if proposal->>'status' is distinct from 'pending' or proposal->>'id' is null then
      raise exception 'catalogue proposal unavailable' using errcode = '42501';
    end if;
    return jsonb_build_object('proposalId',proposal->'id');
  end if;
  if p_purpose = 'adopt' then
    product_id := (public.admin_adopt_product(p_patient,args->>'productId')).product_id;
  else
    product_id := (public.admin_upsert_recipient_product(p_patient,p_target,args->>'name',
      (args->>'category')::public.product_category,args->>'unit',
      array(select jsonb_array_elements_text(args->'aliases')),(args->>'isActive')::boolean,
      args->>'description',(args->>'sortOrder')::integer)).product_id;
  end if;
  return jsonb_build_object('productId',product_id);
end;
$$;

create function public.reviewed_catalogue_command(
  p_patient uuid, p_mode text, p_purpose text, p_target text, p_key uuid, p_fields jsonb, p_reference_hash text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  attempt private.reviewed_catalogue_actions;
  fingerprint text;
  result jsonb;
begin
  if p_key is null or (p_fields is null) <> (p_reference_hash is null) or
    (p_fields is not null and (p_reference_hash !~ '^[a-f0-9]{64}$' or octet_length(p_fields::text)>36000)) then
    raise exception 'invalid reviewed catalogue intent' using errcode = '22023';
  end if;
  perform private.require_catalogue_preparation_access(p_patient,p_mode,p_purpose,p_target,p_fields is null);
  perform pg_advisory_xact_lock(hashtextextended('reviewed-catalogue-key:' || actor || ':' || p_key,0));
  perform private.require_catalogue_preparation_access(p_patient,p_mode,p_purpose,p_target,p_fields is null);
  if p_fields is not null then
    fingerprint := encode(extensions.digest(jsonb_build_array(p_fields,p_reference_hash)::text,'sha256'),'hex');
  end if;
  select * into attempt from private.reviewed_catalogue_actions where actor_id = actor and key = p_key;
  if found then
    if (attempt.patient_id,attempt.mode,attempt.purpose,attempt.target_id)
      is distinct from (p_patient,p_mode,p_purpose,p_target) then
      raise exception 'catalogue action unavailable' using errcode = '42501';
    end if;
    if attempt.intent_hash is not null and fingerprint is not null and attempt.intent_hash <> fingerprint then
      raise exception 'catalogue preparation intent differs' using errcode = '23505';
    end if;
    result := attempt.outcome;
  else
    if p_fields is not null then
      if p_patient is not null then
        perform pg_advisory_xact_lock(hashtextextended('stock:' || p_patient,0));
        perform pg_advisory_xact_lock(hashtextextended('catalogue:' || p_patient,0));
      end if;
      perform private.require_catalogue_preparation_scope(p_patient,p_mode,p_purpose,p_target);
      if p_purpose in ('create','edit','adopt') then
        result := private.commit_reviewed_catalogue_product(p_patient,p_mode,p_purpose,p_target,p_fields,p_reference_hash,p_key);
      else
        perform private.validate_catalogue_complementary_fields(p_purpose,p_fields);
        result := private.commit_catalogue_complementary_preparation(p_patient,p_mode,p_purpose,p_target,p_fields,p_reference_hash,p_key);
      end if;
      perform private.require_catalogue_preparation_scope(p_patient,p_mode,p_purpose,p_target);
    end if;
    insert into private.reviewed_catalogue_actions(actor_id,key,patient_id,mode,purpose,target_id,intent_hash,outcome)
      values(actor,p_key,p_patient,p_mode,p_purpose,p_target,fingerprint,result);
  end if;
  return jsonb_build_object('ownerId',actor,'key',p_key,'patientId',p_patient,'mode',p_mode,'purpose',p_purpose,
    'targetId',p_target,'state',case when result is null then 'closed' else 'recorded' end,'outcome',result);
end;
$$;

revoke all on function private.commit_reviewed_catalogue_product(uuid,text,text,text,jsonb,text,uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.reviewed_catalogue_reference(uuid,text,text,text,text),
  public.reviewed_catalogue_command(uuid,text,text,text,uuid,jsonb,text)
  from public, anon, authenticated, service_role;
grant execute on function public.reviewed_catalogue_reference(uuid,text,text,text,text),
  public.reviewed_catalogue_command(uuid,text,text,text,uuid,jsonb,text) to authenticated;

notify pgrst, 'reload schema';
