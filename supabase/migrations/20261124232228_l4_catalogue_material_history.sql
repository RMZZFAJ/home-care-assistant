create table private.catalogue_registration_events (
  id uuid primary key default gen_random_uuid(),
  care_recipient_id uuid not null references public.care_recipients(id),
  product_id text not null,
  actor_name text,
  previous jsonb,
  current jsonb not null,
  recorded_at timestamptz not null default clock_timestamp()
);
create index catalogue_registration_events_material
  on private.catalogue_registration_events(care_recipient_id, product_id, recorded_at desc, id);
alter table private.catalogue_registration_events enable row level security;
revoke all on private.catalogue_registration_events from public, anon, authenticated, service_role;
grant select on private.catalogue_registration_events to authenticated;
create policy catalogue_registration_events_read on private.catalogue_registration_events
  for select to authenticated using(private.can(care_recipient_id, 'catalog.manage'));
create trigger catalogue_registration_event_preserved
  before update or delete on private.catalogue_registration_events
  for each row execute function private.immutable_event();

create function private.catalogue_registration_values(item public.care_recipient_products)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'name', item.name, 'category', item.category, 'unit', item.unit,
    'decimals', item.quantity_decimals, 'aliases', item.aliases,
    'description', item.description, 'order', item.sort_order
  );
$$;

create function private.capture_catalogue_registration()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  previous_values jsonb;
  current_values jsonb := private.catalogue_registration_values(new);
begin
  if tg_op = 'UPDATE' then
    previous_values := private.catalogue_registration_values(old);
    if previous_values = current_values then return new; end if;
  end if;

  insert into private.catalogue_registration_events(care_recipient_id, product_id, actor_name, previous, current)
  values (new.care_recipient_id, new.product_id,
    (select full_name from public.profiles where id = auth.uid()), previous_values, current_values);
  return new;
end;
$$;
revoke all on function private.catalogue_registration_values(public.care_recipient_products),
  private.capture_catalogue_registration() from public, anon, authenticated, service_role;

-- Native identity and presentation events are already immutable. Capture the
-- registration fields here and let the official identity events describe status.
create trigger capture_catalogue_registration
  after insert or update of name, category, unit, quantity_decimals, aliases, description, sort_order
  on public.care_recipient_products for each row execute function private.capture_catalogue_registration();

create function public.catalogue_material_history(p_patient uuid, p_product text, p_page integer default 1)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  material jsonb;
  events jsonb;
  more boolean;
begin
  if private.can(p_patient, 'catalog.manage') is not true then
    raise exception 'catalogue history authority required' using errcode = '42501';
  end if;
  if p_product is null or length(p_product) not between 1 and 120
    or p_page is null or p_page not between 1 and 10000 then
    raise exception 'invalid catalogue history request' using errcode = '22023';
  end if;

  select jsonb_build_object('id', c.product_id, 'name', c.name, 'category', c.category, 'unit', c.unit, 'active', c.is_active)
    into material from public.care_recipient_products c
    where c.care_recipient_id = p_patient and c.product_id = p_product;
  if material is null then
    raise exception 'catalogue material unavailable' using errcode = 'PT404';
  end if;

  -- Only committed facts and explicit public-facing fields appear here. An
  -- observed pre-version presentation can serve as a comparison, not an event.
  with official as (
    select e.recorded_at, e.id::text as reference, jsonb_build_object(
      'kind', 'registration', 'actorName', e.actor_name, 'before', e.previous, 'after', e.current) as fact
    from private.catalogue_registration_events e
    where e.care_recipient_id = p_patient and e.product_id = p_product
    union all
    select e.recorded_at, e.id::text, jsonb_build_object(
      'kind', 'identity', 'actorName', e.actor_name, 'action', e.action, 'reason', e.reason,
      'before', jsonb_build_object('active', e.before_state->'source'->'is_active',
        'successorId', e.before_state->'guidance'->>'successor_product_id'),
      'after', jsonb_build_object('active', e.after_state->'source'->'is_active',
        'successorId', e.after_state->'guidance'->>'successor_product_id'))
    from public.catalogue_identity_events e
    where e.care_recipient_id = p_patient and e.product_id = p_product
    union all
    select v.recorded_at, v.presentation_id::text || '/v' || v.version, jsonb_build_object(
      'kind', 'presentation', 'actorName', v.definition->>'actorName', 'version', v.version,
      'before', case when prior.version is not null then jsonb_build_object(
        'name', prior.definition->>'name', 'code', prior.definition->>'barcode',
        'quantity', prior.definition->>'base_quantity', 'unit', prior.definition->>'unit',
        'active', prior.definition->'active') end,
      'after', jsonb_build_object(
        'name', v.definition->>'name', 'code', v.definition->>'barcode', 'quantity', v.definition->>'base_quantity',
        'unit', v.definition->>'unit', 'active', v.definition->'active'))
    from public.product_presentations p
    join public.product_presentation_versions v on v.presentation_id = p.id and v.care_recipient_id = p.care_recipient_id
    left join public.product_presentation_versions prior
      on prior.presentation_id = v.presentation_id and prior.care_recipient_id = v.care_recipient_id and prior.version = v.version - 1
    where p.care_recipient_id = p_patient and p.product_id = p_product
      and v.definition->'capturedExisting' is distinct from 'true'::jsonb
  ), page as (
    select recorded_at, reference, fact from official
    order by recorded_at desc, reference
    offset (p_page - 1) * 20 limit 21
  )
  select coalesce(jsonb_agg(fact || jsonb_build_object('reference', reference, 'recordedAt', recorded_at)
    order by recorded_at desc, reference), '[]'::jsonb)
  into events from page;

  more := jsonb_array_length(events) > 20;
  return jsonb_build_object('patientId', p_patient, 'material', material, 'page', p_page,
    'hasMore', more, 'data', case when more then events - 20 else events end);
end;
$$;
revoke all on function public.catalogue_material_history(uuid, text, integer) from public, anon, authenticated, service_role;
grant execute on function public.catalogue_material_history(uuid, text, integer) to authenticated;
