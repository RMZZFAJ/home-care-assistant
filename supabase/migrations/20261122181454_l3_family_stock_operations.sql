-- Keep the operation as the unit of confirmation. Existing ledger entries
-- retain their original reference, quantity, custody and authorship.
create table private.family_stock_operations (
  id uuid primary key default gen_random_uuid(),
  care_recipient_id uuid not null references public.care_recipients(id),
  actor_id uuid not null references public.profiles(id),
  actor_name text,
  action text not null check (action in ('inbound','outbound','correction_in','correction_out')),
  reason text not null,
  command_key uuid not null,
  intent_hash text not null,
  recorded_at timestamptz not null default clock_timestamp(),
  unique (actor_id, command_key)
);
create index family_stock_operations_patient
  on private.family_stock_operations(care_recipient_id, recorded_at desc, id);
create table private.family_stock_operation_movements (
  movement_id uuid primary key references public.stock_movements(id),
  operation_id uuid not null references private.family_stock_operations(id)
);
create index family_stock_operation_movements_operation
  on private.family_stock_operation_movements(operation_id);
alter table private.family_stock_operations enable row level security;
alter table private.family_stock_operation_movements enable row level security;
revoke all on private.family_stock_operations, private.family_stock_operation_movements
  from public, anon, authenticated, service_role;

create function public.family_stock_operation_reference(p_patient uuid, p_products text[])
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare reference jsonb; materials jsonb; can_read boolean;
begin
  perform private.require_cap(p_patient, 'stock.family.manage');
  if p_products is null or cardinality(p_products) not between 1 and 50
    or cardinality(p_products) <> (select count(distinct item) from unnest(p_products) item)
    or exists(select 1 from unnest(p_products) item where length(item) not between 1 and 120)
  then raise exception 'invalid family stock materials' using errcode='22023'; end if;
  can_read := private.can(p_patient, 'stock.family.read');

  select jsonb_agg(jsonb_build_array(c.product_id, c.is_active, c.unit, c.quantity_decimals, c.updated_at, ledger.revision) order by c.product_id),
    jsonb_agg(jsonb_build_object('productId',c.product_id,'name',c.name,'unit',c.unit,'active',c.is_active,
      'quantityDecimals',c.quantity_decimals,'quantity',
      case when can_read then private.stock_quantity(p_patient,c.product_id,'FAMILY')::text end,
      'updatedAt', case when can_read then ledger.latest end) order by c.product_id)
  into reference, materials
  from public.care_recipient_products c
  cross join lateral (
    select coalesce(max(m.movement_revision),0) as revision, max(m.created_at) as latest
    from public.stock_movements m
    where m.care_recipient_id=p_patient and m.product_id=c.product_id
      and (m.source_location='FAMILY' or m.destination_location='FAMILY')
  ) ledger
  where c.care_recipient_id=p_patient and c.product_id=any(p_products);
  if coalesce(jsonb_array_length(materials),0) <> cardinality(p_products) then
    raise exception 'stock material not found' using errcode='22023';
  end if;
  perform private.require_cap(p_patient, 'stock.family.manage');
  return jsonb_build_object('patientId',p_patient,'materials',materials,'referenceHash',
    encode(extensions.digest(jsonb_build_array(p_patient, reference)::text, 'sha256'), 'hex'));
end;
$$;

create function private.family_stock_operation_receipt(p_operation private.family_stock_operations)
returns jsonb language sql stable set search_path='' as $$
  select jsonb_build_object('id', p_operation.id, 'patientId', p_operation.care_recipient_id,
    'key', p_operation.command_key, 'recordedAt', p_operation.recorded_at,
    'movementIds', (select jsonb_agg(m.id order by m.movement_revision, m.id)
      from private.family_stock_operation_movements g join public.stock_movements m on m.id=g.movement_id
      where g.operation_id=p_operation.id));
$$;
revoke all on function private.family_stock_operation_receipt(private.family_stock_operations)
  from public, anon, authenticated, service_role;

