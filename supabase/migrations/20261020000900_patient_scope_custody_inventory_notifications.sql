-- Multipatient scope, custody-aware stock, inventory proposals, and notification tracking.
create table if not exists public.care_recipient_memberships (
  id uuid primary key default gen_random_uuid(),
  care_recipient_id uuid not null references public.care_recipients(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.profile_role not null,
  can_manage_stock boolean not null default false,
  can_count_stock boolean not null default false,
  created_at timestamptz not null default now(),
  unique (care_recipient_id, user_id)
);

alter table public.profiles
  add column if not exists global_scope boolean not null default false;

create index if not exists care_recipient_memberships_user_idx
  on public.care_recipient_memberships(user_id, care_recipient_id);

alter table public.stock_movements
  add column if not exists care_recipient_id uuid references public.care_recipients(id),
  add column if not exists source_location text,
  add column if not exists destination_location text,
  add column if not exists idempotency_key uuid,
  add column if not exists reference_type text,
  add column if not exists reference_id uuid;

alter table public.stock_movements
  add constraint stock_movement_locations_check
  check (
    (source_location is null or source_location in ('FAMILY', 'CARE_TEAM'))
    and (destination_location is null or destination_location in ('FAMILY', 'CARE_TEAM'))
  );

create unique index if not exists stock_movements_idempotency_unique
  on public.stock_movements(performed_by, idempotency_key)
  where idempotency_key is not null;

create index if not exists stock_movements_patient_product_idx
  on public.stock_movements(care_recipient_id, product_id, created_at desc);

create or replace view public.current_stock_balances as
select
  sm.care_recipient_id,
  sm.product_id,
  location,
  sum(quantity_delta)::bigint as balance
from (
  select care_recipient_id, product_id, destination_location as location, quantity::bigint as quantity_delta
  from public.stock_movements
  where destination_location is not null
  union all
  select care_recipient_id, product_id, source_location as location, (-quantity)::bigint as quantity_delta
  from public.stock_movements
  where source_location is not null
) sm
where care_recipient_id is not null
group by care_recipient_id, product_id, location;

create table if not exists public.stock_inventories (
  id uuid primary key default gen_random_uuid(),
  care_recipient_id uuid not null references public.care_recipients(id),
  location text not null check (location in ('FAMILY', 'CARE_TEAM')),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'under_review', 'approved', 'cancelled')),
  counted_by uuid not null references public.profiles(id),
  counted_at timestamptz not null default now(),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.stock_inventory_items (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.stock_inventories(id) on delete cascade,
  product_id text not null references public.products(id),
  expected_quantity bigint,
  counted_quantity bigint not null check (counted_quantity >= 0),
  justification text check (justification is null or length(trim(justification)) between 1 and 1000)
);

create table if not exists public.requisition_notifications (
  id uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references public.requisitions(id) on delete cascade,
  recipient_group text not null check (recipient_group in ('family', 'supervision', 'care_team', 'other')),
  recipient_label text not null check (length(trim(recipient_label)) between 1 and 160),
  channel text not null check (channel in ('whatsapp', 'email', 'internal')),
  state text not null default 'pending' check (state in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  provider_reference text,
  last_error text,
  attempted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (requisition_id, recipient_group, recipient_label, channel)
);

alter table public.care_recipient_memberships enable row level security;
alter table public.stock_inventories enable row level security;
alter table public.stock_inventory_items enable row level security;
alter table public.requisition_notifications enable row level security;

create or replace function public.can_access_recipient(p_recipient_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.status = 'active'
        and p.global_scope
        and p.role in ('admin', 'supervisor')
    )
    or exists (
      select 1 from public.care_recipient_memberships m
      where m.care_recipient_id = p_recipient_id
        and m.user_id = auth.uid()
        and exists (select 1 from public.profiles p where p.id = m.user_id and p.status = 'active')
    );
$$;

drop policy if exists "authorized users read active recipients" on public.care_recipients;
create policy "authorized users read scoped recipients" on public.care_recipients
  for select using (is_active and public.can_access_recipient(id));

drop policy if exists "users read own requisitions" on public.requisitions;
create policy "users read scoped requisitions" on public.requisitions
  for select using (public.can_access_recipient(care_recipient_id));

drop policy if exists "users read requisition items" on public.requisition_items;
create policy "users read scoped requisition items" on public.requisition_items
  for select using (exists (
    select 1 from public.requisitions r
    where r.id = requisition_id and public.can_access_recipient(r.care_recipient_id)
  ));

drop policy if exists "users read requisition observations" on public.requisition_observations;
create policy "users read scoped requisition observations" on public.requisition_observations
  for select using (exists (
    select 1 from public.requisitions r
    where r.id = requisition_id and public.can_access_recipient(r.care_recipient_id)
  ));

drop policy if exists "authorized users read stock movements" on public.stock_movements;
create policy "authorized users read scoped stock movements" on public.stock_movements
  for select using (care_recipient_id is not null and public.can_access_recipient(care_recipient_id));

create policy "users read own memberships" on public.care_recipient_memberships
  for select using (user_id = auth.uid() or public.current_profile_role() = 'admin');

create policy "users read scoped inventories" on public.stock_inventories
  for select using (public.can_access_recipient(care_recipient_id));

create policy "users read scoped inventory items" on public.stock_inventory_items
  for select using (exists (
    select 1 from public.stock_inventories i
    where i.id = inventory_id and public.can_access_recipient(i.care_recipient_id)
  ));

create policy "users read scoped notifications" on public.requisition_notifications
  for select using (exists (
    select 1 from public.requisitions r
    where r.id = requisition_id and public.can_access_recipient(r.care_recipient_id)
  ));

revoke all on public.care_recipient_memberships, public.stock_inventories,
  public.stock_inventory_items, public.requisition_notifications from public, anon;
grant select on public.care_recipient_memberships, public.stock_inventories,
  public.stock_inventory_items, public.requisition_notifications to authenticated;
grant select on public.current_stock_balances to authenticated;
grant execute on function public.can_access_recipient(uuid) to authenticated;
