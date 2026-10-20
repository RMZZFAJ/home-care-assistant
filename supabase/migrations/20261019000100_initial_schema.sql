create extension if not exists "pgcrypto";

create type public.profile_role as enum ('admin', 'supervisor', 'professional', 'reader');
create type public.requisition_status as enum ('draft', 'submitted', 'under_review', 'approved', 'separated', 'delivered', 'cancelled');
create type public.product_category as enum ('medicamentos', 'higiene', 'dieta');
create type public.stock_movement_type as enum ('inbound', 'outbound', 'adjustment');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 2 and 160),
  role public.profile_role not null default 'professional',
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now()
);
create table public.care_recipients (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (length(trim(display_name)) between 2 and 160),
  is_development boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.products (
  id text primary key,
  name text not null,
  category public.product_category not null,
  unit text not null check (unit in ('unidade', 'caixa', 'frasco', 'pacote')),
  is_active boolean not null default true
);
create table public.requisitions (
  id uuid primary key default gen_random_uuid(),
  protocol text not null unique check (protocol ~ '^HC-[0-9]{8}-[A-Z0-9]{8}$'),
  created_by uuid not null references public.profiles(id),
  care_recipient_id uuid not null references public.care_recipients(id),
  status public.requisition_status not null default 'draft',
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (created_by, idempotency_key)
);
create table public.requisition_items (
  id uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references public.requisitions(id) on delete cascade,
  product_id text references public.products(id),
  custom_name text,
  current_stock integer not null check (current_stock >= 0),
  requested_quantity integer not null check (requested_quantity > 0),
  urgent boolean not null default false,
  check ((product_id is not null and custom_name is null) or (product_id is null and length(trim(custom_name)) > 0))
);
create table public.requisition_observations (
  id uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references public.requisitions(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  body text not null check (length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id),
  quantity integer not null check (quantity > 0),
  movement_type public.stock_movement_type not null,
  performed_by uuid not null references public.profiles(id),
  justification text not null check (length(trim(justification)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index requisitions_created_by_idx on public.requisitions(created_by, created_at desc);
create index requisition_items_requisition_idx on public.requisition_items(requisition_id);
create index audit_events_entity_idx on public.audit_events(entity_type, entity_id);

alter table public.profiles enable row level security;
alter table public.care_recipients enable row level security;
alter table public.products enable row level security;
alter table public.requisitions enable row level security;
alter table public.requisition_items enable row level security;
alter table public.requisition_observations enable row level security;
alter table public.stock_movements enable row level security;
alter table public.audit_events enable row level security;

create or replace function public.current_profile_role() returns public.profile_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and status = 'active';
$$;
create policy "users read own profile" on public.profiles for select using (id = auth.uid());
create policy "authorized users read active recipients" on public.care_recipients for select using (is_active and (public.current_profile_role() in ('admin', 'supervisor', 'professional', 'reader')));
create policy "authorized users read products" on public.products for select using (is_active and public.current_profile_role() is not null);
create policy "users read own requisitions" on public.requisitions for select using (created_by = auth.uid() or public.current_profile_role() in ('admin', 'supervisor'));
create policy "authorized users create own requisitions" on public.requisitions for insert with check (created_by = auth.uid() and public.current_profile_role() in ('admin', 'supervisor', 'professional'));
create policy "users read requisition items" on public.requisition_items for select using (exists (select 1 from public.requisitions r where r.id = requisition_id and (r.created_by = auth.uid() or public.current_profile_role() in ('admin', 'supervisor'))));
create policy "users insert requisition items" on public.requisition_items for insert with check (exists (select 1 from public.requisitions r where r.id = requisition_id and r.created_by = auth.uid()));
create policy "users read requisition observations" on public.requisition_observations for select using (created_by = auth.uid() or public.current_profile_role() in ('admin', 'supervisor'));
create policy "users insert own observations" on public.requisition_observations for insert with check (created_by = auth.uid());
create policy "authorized users read stock movements" on public.stock_movements for select using (public.current_profile_role() in ('admin', 'supervisor', 'reader'));
create policy "authorized users read audit events" on public.audit_events for select using (public.current_profile_role() in ('admin', 'supervisor'));
create policy "authenticated users insert audit events" on public.audit_events for insert with check (actor_id = auth.uid());

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
begin
  if public.current_profile_role() not in ('admin', 'supervisor', 'professional') then
    raise exception 'not authorized';
  end if;
  select r.id, r.protocol, r.created_at into v_id, v_protocol, v_created_at
    from public.requisitions r
    where r.created_by = auth.uid() and r.idempotency_key = p_idempotency_key;
  if v_id is not null then
    return query select v_id, v_protocol, v_created_at;
    return;
  end if;
  v_protocol := 'HC-' || to_char(now() at time zone 'UTC', 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.requisitions (protocol, created_by, care_recipient_id, status, idempotency_key)
    values (v_protocol, auth.uid(), p_care_recipient_id, 'submitted', p_idempotency_key)
    returning id, public.requisitions.created_at into v_id, v_created_at;
  insert into public.requisition_items (requisition_id, product_id, custom_name, current_stock, requested_quantity, urgent)
    select v_id, nullif(item->>'productId', ''), nullif(item->>'customName', ''), (item->>'currentStock')::integer, (item->>'requestedQuantity')::integer, coalesce((item->>'urgent')::boolean, false)
    from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb) || coalesce(p_extra_items, '[]'::jsonb)) item;
  insert into public.requisition_observations (requisition_id, created_by, body)
    select v_id, auth.uid(), value
    from jsonb_array_elements_text(coalesce(p_observations, '[]'::jsonb)) value;
  insert into public.audit_events (actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'requisition.created', 'requisition', v_id, jsonb_build_object('protocol', v_protocol));
  return query select v_id, v_protocol, v_created_at;
end;
$$;