create function public.family_stock_operation_result(p_patient uuid, p_key uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare operation private.family_stock_operations;
begin
  perform private.require_cap(p_patient, 'stock.family.manage');
  select o.* into operation from private.family_stock_operations o
    where o.care_recipient_id=p_patient and o.actor_id=auth.uid() and o.command_key=p_key;
  if not found then return null; end if;
  return private.family_stock_operation_receipt(operation);
end;
$$;

create function public.commit_family_stock_operation(
  p_patient uuid, p_action text, p_lines jsonb, p_reason text, p_reference text, p_key uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare operation private.family_stock_operations; line jsonb; intent text; current_reference jsonb;
  products text[]; movement_ids uuid[] := '{}'; canonical_lines jsonb; reason_text text := btrim(p_reason);
begin
  perform private.require_cap(p_patient, 'stock.family.manage');
  if p_key is null or p_action is null or p_action not in ('inbound','outbound','correction_in','correction_out')
    or reason_text is null or length(reason_text) not between 3 and 1000
    or coalesce(p_reference,'') !~ '^[0-9a-f]{64}$'
    or jsonb_typeof(p_lines) is distinct from 'array'
    or jsonb_array_length(p_lines) not between 1 and 50
  then raise exception 'invalid family stock operation' using errcode='22023'; end if;
  for line in select value from jsonb_array_elements(p_lines) loop
    if jsonb_typeof(line) is distinct from 'object' or (line-array['productId','quantity','referenceId']) <> '{}'::jsonb
      or jsonb_typeof(line->'productId') is distinct from 'string' or length(line->>'productId') not between 1 and 120
      or jsonb_typeof(line->'quantity') is distinct from 'string'
      or coalesce(line->>'quantity','') !~ '^[0-9]{1,12}(\.[0-9]{1,6})?$'
      or (p_action in ('correction_in','correction_out')) <> (line ? 'referenceId')
      or (line ? 'referenceId' and coalesce(line->>'referenceId','') !~ '^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$')
    then raise exception 'invalid family stock line' using errcode='22023'; end if;
  end loop;
  select array_agg(item->>'productId' order by item->>'productId'), jsonb_agg(item order by item->>'productId')
    into products, canonical_lines from jsonb_array_elements(p_lines) item;
  if cardinality(products) <> (select count(distinct item) from unnest(products) item)
  then raise exception 'duplicate family stock material' using errcode='22023'; end if;

  intent := encode(extensions.digest(jsonb_build_array(p_patient,p_action,canonical_lines,reason_text,p_reference)::text,'sha256'),'hex');
  perform pg_advisory_xact_lock(hashtextextended('family-stock-operation:'||auth.uid()||':'||p_key,0));
  perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
  perform private.require_cap(p_patient, 'stock.family.manage');
  select o.* into operation from private.family_stock_operations o
    where o.actor_id=auth.uid() and o.command_key=p_key;
  if found then
    if operation.care_recipient_id <> p_patient or operation.intent_hash <> intent then
      raise exception 'family stock operation idempotency conflict' using errcode='23505';
    end if;
    return private.family_stock_operation_receipt(operation);
  end if;
  current_reference := public.family_stock_operation_reference(p_patient, products);
  if current_reference->>'referenceHash' is distinct from p_reference then
    raise exception 'stock reference changed; confirm the reviewed materials again' using errcode='PT409';
  end if;
  for line in select value from jsonb_array_elements(canonical_lines) loop
    movement_ids := array_append(movement_ids, public.family_stock_movement(
      p_patient, line->>'productId', (line->>'quantity')::numeric, p_action, reason_text,
      gen_random_uuid(), (line->>'referenceId')::uuid));
  end loop;
  insert into private.family_stock_operations(care_recipient_id,actor_id,actor_name,action,reason,command_key,intent_hash)
    values (p_patient,auth.uid(),(select full_name from public.profiles where id=auth.uid()),p_action,reason_text,p_key,intent)
    returning * into operation;
  insert into private.family_stock_operation_movements(movement_id,operation_id)
    select movement_id, operation.id from unnest(movement_ids) movement_id;
  perform private.require_cap(p_patient, 'stock.family.manage');
  return private.family_stock_operation_receipt(operation);
end;
$$;

revoke all on function public.family_stock_operation_reference(uuid,text[]),
  public.family_stock_operation_result(uuid,uuid), public.commit_family_stock_operation(uuid,text,jsonb,text,text,uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.family_stock_operation_reference(uuid,text[]),
  public.family_stock_operation_result(uuid,uuid), public.commit_family_stock_operation(uuid,text,jsonb,text,text,uuid)
  to authenticated;
notify pgrst, 'reload schema';
