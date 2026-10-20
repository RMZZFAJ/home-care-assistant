create table if not exists public.requisition_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_hash text not null unique check (source_hash ~ '^[a-f0-9]{64}$'),
  imported_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  total_rows integer not null default 0 check (total_rows >= 0),
  imported_rows integer not null default 0 check (imported_rows >= 0),
  rejected_rows integer not null default 0 check (rejected_rows >= 0),
  report jsonb not null default '[]'::jsonb
);

create table if not exists public.historical_requisition_imports (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.requisition_import_batches(id) on delete cascade,
  physical_protocol integer not null check (physical_protocol between 1 and 11),
  requisition_id uuid not null unique references public.requisitions(id),
  row_hash text not null unique check (row_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);

alter table public.requisitions
  add column if not exists is_historical boolean not null default false;

drop trigger if exists requisition_notification_enqueue_trigger on public.requisitions;
create trigger requisition_notification_enqueue_trigger
after insert on public.requisitions
for each row when (new.is_historical is not true)
execute function public.enqueue_requisition_notifications();

create unique index if not exists requisitions_historical_protocol_unique
  on public.requisitions(protocol)
  where is_historical;

alter table public.requisition_import_batches enable row level security;
alter table public.historical_requisition_imports enable row level security;

create or replace function public.is_global_administrator()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
      and role = 'admin' and global_scope
  );
$$;

