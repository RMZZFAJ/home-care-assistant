-- Issuance and its absolute count share one transaction. A count that already
-- matches the balance still has provenance, without a zero-quantity movement.
create table private.requisition_stock_counts (
  requisition_item_id uuid primary key references public.requisition_items(id),
  requisition_id uuid not null references public.requisitions(id),
  care_recipient_id uuid not null references public.care_recipients(id),
  product_id text not null,
  revision bigint generated always as identity,
  balance_before numeric(18,6) not null,
  counted_quantity numeric(18,6) not null check (counted_quantity >= 0),
  movement_id uuid unique references public.stock_movements(id),
  actor_id uuid not null references public.profiles(id),
  recorded_at timestamptz not null default clock_timestamp(),
  foreign key (care_recipient_id, product_id)
    references public.care_recipient_products(care_recipient_id, product_id),
  check ((balance_before = counted_quantity) = (movement_id is null))
);
create index requisition_stock_counts_latest
  on private.requisition_stock_counts (care_recipient_id, product_id, revision desc);
create index requisition_stock_counts_document
  on private.requisition_stock_counts (requisition_id);
alter table private.requisition_stock_counts enable row level security;
revoke all on private.requisition_stock_counts from public, anon, authenticated, service_role;

create function private.requisition_stock_reference(p_patient uuid, p_product text)
returns text language sql stable set search_path = '' as $$
  select encode(extensions.digest(jsonb_build_array(
    p_patient, p_product, product.unit, product.quantity_decimals,
    (select max(movement_revision) from public.stock_movements movement
     where movement.care_recipient_id = p_patient and movement.product_id = p_product
       and ('CARE_TEAM' in (movement.source_location, movement.destination_location))),
    (select max(revision) from private.requisition_stock_counts count
     where count.care_recipient_id = p_patient and count.product_id = p_product)
  )::text, 'sha256'), 'hex')
  from public.care_recipient_products product
  where product.care_recipient_id = p_patient and product.product_id = p_product
    and product.is_active;
$$;

create function private.record_requisition_stock_counts(p_document uuid, p_lines jsonb)
returns void language plpgsql set search_path = '' as $$
declare
  item public.requisition_items;
  previous_quantity numeric;
  difference numeric;
  stock_movement uuid;
begin
  -- The producer holds the patient stock lock and has checked the submitted references.
  for item in
    select i.* from public.requisition_items i
    join jsonb_array_elements(p_lines) line on line->>'productId' = i.product_id
    where i.requisition_id = p_document and line ? 'stockReference'
    order by i.product_id
  loop
    previous_quantity := private.stock_quantity(item.care_recipient_id, item.product_id, 'CARE_TEAM');
    difference := item.current_stock - previous_quantity;
    stock_movement := null;
    if difference <> 0 then
      insert into public.stock_movements (
        care_recipient_id, product_id, quantity, movement_type, performed_by,
        source_location, destination_location, justification, reference_type, reference_id
      ) values (
        item.care_recipient_id, item.product_id, abs(difference), 'adjustment', auth.uid(),
        case when difference < 0 then 'CARE_TEAM' end,
        case when difference > 0 then 'CARE_TEAM' end,
        'Contagem informada na emissão da requisição', 'requisition_count', p_document
      ) returning id into stock_movement;
    end if;
    insert into private.requisition_stock_counts (
      requisition_item_id, requisition_id, care_recipient_id, product_id,
      balance_before, counted_quantity, movement_id, actor_id
    ) values (
      item.id, p_document, item.care_recipient_id, item.product_id,
      previous_quantity, item.current_stock, stock_movement, auth.uid()
    );
  end loop;
end;
$$;

revoke all on function private.requisition_stock_reference(uuid, text),
  private.record_requisition_stock_counts(uuid, jsonb)
  from public, anon, authenticated, service_role;

-- Evolve the existing entry points and retain their identity, grants, and unrelated checks.
do $migration$
declare
  definition text;
  original text;
  signature regprocedure := 'public.requisition_item_context(uuid,text[])';
