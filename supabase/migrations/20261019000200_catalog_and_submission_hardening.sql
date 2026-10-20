-- Hardening aditivo: não remove dados existentes.
alter table public.requisitions
  add constraint requisitions_recipient_active_check
  check (care_recipient_id is not null);

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "authorized users create own requisitions" on public.requisitions;
create policy "authorized users create own requisitions" on public.requisitions
  for insert with check (
    created_by = auth.uid()
    and public.current_profile_role() in ('admin', 'supervisor', 'professional')
    and exists (
      select 1 from public.care_recipients c
      where c.id = care_recipient_id and c.is_active
    )
  );

create or replace function public.submit_requisition(
  p_care_recipient_id uuid,
  p_idempotency_key uuid,
  p_lines jsonb,
  p_extra_items jsonb,
  p_observations jsonb
) returns table (requisition_id uuid, protocol text, created_at timestamptz)
language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
  v_protocol text;
  v_created_at timestamptz;
  v_line jsonb;
  v_extra jsonb;
  v_line_count integer;
begin
  if auth.uid() is null or public.current_profile_role() not in ('admin', 'supervisor', 'professional') then
    raise exception 'not authorized';
  end if;
  if not exists (
    select 1 from public.care_recipients
    where id = p_care_recipient_id and is_active
  ) then
    raise exception 'recipient not authorized';
  end if;

  select r.id, r.protocol, r.created_at
    into v_id, v_protocol, v_created_at
    from public.requisitions r
    where r.created_by = auth.uid() and r.idempotency_key = p_idempotency_key;
  if v_id is not null then
    return query select v_id, v_protocol, v_created_at;
    return;
  end if;

  if coalesce(jsonb_array_length(p_lines), 0) + coalesce(jsonb_array_length(p_extra_items), 0) = 0 then
    raise exception 'empty requisition';
  end if;

  select count(*) into v_line_count
    from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) item
    where exists (
      select 1 from public.products p
      where p.id = item->>'productId'
        and p.is_active
        and p.name = item->>'productName'
        and p.category::text = item->>'category'
    );
  if v_line_count <> coalesce(jsonb_array_length(p_lines), 0) then
    raise exception 'invalid product catalog';
  end if;

  for v_extra in select * from jsonb_array_elements(coalesce(p_extra_items, '[]'::jsonb)) loop
    if exists (
      select 1 from public.products p
      where p.is_active and lower(trim(p.name)) = lower(trim(v_extra->>'customName'))
    ) then
      raise exception 'catalog item cannot be custom item';
    end if;
  end loop;

  v_protocol := 'HC-' || to_char(now() at time zone 'UTC', 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  begin
    insert into public.requisitions (protocol, created_by, care_recipient_id, status, idempotency_key)
      values (v_protocol, auth.uid(), p_care_recipient_id, 'submitted', p_idempotency_key)
      returning id, public.requisitions.created_at into v_id, v_created_at;
  exception when unique_violation then
    select r.id, r.protocol, r.created_at
      into v_id, v_protocol, v_created_at
      from public.requisitions r
      where r.created_by = auth.uid() and r.idempotency_key = p_idempotency_key;
    if v_id is null then raise; end if;
    return query select v_id, v_protocol, v_created_at;
    return;
  end;

  insert into public.requisition_items (requisition_id, product_id, current_stock, requested_quantity, urgent)
    select v_id, item->>'productId', (item->>'currentStock')::integer,
      (item->>'requestedQuantity')::integer, coalesce((item->>'urgent')::boolean, false)
    from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) item;
  insert into public.requisition_items (requisition_id, custom_name, current_stock, requested_quantity, urgent)
    select v_id, trim(item->>'customName'), (item->>'currentStock')::integer,
      (item->>'requestedQuantity')::integer, coalesce((item->>'urgent')::boolean, false)
    from jsonb_array_elements(coalesce(p_extra_items, '[]'::jsonb)) item;
  insert into public.requisition_observations (requisition_id, created_by, body)
    select v_id, auth.uid(), value
    from jsonb_array_elements_text(coalesce(p_observations, '[]'::jsonb)) value;
  insert into public.audit_events (actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'requisition.created', 'requisition', v_id,
      jsonb_build_object('protocol', v_protocol));
  return query select v_id, v_protocol, v_created_at;
end;
$$;

revoke all on function public.submit_requisition(uuid, uuid, jsonb, jsonb, jsonb) from public;
grant execute on function public.submit_requisition(uuid, uuid, jsonb, jsonb, jsonb) to authenticated;
