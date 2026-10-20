create or replace function public.create_stock_inventory(
  p_care_recipient_id uuid, p_location text
) returns public.stock_inventories
language plpgsql security definer set search_path = public
as $$
declare v_inventory public.stock_inventories;
begin
  if p_location not in ('FAMILY','CARE_TEAM') or not exists (
    select 1 from public.care_recipient_memberships m
    where m.care_recipient_id=p_care_recipient_id and m.user_id=auth.uid()
      and m.can_count_stock
  ) and not public.is_global_administrator()
  then raise exception 'inventory authorization required'; end if;
  insert into public.stock_inventories(care_recipient_id,location,counted_by)
  values(p_care_recipient_id,p_location,auth.uid()) returning * into v_inventory;
  return v_inventory;
end;
$$;

create or replace function public.add_stock_inventory_item(
  p_inventory_id uuid, p_product_id text, p_counted_quantity bigint, p_justification text default null
) returns public.stock_inventory_items
language plpgsql security definer set search_path = public
as $$
declare v_item public.stock_inventory_items; v_inventory public.stock_inventories;
begin
  select * into v_inventory from public.stock_inventories where id=p_inventory_id for update;
  if not found or v_inventory.status <> 'draft' then raise exception 'inventory not editable'; end if;
  if not public.is_global_administrator() and not exists (
    select 1 from public.care_recipient_memberships m where m.care_recipient_id=v_inventory.care_recipient_id
      and m.user_id=auth.uid() and m.can_count_stock
  ) then raise exception 'inventory authorization required'; end if;
  if not exists(select 1 from public.products where id=p_product_id and is_active)
     or p_counted_quantity < 0 then raise exception 'invalid inventory item'; end if;
  insert into public.stock_inventory_items(inventory_id,product_id,counted_quantity,justification)
  values(p_inventory_id,p_product_id,p_counted_quantity,nullif(trim(p_justification),''))
  on conflict (inventory_id,product_id) do update set counted_quantity=excluded.counted_quantity, justification=excluded.justification
  returning * into v_item;
  return v_item;
end;
$$;

alter table public.stock_inventory_items add constraint stock_inventory_items_unique_product unique(inventory_id, product_id);

create or replace function public.submit_stock_inventory(p_inventory_id uuid)
returns public.stock_inventories
language plpgsql security definer set search_path = public
as $$
declare v_inventory public.stock_inventories;
begin
  update public.stock_inventories i set status='submitted'
  where i.id=p_inventory_id and i.status='draft'
    and (public.is_global_administrator() or exists (
      select 1 from public.care_recipient_memberships m where m.care_recipient_id=i.care_recipient_id
      and m.user_id=auth.uid() and m.can_count_stock
    ))
  returning i.* into v_inventory;
  if not found then raise exception 'inventory cannot be submitted'; end if;
  return v_inventory;
end;
$$;

create or replace function public.approve_stock_inventory(p_inventory_id uuid)
returns public.stock_inventories
language plpgsql security definer set search_path = public
as $$
declare v_inventory public.stock_inventories; v_item record; v_expected bigint; v_delta bigint;
begin
  if not public.is_global_administrator() then raise exception 'inventory approval required'; end if;
  select * into v_inventory from public.stock_inventories where id=p_inventory_id and status='submitted' for update;
  if not found then raise exception 'inventory cannot be approved'; end if;
  for v_item in select * from public.stock_inventory_items where inventory_id=p_inventory_id loop
    select coalesce(balance,0) into v_expected from public.current_stock_balances
    where care_recipient_id=v_inventory.care_recipient_id and product_id=v_item.product_id and location=v_inventory.location;
    v_delta := v_item.counted_quantity - coalesce(v_expected,0);
    if v_delta <> 0 then
      insert into public.stock_movements(product_id,quantity,movement_type,performed_by,justification,care_recipient_id,source_location,destination_location,reference_type,reference_id)
      values(v_item.product_id,abs(v_delta),'adjustment',auth.uid(),coalesce(v_item.justification,'inventário aprovado'),v_inventory.care_recipient_id,
        case when v_delta < 0 then v_inventory.location end, case when v_delta > 0 then v_inventory.location end,'inventory',p_inventory_id);
    end if;
  end loop;
  update public.stock_inventories set status='approved',approved_by=auth.uid(),approved_at=now() where id=p_inventory_id returning * into v_inventory;
  return v_inventory;
end;
$$;

revoke all on function public.create_stock_inventory(uuid,text) from public;
revoke all on function public.add_stock_inventory_item(uuid,text,bigint,text) from public;
revoke all on function public.submit_stock_inventory(uuid) from public;
revoke all on function public.approve_stock_inventory(uuid) from public;
grant execute on function public.create_stock_inventory(uuid,text) to authenticated;
grant execute on function public.add_stock_inventory_item(uuid,text,bigint,text) to authenticated;
grant execute on function public.submit_stock_inventory(uuid) to authenticated;
grant execute on function public.approve_stock_inventory(uuid) to authenticated;