create or replace function public.admin_list_profiles()
returns table (id uuid, full_name text, role public.profile_role, status text, global_scope boolean, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select p.id, p.full_name, p.role, p.status, p.global_scope, p.created_at
  from public.profiles p
  where public.is_global_administrator()
  order by p.full_name;
$$;

create or replace function public.admin_set_profile(
  p_user_id uuid,
  p_full_name text,
  p_role public.profile_role,
  p_status text,
  p_global_scope boolean
) returns public.profiles
language plpgsql security definer set search_path = public
as $$
declare v_profile public.profiles;
begin
  if not public.is_global_administrator() then raise exception 'admin authorization required'; end if;
  if p_status not in ('active', 'revoked') or length(trim(p_full_name)) not between 2 and 160 then
    raise exception 'invalid profile';
  end if;
  update public.profiles
  set full_name = trim(p_full_name), role = p_role, status = p_status,
      global_scope = case when p_role in ('admin', 'supervisor') then p_global_scope else false end
  where id = p_user_id
  returning * into v_profile;
  if not found then raise exception 'profile not found'; end if;
  insert into public.audit_events(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'profile.updated', 'profile', p_user_id,
    jsonb_build_object('role', p_role, 'status', p_status, 'global_scope', p_global_scope));
  return v_profile;
end;
$$;

create or replace function public.admin_list_recipients()
returns setof public.care_recipients
language sql stable security definer set search_path = public
as $$ select r from public.care_recipients r where public.is_global_administrator() order by r.display_name; $$;

create or replace function public.admin_upsert_recipient(
  p_id uuid, p_display_name text, p_is_active boolean, p_is_development boolean
) returns public.care_recipients
language plpgsql security definer set search_path = public
as $$
declare v_recipient public.care_recipients;
begin
  if not public.is_global_administrator() then raise exception 'admin authorization required'; end if;
  if length(trim(p_display_name)) not between 2 and 160 then raise exception 'invalid recipient'; end if;
  insert into public.care_recipients(id, display_name, is_active, is_development)
  values (coalesce(p_id, gen_random_uuid()), trim(p_display_name), p_is_active, p_is_development)
  on conflict (id) do update set display_name = excluded.display_name,
    is_active = excluded.is_active, is_development = excluded.is_development
  returning * into v_recipient;
  insert into public.audit_events(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'recipient.updated', 'care_recipient', v_recipient.id,
    jsonb_build_object('is_active', p_is_active));
  return v_recipient;
end;
$$;

create or replace function public.admin_list_products()
returns setof public.products
language sql stable security definer set search_path = public
as $$ select p from public.products p where public.is_global_administrator() order by p.name; $$;

create or replace function public.admin_upsert_product(
  p_id text, p_name text, p_category public.product_category, p_unit text,
  p_aliases text[], p_is_active boolean
) returns public.products
language plpgsql security definer set search_path = public
as $$
declare v_product public.products;
begin
  if not public.is_global_administrator() then raise exception 'admin authorization required'; end if;
  if p_id !~ '^[a-z0-9][a-z0-9-]{1,119}$' or length(trim(p_name)) not between 2 and 160
     or p_unit not in ('unidade','caixa','frasco','pacote','bisnaga','envelope','comprimido')
  then raise exception 'invalid product'; end if;
  if exists (
    select 1
    from public.products x
    cross join lateral unnest(array_append(coalesce(x.aliases, '{}'), x.name)) existing_alias
    where x.id <> p_id
      and (
        unaccent(lower(trim(existing_alias))) = unaccent(lower(trim(p_name)))
        or exists (
          select 1 from unnest(coalesce(p_aliases, '{}')) incoming_alias
          where unaccent(lower(trim(incoming_alias))) = unaccent(lower(trim(existing_alias)))
        )
      )
  ) or exists (
    select 1 from unnest(coalesce(p_aliases, '{}')) a
    where unaccent(lower(trim(a))) = unaccent(lower(trim(p_name)))
  ) then raise exception 'ambiguous product alias'; end if;
  insert into public.products(id, name, category, unit, aliases, is_active)
  values (p_id, trim(p_name), p_category, p_unit, coalesce(p_aliases, '{}'), p_is_active)
  on conflict (id) do update set name=excluded.name, category=excluded.category,
    unit=excluded.unit, aliases=excluded.aliases, is_active=excluded.is_active
  returning * into v_product;
  insert into public.audit_events(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'product.updated', 'product', null,
    jsonb_build_object('product_id', p_id, 'is_active', p_is_active));
  return v_product;
end;
$$;

create or replace function public.admin_upsert_membership(
  p_care_recipient_id uuid, p_user_id uuid, p_role public.profile_role,
  p_can_manage_stock boolean, p_can_count_stock boolean
) returns public.care_recipient_memberships
language plpgsql security definer set search_path = public
as $$
declare v_membership public.care_recipient_memberships;
begin
  if not public.is_global_administrator() then raise exception 'admin authorization required'; end if;
  if not exists (select 1 from public.profiles where id=p_user_id and status='active')
     or not exists (select 1 from public.care_recipients where id=p_care_recipient_id)
  then raise exception 'invalid membership'; end if;
  insert into public.care_recipient_memberships(care_recipient_id,user_id,role,can_manage_stock,can_count_stock)
  values (p_care_recipient_id,p_user_id,p_role,p_can_manage_stock,p_can_count_stock)
  on conflict (care_recipient_id,user_id) do update set role=excluded.role,
    can_manage_stock=excluded.can_manage_stock, can_count_stock=excluded.can_count_stock
  returning * into v_membership;
  insert into public.audit_events(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'membership.updated', 'care_recipient_membership', v_membership.id,
    jsonb_build_object('care_recipient_id', p_care_recipient_id, 'user_id', p_user_id));
  return v_membership;
end;
$$;

create or replace function public.import_historical_requisitions(
  p_source_hash text,
  p_rows jsonb
) returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_batch public.requisition_import_batches;
  v_row jsonb;
  v_batch_id uuid;
  v_row_hash text;
  v_protocol text;
  v_recipient uuid;
  v_requisition uuid;
  v_imported integer := 0;
  v_rejected integer := 0;
  v_expected_lines integer;
  v_inserted_lines integer;
  v_report jsonb := '[]'::jsonb;
begin
  if not public.is_global_administrator() then raise exception 'admin authorization required'; end if;
  if p_source_hash is null or p_source_hash !~ '^[a-f0-9]{64}$'
     or p_rows is null or jsonb_typeof(p_rows) <> 'array'
     or jsonb_array_length(p_rows) > 1000 then
    raise exception 'invalid import payload';
  end if;
  select * into v_batch from public.requisition_import_batches where source_hash = p_source_hash;
  if found then
    return jsonb_build_object('batchId', v_batch.id, 'total', v_batch.total_rows,
      'imported', v_batch.imported_rows, 'rejected', v_batch.rejected_rows,
      'report', v_batch.report, 'replayed', true);
  end if;
  insert into public.requisition_import_batches(source_hash, imported_by, total_rows)
  values (p_source_hash, auth.uid(), jsonb_array_length(p_rows))
  returning id into v_batch_id;
  for v_row in select value from jsonb_array_elements(p_rows) loop
    begin
      if jsonb_typeof(v_row->'physicalProtocol') <> 'number'
         or (v_row->>'physicalProtocol') !~ '^[1-9]$|^1[01]$'
         or jsonb_typeof(v_row->'careRecipientId') <> 'string'
         or (v_row->>'careRecipientId') !~ '^[0-9a-fA-F-]{36}$'
         or jsonb_typeof(v_row->'lines') <> 'array'
         or jsonb_array_length(v_row->'lines') = 0
      then raise exception 'invalid row'; end if;
      v_protocol := 'HC-' || lpad((v_row->>'physicalProtocol')::integer::text, 6, '0');
      v_recipient := (v_row->>'careRecipientId')::uuid;
      if exists (select 1 from public.requisitions where protocol = v_protocol)
         or not exists (select 1 from public.care_recipients where id=v_recipient and is_active)
      then raise exception 'duplicate or invalid recipient'; end if;
      v_row_hash := encode(digest(v_row::text, 'sha256'), 'hex');
      if exists (select 1 from public.historical_requisition_imports where row_hash=v_row_hash)
      then raise exception 'row already imported'; end if;
      insert into public.requisitions(
        protocol, created_by, care_recipient_id, status, idempotency_key,
        payload_hash, is_historical, created_at, updated_at
      ) values (
        v_protocol, auth.uid(), v_recipient, 'delivered', gen_random_uuid(),
        v_row_hash, true,
        coalesce(nullif(v_row->>'createdAt','')::timestamptz, now()),
        coalesce(nullif(v_row->>'createdAt','')::timestamptz, now())
      ) returning id into v_requisition;
      select count(*) into v_expected_lines from jsonb_array_elements(v_row->'lines');
      if exists (
        select 1 from jsonb_array_elements(v_row->'lines') item
        where not exists (select 1 from public.products p where p.id=item->>'productId' and p.is_active)
          or (item->>'currentStock') !~ '^[0-9]+$'
      ) then raise exception 'invalid product line'; end if;
      insert into public.requisition_items(requisition_id, product_id, custom_name, current_stock, urgent)
      select v_requisition, item->>'productId', null, (item->>'currentStock')::integer,
        coalesce((item->>'urgent')::boolean, false)
      from jsonb_array_elements(v_row->'lines') item;
      get diagnostics v_inserted_lines = row_count;
      if v_inserted_lines <> v_expected_lines then raise exception 'invalid product line'; end if;
      insert into public.requisition_observations(requisition_id, created_by, body)
      select v_requisition, auth.uid(), value
      from jsonb_array_elements_text(coalesce(v_row->'observations','[]'::jsonb)) value
      where length(trim(value)) between 1 and 1000;
      insert into public.historical_requisition_imports(batch_id, physical_protocol, requisition_id, row_hash)
      values (v_batch_id, (v_row->>'physicalProtocol')::integer, v_requisition, v_row_hash);
      v_imported := v_imported + 1;
      v_report := v_report || jsonb_build_array(jsonb_build_object('row', v_row->>'physicalProtocol', 'status', 'imported'));
    exception when others then
      v_rejected := v_rejected + 1;
      v_report := v_report || jsonb_build_array(jsonb_build_object('row', v_row->>'physicalProtocol', 'status', 'rejected', 'reason', 'invalid or duplicate record'));
    end;
  end loop;
  update public.requisition_import_batches
  set imported_rows=v_imported, rejected_rows=v_rejected, report=v_report
  where id=v_batch_id;
  insert into public.audit_events(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'requisition.import.completed', 'requisition_import_batch', v_batch_id,
    jsonb_build_object('imported',v_imported,'rejected',v_rejected));
  return jsonb_build_object('batchId', v_batch_id, 'total', jsonb_array_length(p_rows),
    'imported', v_imported, 'rejected', v_rejected, 'report', v_report, 'replayed', false);
end;
$$;

revoke all on function public.import_historical_requisitions(text,jsonb) from public;
grant execute on function public.import_historical_requisitions(text,jsonb) to authenticated;

revoke all on function public.is_global_administrator() from public;
revoke all on function public.admin_list_profiles() from public;
revoke all on function public.admin_set_profile(uuid,text,public.profile_role,text,boolean) from public;
revoke all on function public.admin_list_recipients() from public;
revoke all on function public.admin_upsert_recipient(uuid,text,boolean,boolean) from public;
revoke all on function public.admin_list_products() from public;
revoke all on function public.admin_upsert_product(text,text,public.product_category,text,text[],boolean) from public;
revoke all on function public.admin_upsert_membership(uuid,uuid,public.profile_role,boolean,boolean) from public;
grant execute on function public.is_global_administrator() to authenticated;
grant execute on function public.admin_list_profiles() to authenticated;
grant execute on function public.admin_set_profile(uuid,text,public.profile_role,text,boolean) to authenticated;
grant execute on function public.admin_list_recipients() to authenticated;
grant execute on function public.admin_upsert_recipient(uuid,text,boolean,boolean) to authenticated;
grant execute on function public.admin_list_products() to authenticated;
grant execute on function public.admin_upsert_product(text,text,public.product_category,text,text[],boolean) to authenticated;
grant execute on function public.admin_upsert_membership(uuid,uuid,public.profile_role,boolean,boolean) to authenticated;
