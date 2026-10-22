-- Additive repair. Historical migrations and stable product identities remain intact.
alter table public.care_recipient_memberships add column status text not null default 'active'
  check (status in ('active','revoked'));

create or replace function public.is_global_administrator() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and status='active' and role='admin' and global_scope);
$$;
create or replace function public.recipient_role(p_recipient_id uuid) returns public.profile_role
language sql stable security definer set search_path = public as $$
  select case when public.is_global_administrator() then 'admin'::public.profile_role else
    (select m.role from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id
      where m.care_recipient_id=p_recipient_id and m.user_id=auth.uid() and m.status='active' and p.status='active') end;
$$;
create or replace function public.can_access_recipient(p_recipient_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.recipient_role(p_recipient_id) is not null,false);
$$;
create or replace function public.can_manage_recipient(p_recipient_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.recipient_role(p_recipient_id)='admin',false);
$$;
create or replace function public.recipient_can(p_recipient_id uuid,p_operation text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.care_recipients r where r.id=p_recipient_id and r.is_active)
    and (public.is_global_administrator() or exists(
      select 1 from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id
      where m.care_recipient_id=p_recipient_id and m.user_id=auth.uid() and m.status='active' and p.status='active'
        and m.role <> 'reader' and case p_operation
          when 'admin' then m.role='admin'
          when 'submit' then m.role in ('admin','supervisor','professional','family')
          when 'review' then m.role in ('admin','supervisor')
          when 'stock' then m.role='admin' or m.can_manage_stock
          when 'count' then m.role='admin' or m.can_count_stock
          else false end));
$$;

-- A transactional counter serializes concurrent demotion/deletion, including Auth cascades.
create table public.global_admin_guard (
  singleton boolean primary key default true check(singleton), active_count integer not null check(active_count>=0)
);
insert into public.global_admin_guard select true,count(*) from public.profiles where status='active' and role='admin' and global_scope;
create or replace function public.protect_last_global_admin() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_old boolean:=false; v_new boolean:=false;
begin
  if tg_op<>'INSERT' then v_old:=old.status='active' and old.role='admin' and old.global_scope; end if;
  if tg_op<>'DELETE' then v_new:=new.status='active' and new.role='admin' and new.global_scope; end if;
  if v_old and not v_new then
    update public.global_admin_guard set active_count=active_count-1 where singleton and active_count>1;
    if not found then raise exception 'last global administrator cannot be removed' using errcode='23514'; end if;
  elsif v_new and not v_old then
    update public.global_admin_guard set active_count=active_count+1 where singleton;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end; $$;
create trigger protect_last_global_admin before insert or update or delete on public.profiles
for each row execute function public.protect_last_global_admin();

alter table public.products add column owner_care_recipient_id uuid references public.care_recipients(id);
create table public.care_recipient_products (
  care_recipient_id uuid not null references public.care_recipients(id),
  product_id text not null references public.products(id),
  name text not null check(length(trim(name)) between 2 and 160),
  description text check(description is null or length(description)<=2000),
  category public.product_category not null,
  unit text not null check(unit in ('unidade','caixa','frasco','pacote','bisnaga','envelope','comprimido')),
  aliases text[] not null default '{}', is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(care_recipient_id,product_id)
);
-- Before this migration every existing patient shared the same global catalogue.
-- Copy that established availability, without assigning any unscoped historical stock.
insert into public.care_recipient_products(care_recipient_id,product_id,name,category,unit,aliases,is_active)
select r.id,p.id,p.name,p.category,p.unit,p.aliases,p.is_active from public.care_recipients r cross join public.products p;
alter table public.care_recipient_products enable row level security;
create policy "scoped catalogue read" on public.care_recipient_products for select using(public.can_access_recipient(care_recipient_id));

alter table public.requisition_items add column care_recipient_id uuid,
  add column product_name_snapshot text, add column category_snapshot text, add column unit_snapshot text,
  add column snapshot_source text not null default 'legacy_reconstructed' check(snapshot_source in ('persisted','legacy_reconstructed'));
