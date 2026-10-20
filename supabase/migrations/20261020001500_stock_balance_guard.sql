create or replace function public.guard_stock_movement_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance bigint;
  v_admin_global boolean;
begin
  if new.source_location is null then
    return new;
  end if;
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.role = 'admin'
      and p.global_scope
  ) into v_admin_global;
  if v_admin_global then
    return new;
  end if;
  perform pg_advisory_xact_lock(
    hashtextextended(
      concat(new.care_recipient_id, ':', new.product_id, ':', new.source_location),
      0
    )
  );
  select coalesce(balance, 0) into v_balance
  from public.current_stock_balances
  where care_recipient_id = new.care_recipient_id
    and product_id = new.product_id
    and location = new.source_location;
  if coalesce(v_balance, 0) < new.quantity then
    raise exception 'insufficient stock';
  end if;
  return new;
end;
$$;

drop trigger if exists stock_movement_balance_guard on public.stock_movements;
create trigger stock_movement_balance_guard
before insert on public.stock_movements
for each row execute function public.guard_stock_movement_balance();
