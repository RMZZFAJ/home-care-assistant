create or replace function public.record_stock_movement(
  p_care_recipient_id uuid,
  p_product_id text,
  p_quantity integer,
  p_movement_type public.stock_movement_type,
  p_source_location text,
  p_destination_location text,
  p_justification text,
  p_idempotency_key uuid default null,
  p_reference_type text default null,
  p_reference_id uuid default null
) returns public.stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_movement public.stock_movements;
  v_can_manage boolean;
begin
  if auth.uid() is null or public.current_profile_role() is null then
    raise exception 'not authorized';
  end if;
  select exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'active'
        and p.role = 'admin' and p.global_scope
    )
    or exists (
      select 1 from public.care_recipient_memberships m
      where m.care_recipient_id = p_care_recipient_id
        and m.user_id = auth.uid()
        and m.can_manage_stock
    ) into v_can_manage;
  if not coalesce(v_can_manage, false) then
    raise exception 'stock management not authorized';
  end if;
  if not exists (
    select 1 from public.care_recipients
    where id = p_care_recipient_id and is_active
  ) then
    raise exception 'recipient not active';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be positive';
  end if;
  if not exists (select 1 from public.products where id = p_product_id and is_active) then
    raise exception 'product not active';
  end if;
  if length(trim(coalesce(p_justification, ''))) = 0 then
    raise exception 'justification required';
  end if;
  if p_source_location is not null and p_source_location not in ('FAMILY', 'CARE_TEAM') then
    raise exception 'invalid source location';
  end if;
  if p_destination_location is not null and p_destination_location not in ('FAMILY', 'CARE_TEAM') then
    raise exception 'invalid destination location';
  end if;
  if p_movement_type = 'inbound' and p_destination_location is null then
    raise exception 'inbound destination required';
  end if;
  if p_movement_type = 'outbound' and p_source_location is null then
    raise exception 'outbound source required';
  end if;
  if p_movement_type = 'adjustment' and p_source_location is null and p_destination_location is null then
    raise exception 'adjustment location required';
  end if;

  if p_idempotency_key is not null then
    select * into v_movement
      from public.stock_movements
      where performed_by = auth.uid() and idempotency_key = p_idempotency_key;
    if found then return v_movement; end if;
  end if;

  insert into public.stock_movements (
    product_id, quantity, movement_type, performed_by, justification,
    care_recipient_id, source_location, destination_location,
    idempotency_key, reference_type, reference_id
  ) values (
    p_product_id, p_quantity, p_movement_type, auth.uid(), trim(p_justification),
    p_care_recipient_id, p_source_location, p_destination_location,
    p_idempotency_key, p_reference_type, p_reference_id
  )
  returning * into v_movement;

  insert into public.audit_events (actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'stock.movement.created', 'stock_movement', v_movement.id,
      jsonb_build_object('care_recipient_id', p_care_recipient_id, 'product_id', p_product_id,
        'movement_type', p_movement_type, 'quantity', p_quantity,
        'source_location', p_source_location, 'destination_location', p_destination_location));
  return v_movement;
end;
$$;

revoke all on function public.record_stock_movement(uuid, text, integer, public.stock_movement_type, text, text, text, uuid, text, uuid) from public;
grant execute on function public.record_stock_movement(uuid, text, integer, public.stock_movement_type, text, text, text, uuid, text, uuid) to authenticated;