update public.requisition_items i set care_recipient_id=r.care_recipient_id from public.requisitions r where r.id=i.requisition_id;
alter table public.requisition_items alter column care_recipient_id set not null;
alter table public.requisition_items add constraint requisition_items_patient_product_fk
  foreign key(care_recipient_id,product_id) references public.care_recipient_products(care_recipient_id,product_id);
alter table public.requisitions add column requester_name_snapshot text, add column recipient_name_snapshot text;
-- Existing names are a reconstruction, never represented as original snapshots.
update public.requisition_items i set product_name_snapshot=coalesce(p.name,i.custom_name),
  category_snapshot=p.category::text,unit_snapshot=p.unit from public.products p where p.id=i.product_id;
update public.requisition_items set product_name_snapshot=custom_name where product_id is null;
alter table public.stock_movements add constraint stock_movements_patient_product_fk
  foreign key(care_recipient_id,product_id) references public.care_recipient_products(care_recipient_id,product_id);
alter table public.stock_inventory_items add column care_recipient_id uuid;
update public.stock_inventory_items x set care_recipient_id=i.care_recipient_id from public.stock_inventories i where i.id=x.inventory_id;
alter table public.stock_inventory_items alter column care_recipient_id set not null;
alter table public.stock_inventory_items add constraint inventory_items_patient_product_fk
  foreign key(care_recipient_id,product_id) references public.care_recipient_products(care_recipient_id,product_id);
-- Derive the parent scope; never trust a caller's child-row patient identifier.
create or replace function public.derive_item_patient() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if tg_table_name='requisition_items' then
    select care_recipient_id into new.care_recipient_id from public.requisitions where id=new.requisition_id;
  else
    select care_recipient_id into new.care_recipient_id from public.stock_inventories where id=new.inventory_id;
  end if;
  return new;
end; $$;
create trigger derive_requisition_item_patient before insert or update on public.requisition_items
for each row execute function public.derive_item_patient();
create trigger derive_inventory_item_patient before insert or update on public.stock_inventory_items
for each row execute function public.derive_item_patient();

alter view public.current_stock_balances set (security_invoker=true);
drop policy if exists "authorized users read scoped recipients" on public.care_recipients;
create policy "scoped recipients including history" on public.care_recipients for select using(public.can_access_recipient(id));
drop policy if exists "users read own memberships" on public.care_recipient_memberships;
create policy "scoped membership read" on public.care_recipient_memberships for select using(
  public.can_manage_recipient(care_recipient_id) or (user_id=auth.uid() and public.current_profile_role() is not null));
drop policy if exists "authorized users read products" on public.products;
create policy "authorized template or own product read" on public.products for select using(
  public.current_profile_role() is not null and (owner_care_recipient_id is null or public.can_access_recipient(owner_care_recipient_id)));
drop policy if exists "authorized users read audit events" on public.audit_events;
create policy "scoped audit read" on public.audit_events for select using(public.is_global_administrator() or
  exists(select 1 from public.care_recipients r where r.id::text=metadata->>'care_recipient_id' and public.can_manage_recipient(r.id)));

create or replace function public.admin_list_recipients() returns setof public.care_recipients
language sql stable security definer set search_path=public as $$
  select r from public.care_recipients r where public.can_manage_recipient(r.id) order by r.display_name;
$$;
create or replace function public.admin_upsert_recipient(p_id uuid,p_display_name text,p_is_active boolean,p_is_development boolean)
returns public.care_recipients language plpgsql security definer set search_path=public as $$
declare v public.care_recipients;
begin
  if not public.is_global_administrator() and not (p_id is not null and public.can_manage_recipient(p_id)) then
    raise exception 'admin authorization required' using errcode='42501'; end if;
  if p_display_name is null or length(trim(p_display_name)) not between 2 and 160 then raise exception 'invalid recipient'; end if;
  insert into public.care_recipients(id,display_name,is_active,is_development)
  values(coalesce(p_id,gen_random_uuid()),trim(p_display_name),p_is_active,p_is_development)
  on conflict(id) do update set display_name=excluded.display_name,is_active=excluded.is_active,is_development=excluded.is_development returning * into v;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'recipient.updated','care_recipient',v.id,jsonb_build_object('care_recipient_id',v.id,'is_active',v.is_active));
  return v;
