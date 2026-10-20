-- Incremental integrity migration. Existing requisitions and their other fields remain intact.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'requisition_items'
      and column_name = 'requested_quantity'
  ) then
    alter table public.requisition_items drop column requested_quantity;
  end if;
end;
$$;

alter table public.requisitions add column if not exists payload_hash text;
alter table public.requisitions add column if not exists protocol_number bigint;

drop function if exists public.submit_requisition(uuid, uuid, jsonb, jsonb, jsonb);

create sequence if not exists public.requisition_protocol_number_seq
  as bigint
  minvalue 12
  start with 12
  increment by 1;

select setval(
  'public.requisition_protocol_number_seq',
  greatest(
    12,
    coalesce((select max(protocol_number) from public.requisitions), 12)
  ),
  coalesce((select max(protocol_number) >= 12 from public.requisitions), false)
);

create unique index if not exists requisitions_protocol_number_unique
  on public.requisitions(protocol_number)
  where protocol_number is not null;

create index if not exists requisitions_patient_created_idx
  on public.requisitions(care_recipient_id, created_at desc);

create or replace function public.submit_requisition(
  p_care_recipient_id uuid,
  p_idempotency_key uuid,
  p_payload_hash text,
  p_lines jsonb,
  p_extra_items jsonb,
  p_observations jsonb
) returns table (requisition_id uuid, protocol text, created_at timestamptz)
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_protocol text;
  v_created_at timestamptz;
  v_existing_hash text;
  v_protocol_number bigint;
  v_line jsonb;
  v_extra jsonb;
  v_observation text;
  v_product public.products%rowtype;
  v_match_count integer;
begin
  if auth.uid() is null or public.current_profile_role() not in ('admin', 'supervisor', 'professional') then
    raise exception 'not authorized';
  end if;
  if p_payload_hash is null or p_payload_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid payload hash';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array'
     or p_extra_items is null or jsonb_typeof(p_extra_items) <> 'array'
     or p_observations is null or jsonb_typeof(p_observations) <> 'array' then
    raise exception 'invalid payload shape';
  end if;
  if jsonb_array_length(p_lines) > 29 or jsonb_array_length(p_extra_items) > 20
     or jsonb_array_length(p_observations) > 50
     or jsonb_array_length(p_lines) + jsonb_array_length(p_extra_items) = 0 then
    raise exception 'invalid payload limits';
  end if;
  if not exists (
    select 1 from public.care_recipients
    where id = p_care_recipient_id
      and is_active
      and (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.status = 'active'
            and p.global_scope and p.role in ('admin', 'supervisor')
        )
        or exists (
          select 1 from public.care_recipient_memberships m
          where m.care_recipient_id = p_care_recipient_id
            and m.user_id = auth.uid()
        )
      )
  ) then
    raise exception 'recipient not authorized';
  end if;

  select r.id, r.protocol, r.created_at, r.payload_hash
    into v_id, v_protocol, v_created_at, v_existing_hash
    from public.requisitions r
    where r.created_by = auth.uid()
      and r.idempotency_key = p_idempotency_key
    for update;
  if v_id is not null then
    if v_existing_hash is distinct from p_payload_hash then
      raise exception 'idempotency key already used with different content';
    end if;
    return query select v_id, v_protocol, v_created_at;
    return;
  end if;

  for v_line in select value from jsonb_array_elements(p_lines) loop
    if jsonb_typeof(v_line->'productId') <> 'string'
       or jsonb_typeof(v_line->'productName') <> 'string'
       or jsonb_typeof(v_line->'category') <> 'string'
       or jsonb_typeof(v_line->'currentStock') <> 'number'
       or jsonb_typeof(v_line->'urgent') <> 'boolean'
       or (v_line->>'productId') = ''
       or (v_line->>'productName') = ''
       or (v_line->>'category') not in ('medicamentos', 'higiene', 'dieta')
       or (v_line->>'currentStock') !~ '^[0-9]+$' then
      raise exception 'invalid catalog item';
    end if;
    select * into v_product
      from public.products
      where id = v_line->>'productId' and is_active;
    if not found
       or v_product.name <> v_line->>'productName'
       or v_product.category::text <> v_line->>'category'
       or (v_line ? 'unit' and v_product.unit <> v_line->>'unit') then
      raise exception 'invalid product catalog';
    end if;
  end loop;

  for v_extra in select value from jsonb_array_elements(p_extra_items) loop
    if jsonb_typeof(v_extra->'customName') <> 'string'
       or jsonb_typeof(v_extra->'currentStock') <> 'number'
       or jsonb_typeof(v_extra->'urgent') <> 'boolean'
       or length(trim(v_extra->>'customName')) not between 1 and 200
       or (v_extra->>'currentStock') !~ '^[0-9]+$' then
      raise exception 'invalid custom item';
    end if;
    select count(*) into v_match_count
      from public.products p
      where p.is_active
        and (
          unaccent(lower(trim(p.name))) = unaccent(lower(trim(v_extra->>'customName')))
          or exists (
            select 1 from unnest(p.aliases) a
            where unaccent(lower(trim(a))) = unaccent(lower(trim(v_extra->>'customName')))
          )
        );
    if v_match_count > 0 then
      raise exception 'custom item matches catalog product';
    end if;
  end loop;

  for v_observation in select value from jsonb_array_elements_text(p_observations) loop
    if length(trim(v_observation)) not between 1 and 1000 then
      raise exception 'invalid observation';
    end if;
  end loop;

  v_protocol_number := nextval('public.requisition_protocol_number_seq');
  v_protocol := 'HC-' || lpad(v_protocol_number::text, 6, '0');

  begin
    insert into public.requisitions (
      protocol, protocol_number, created_by, care_recipient_id, status,
      idempotency_key, payload_hash
    ) values (
      v_protocol, v_protocol_number, auth.uid(), p_care_recipient_id, 'submitted',
      p_idempotency_key, p_payload_hash
    ) returning id, public.requisitions.created_at into v_id, v_created_at;
  exception when unique_violation then
    select r.id, r.protocol, r.created_at, r.payload_hash
      into v_id, v_protocol, v_created_at, v_existing_hash
      from public.requisitions r
      where r.created_by = auth.uid()
        and r.idempotency_key = p_idempotency_key;
    if v_id is null or v_existing_hash is distinct from p_payload_hash then
      raise exception 'idempotency conflict';
    end if;
    return query select v_id, v_protocol, v_created_at;
    return;
  end;

  insert into public.requisition_items (requisition_id, product_id, current_stock, urgent)
    select v_id, item->>'productId', (item->>'currentStock')::integer,
      (item->>'urgent')::boolean
    from jsonb_array_elements(p_lines) item;
  insert into public.requisition_items (requisition_id, custom_name, current_stock, urgent)
    select v_id, trim(item->>'customName'), (item->>'currentStock')::integer,
      (item->>'urgent')::boolean
    from jsonb_array_elements(p_extra_items) item;
  insert into public.requisition_observations (requisition_id, created_by, body)
    select v_id, auth.uid(), value
    from jsonb_array_elements_text(p_observations) value;
  insert into public.audit_events (actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'requisition.created', 'requisition', v_id,
      jsonb_build_object('protocol', v_protocol, 'protocol_number', v_protocol_number));
  return query select v_id, v_protocol, v_created_at;
end;
$$;

revoke all on function public.submit_requisition(uuid, uuid, text, jsonb, jsonb, jsonb) from public;
grant execute on function public.submit_requisition(uuid, uuid, text, jsonb, jsonb, jsonb) to authenticated;