begin
  original := pg_get_functiondef(signature);
  definition := replace(original, '  can_read_team boolean;', '  can_read_team boolean; can_count boolean;');
  definition := replace(definition, '  can_read_team := private.can(p_patient, ''stock.team.read'');',
    '  can_read_team := private.can(p_patient, ''stock.team.read''); can_count := private.can(p_patient, ''req.create'');');
  definition := replace(definition, $from$      'pending', coalesce(($from$,
    $to$      'teamStockReference', case when can_count then
        private.requisition_stock_reference(p_patient, product.product_id) end,
      'pending', coalesce(($to$);
  if definition = original or strpos(definition, 'can_count :=') = 0
    or strpos(definition, '''teamStockReference''') = 0 then
    raise exception 'Unexpected requisition item context definition';
  end if;
  execute definition;
end;
$migration$;

do $migration$
declare
  definition text := pg_get_functiondef('private.submit_requisition_core(uuid,uuid,text,jsonb,jsonb,jsonb,uuid,integer,text)'::regprocedure);
begin
  if strpos(definition, $from$ order by z->>'productId') from jsonb_array_elements(p_lines) z)$from$) = 0
    or strpos(definition, $from$ perform private.record_document_event(d.id,'req.issued',intent,p_idempotency_key);$from$) = 0
    or strpos(definition, $from$ perform private.require_cap(p_care_recipient_id,'req.create');
 if p_source is not null then$from$) = 0
    or strpos(definition, $from$ perform private.validate_requisition_observation(x,p.quantity_decimals);$from$) = 0 then
    raise exception 'Unexpected requisition submission definition';
  end if;
  definition := replace(definition,
    $from$ order by z->>'productId') from jsonb_array_elements(p_lines) z)$from$,
    $to$ || case when z ? 'stockReference' then jsonb_build_object('stockReference',z->'stockReference') else '{}'::jsonb end
     order by z->>'productId') from jsonb_array_elements(p_lines) z)$to$);
  definition := replace(definition, $from$'stockObservationAt','urgent','repeatReason'$from$,
    $to$'stockObservationAt','urgent','repeatReason','stockReference'$to$);
  definition := replace(definition,
    $from$ perform private.require_cap(p_care_recipient_id,'req.create');
 if p_source is not null then$from$,
    $to$ perform private.require_cap(p_care_recipient_id,'req.create');
 if exists (select 1 from jsonb_array_elements(p_lines) line where line ? 'stockReference') then
   perform pg_advisory_xact_lock(hashtextextended('stock:'||p_care_recipient_id,0));
   perform private.require_cap(p_care_recipient_id,'req.create');
 end if;
 if p_source is not null then$to$);
  definition := replace(definition, $from$ perform private.validate_requisition_observation(x,p.quantity_decimals);$from$,
    $to$ perform private.validate_requisition_observation(x,p.quantity_decimals);
 if x ? 'stockReference' then
   if jsonb_typeof(x->'stockReference') is distinct from 'string'
      or x->>'stockReference' !~ '^[0-9a-f]{64}$'
      or private.requisition_stock_observation(x) <> 'observed' then
     raise exception 'invalid requisition stock reference' using errcode='22023';
   end if;
   if private.requisition_stock_reference(p_care_recipient_id,p.product_id)
      is distinct from x->>'stockReference' then
     raise exception 'requisition stock reference changed' using errcode='PT409';
   end if;
 end if;$to$);
  definition := replace(definition, $from$ perform private.record_document_event(d.id,'req.issued',intent,p_idempotency_key);$from$,
    $to$ perform private.record_requisition_stock_counts(d.id,p_lines);
 perform private.record_document_event(d.id,'req.issued',intent,p_idempotency_key);$to$);
  execute definition;
end;
$migration$;

do $migration$
declare
  definition text := pg_get_functiondef('public.commit_creation_draft(uuid,integer,uuid,jsonb,uuid)'::regprocedure);
  draft_validator text := pg_get_functiondef('private.validate_creation_draft(text,jsonb,uuid)'::regprocedure);
begin
  if strpos(definition, $from$'stockObservationAt','urgent','repeatReason'$from$) = 0
    or strpos(definition, $from$  extra:=p_body->'remainingNeed';$from$) = 0
    or strpos(draft_validator, $from$'stockObservationAt','urgent','repeatReason'$from$) = 0
    or strpos(draft_validator, $from$    or not private.creation_draft_text(x->'repeatReason',1000,true)$from$) = 0 then
    raise exception 'Unexpected requisition draft definition';
  end if;
  definition := replace(definition, $from$'stockObservationAt','urgent','repeatReason'$from$,
    $to$'stockObservationAt','urgent','repeatReason','stockReference'$to$);
  definition := replace(definition, $from$  extra:=p_body->'remainingNeed';$from$,
    $to$  if exists (
    select 1 from jsonb_array_elements(p_body->'lines') line
    where line ? 'stockReference' and not exists (
      select 1 from jsonb_array_elements(d.content->'lines') saved
      where saved->>'productId' = line->>'productId'
        and saved->'stockReference'->>'token' = line->>'stockReference'
        and saved->>'stockObservation' = 'observed'
        and replace(saved->>'currentStock', ',', '.')::numeric
          is not distinct from (line->>'currentStock')::numeric
    )
  ) then raise exception 'stale private draft revision' using errcode='PT409'; end if;
  extra:=p_body->'remainingNeed';$to$);
  draft_validator := replace(draft_validator, $from$'stockObservationAt','urgent','repeatReason'$from$,
    $to$'stockObservationAt','urgent','repeatReason','stockReference'$to$);
  draft_validator := replace(draft_validator,
    $from$    or not private.creation_draft_text(x->'repeatReason',1000,true)$from$,
    $to$    or (x ? 'stockReference' and (
      jsonb_typeof(x->'stockReference') is distinct from 'object'
      or (x->'stockReference'-array['token','quantity']) <> '{}'::jsonb
      or not coalesce((x->'stockReference'->>'token') ~ '^[0-9a-f]{64}$', false)
      or not coalesce(jsonb_typeof(x->'stockReference'->'quantity') = 'null'
        or (x->'stockReference'->>'quantity') ~ '^-?[0-9]{1,12}(\.[0-9]{1,6})?$', false)
    ))
    or not private.creation_draft_text(x->'repeatReason',1000,true)$to$);
  execute definition;
  execute draft_validator;
end;
$migration$;