end; $$;
create or replace function public.admin_upsert_membership(p_care_recipient_id uuid,p_user_id uuid,p_role public.profile_role,p_can_manage_stock boolean,p_can_count_stock boolean)
returns public.care_recipient_memberships language plpgsql security definer set search_path=public as $$
declare v public.care_recipient_memberships;
begin
  if not public.can_manage_recipient(p_care_recipient_id) then raise exception 'admin authorization required' using errcode='42501'; end if;
  if p_role is null or not exists(select 1 from public.profiles where id=p_user_id and status='active') then raise exception 'invalid membership'; end if;
  insert into public.care_recipient_memberships(care_recipient_id,user_id,role,can_manage_stock,can_count_stock)
  values(p_care_recipient_id,p_user_id,p_role,p_role<>'reader' and p_can_manage_stock,p_role<>'reader' and p_can_count_stock)
  on conflict(care_recipient_id,user_id) do update set role=excluded.role,can_manage_stock=excluded.can_manage_stock,can_count_stock=excluded.can_count_stock,status='active' returning * into v;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'membership.updated','care_recipient_membership',v.id,jsonb_build_object('care_recipient_id',p_care_recipient_id,'user_id',p_user_id,'role',p_role));
  return v;
end; $$;
create or replace function public.admin_set_membership_status(p_care_recipient_id uuid,p_user_id uuid,p_status text)
returns public.care_recipient_memberships language plpgsql security definer set search_path=public as $$
declare v public.care_recipient_memberships;
begin
  if not public.can_manage_recipient(p_care_recipient_id) then raise exception 'admin authorization required' using errcode='42501'; end if;
  if p_status is null or p_status not in ('active','revoked') then raise exception 'invalid membership status'; end if;
  update public.care_recipient_memberships set status=p_status where care_recipient_id=p_care_recipient_id and user_id=p_user_id returning * into v;
  if not found then raise exception 'membership not found'; end if;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'membership.status.changed','care_recipient_membership',v.id,jsonb_build_object('care_recipient_id',p_care_recipient_id,'user_id',p_user_id,'status',p_status));
  return v;
end; $$;

create or replace function public.admin_upsert_recipient_product(p_care_recipient_id uuid,p_product_id text,p_name text,p_category public.product_category,p_unit text,p_aliases text[],p_is_active boolean,p_description text default null,p_sort_order integer default 0)
returns public.care_recipient_products language plpgsql security definer set search_path=public,extensions as $$
declare v public.care_recipient_products; v_id text; v_old_unit text;
begin
  if not public.recipient_can(p_care_recipient_id,'admin') then raise exception 'catalogue admin authorization required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('catalogue:'||p_care_recipient_id,0));
  if p_name is null or length(trim(p_name)) not between 2 and 160 or p_category is null or p_unit is null or p_unit not in ('unidade','caixa','frasco','pacote','bisnaga','envelope','comprimido') then raise exception 'invalid product'; end if;
  if cardinality(coalesce(p_aliases,'{}'))>50 or exists(select 1 from unnest(p_aliases) a where a is null or length(trim(a)) not between 1 and 160) then raise exception 'invalid aliases'; end if;
  if exists(select 1 from public.care_recipient_products c cross join lateral unnest(array_append(c.aliases,c.name)) a
    where c.care_recipient_id=p_care_recipient_id and c.product_id is distinct from p_product_id
      and exists(select 1 from unnest(array_append(coalesce(p_aliases,'{}'),p_name)) b where unaccent(lower(trim(a)))=unaccent(lower(trim(b)))))
  then raise exception 'ambiguous product alias'; end if;
  v_id:=p_product_id;
  if v_id is null then
    v_id:='patient-'||gen_random_uuid()::text;
    insert into public.products(id,name,category,unit,aliases,is_active,owner_care_recipient_id) values(v_id,trim(p_name),p_category,p_unit,coalesce(p_aliases,'{}'),p_is_active,p_care_recipient_id);
  elsif not exists(select 1 from public.products where id=v_id and (owner_care_recipient_id is null or owner_care_recipient_id=p_care_recipient_id)) then raise exception 'product not available for patient'; end if;
  select unit into v_old_unit from public.care_recipient_products where care_recipient_id=p_care_recipient_id and product_id=v_id;
  if v_old_unit is distinct from p_unit and v_old_unit is not null and (
    exists(select 1 from public.requisition_items where care_recipient_id=p_care_recipient_id and product_id=v_id)
    or exists(select 1 from public.stock_movements where care_recipient_id=p_care_recipient_id and product_id=v_id)
    or exists(select 1 from public.stock_inventory_items where care_recipient_id=p_care_recipient_id and product_id=v_id)) then raise exception 'unit with operational history is immutable; create a new product'; end if;
  insert into public.care_recipient_products(care_recipient_id,product_id,name,description,category,unit,aliases,is_active,sort_order)
  values(p_care_recipient_id,v_id,trim(p_name),p_description,p_category,p_unit,coalesce(p_aliases,'{}'),p_is_active,p_sort_order)
  on conflict(care_recipient_id,product_id) do update set name=excluded.name,description=excluded.description,category=excluded.category,unit=excluded.unit,aliases=excluded.aliases,is_active=excluded.is_active,sort_order=excluded.sort_order,updated_at=now() returning * into v;
  insert into public.audit_events(actor_id,action,entity_type,metadata) values(auth.uid(),'patient.product.updated','care_recipient_product',jsonb_build_object('care_recipient_id',p_care_recipient_id,'product_id',v_id,'is_active',p_is_active));
  return v;
end; $$;
create or replace function public.admin_adopt_product(p_care_recipient_id uuid,p_product_id text)
returns public.care_recipient_products language plpgsql security definer set search_path=public as $$
declare p public.products;
begin
  if not public.recipient_can(p_care_recipient_id,'admin') then raise exception 'catalogue admin authorization required'; end if;
  select * into p from public.products where id=p_product_id and owner_care_recipient_id is null and is_active;
  if not found then raise exception 'template not found'; end if;
  if exists(select 1 from public.care_recipient_products where care_recipient_id=p_care_recipient_id and product_id=p.id) then raise exception 'template already adopted'; end if;
  return public.admin_upsert_recipient_product(p_care_recipient_id,p.id,p.name,p.category,p.unit,p.aliases,true);
end; $$;

-- No client can bypass the transactional writers or manufacture audit identities.
revoke all on all tables in schema public from anon,public,authenticated;
revoke all on all sequences in schema public from anon,public,authenticated;
revoke execute on all functions in schema public from anon,public,authenticated;
alter default privileges in schema public revoke all on tables from anon,authenticated,public;
alter default privileges in schema public revoke all on sequences from anon,authenticated,public;
alter default privileges in schema public revoke execute on functions from anon,authenticated,public;
grant select on public.profiles,public.care_recipients,public.products,public.care_recipient_products,
  public.care_recipient_memberships,public.requisitions,public.requisition_items,public.requisition_observations,
  public.requisition_status_history,public.stock_movements,public.current_stock_balances,public.stock_inventories,
  public.stock_inventory_items,public.requisition_notifications,public.audit_events to authenticated;
do $$ declare f record; begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('current_profile_role','is_global_administrator','recipient_role','can_access_recipient','can_manage_recipient','recipient_can','find_product_by_alias','submit_requisition','record_stock_movement','transition_requisition_status','admin_list_profiles','admin_set_profile','admin_list_recipients','admin_upsert_recipient','admin_list_products','admin_upsert_product','admin_upsert_membership','admin_set_membership_status','admin_upsert_recipient_product','admin_adopt_product','import_historical_requisitions','create_stock_inventory','add_stock_inventory_item','submit_stock_inventory','approve_stock_inventory','process_internal_notifications')
  loop execute format('grant execute on function %s to authenticated',f.signature); end loop;
end; $$;
