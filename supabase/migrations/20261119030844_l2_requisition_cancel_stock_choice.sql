-- Both writers take the patient stock lock. Record the elapsed-time instant
-- at application, including a count that does not need a ledger movement.
do $migration$
declare
  bal_definition text := pg_get_functiondef('private.apply_bal(uuid)'::regprocedure);
  inventory_definition text := pg_get_functiondef('public.approve_stock_inventory(uuid)'::regprocedure);
begin
  if strpos(bal_definition, 'at_time timestamptz:=statement_timestamp()') = 0
    or strpos(inventory_definition, 'approved_at=now()') = 0 then
    raise exception 'Unexpected absolute stock application timestamps';
  end if;
  execute replace(bal_definition,
    'at_time timestamptz:=statement_timestamp()', 'at_time timestamptz:=clock_timestamp()');
  execute replace(inventory_definition, 'approved_at=now()', 'approved_at=clock_timestamp()');
end;
$migration$;

create unique index stock_requisition_count_reversal_once
  on public.stock_movements (reference_id, product_id)
  where reference_type = 'requisition_count_reversal';

create function private.requisition_cancellation_stock(p_id uuid, p_include_stock boolean)
returns jsonb language sql stable set search_path = '' as $$
  with counts as materialized (
    select c.*, i.product_name_snapshot as name, i.unit_snapshot as unit
    from private.requisition_stock_counts c
    join public.requisition_items i on i.id = c.requisition_item_id
    where c.requisition_id = p_id and c.movement_id is not null
  ), quantities as (
    select c.*, private.stock_quantity(c.care_recipient_id, c.product_id, 'CARE_TEAM') as current,
      p.unit as current_unit, p.quantity_decimals,
      private.requisition_stock_reference(c.care_recipient_id, c.product_id) as stock_reference,
      case
        when exists (
          select 1 from public.stock_movements m where m.reference_type = 'requisition_count_reversal'
            and m.reference_id = p_id and m.product_id = c.product_id
        ) then 'already_reversed'
        when exists (
          select 1 from private.requisition_stock_counts next_count
          where next_count.care_recipient_id = c.care_recipient_id
            and next_count.product_id = c.product_id and next_count.revision > c.revision
        ) or exists (
          select 1 from private.balance_applications a
          where a.care_recipient_id = c.care_recipient_id and a.applied_at > c.recorded_at
            and a.lines @> jsonb_build_array(jsonb_build_object('productId', c.product_id))
        ) or exists (
          select 1 from public.stock_inventories inventory
          join public.stock_inventory_items item on item.inventory_id = inventory.id and item.product_id = c.product_id
          where inventory.care_recipient_id = c.care_recipient_id and inventory.location = 'CARE_TEAM'
            and inventory.status = 'approved' and inventory.approved_at > c.recorded_at
        ) then 'later_count'
        when p.unit is distinct from c.unit or not p.is_active then 'material_changed'
      end as prior_block
    from counts c
    join public.care_recipient_products p
      on p.care_recipient_id = c.care_recipient_id and p.product_id = c.product_id
    where p_include_stock
  ), comparison as (
    select q.*, q.current + q.balance_before - q.counted_quantity as reversed,
      coalesce(q.prior_block, case
        when q.current + q.balance_before - q.counted_quantity < 0 then 'insufficient_stock'
        when round(q.balance_before - q.counted_quantity, q.quantity_decimals) <> q.balance_before - q.counted_quantity
          then 'material_changed'
        when q.current + q.balance_before - q.counted_quantity >= 1000000000000 then 'stock_limit'
      end) as block
    from quantities q
  ), detail as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'productId', product_id, 'name', coalesce(name, product_id), 'unit', unit, 'currentUnit', current_unit,
      'beforeIssuance', balance_before::text, 'counted', counted_quantity::text, 'current', current::text,
      'afterReversal', case when block is null then reversed::text end, 'block', block
    ) order by product_id), '[]'::jsonb) as lines,
    coalesce(jsonb_agg(jsonb_build_array(revision, stock_reference) order by product_id), '[]'::jsonb) as revisions,
    coalesce(bool_and(block is null), false) as can_reverse
    from comparison
  )
  select case when exists (select 1 from counts) then jsonb_build_object(
    'reference', encode(extensions.digest(jsonb_build_array(p_id, p_include_stock, lines, revisions)::text, 'sha256'), 'hex'),
    'canReadStock', p_include_stock, 'canReverse', can_reverse, 'lines', lines
  ) end
  from detail;
$$;

create or replace function public.requisition_decision_context(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  document_reference jsonb := private.requisition_decision_reference(p_id);
  patient uuid := (document_reference->>'patientId')::uuid;
  comparison jsonb;
begin
  if private.can(patient, 'req.review') and private.can(patient, 'req.create')
    and document_reference->>'status' <> 'cancelled'
    and document_reference->>'archivedAt' is null and document_reference->>'completedAt' is null then
    comparison := private.requisition_cancellation_stock(p_id, coalesce(private.can(patient, 'stock.team.read'), false));
  end if;
  if comparison is not null then
    return document_reference || jsonb_build_object('stockCancellation', comparison);
  end if;
  return document_reference;
end;
$$;

create function private.transition_requisition_cancellation(
  p_id uuid, p_to_status public.requisition_status, p_reason text, p_choice text, p_reference text
) returns public.requisitions language plpgsql set search_path = '' as $$
declare
  patient uuid;
  preview jsonb;
  line jsonb;
  difference numeric;
  requisition public.requisitions;
begin
  if p_to_status <> 'cancelled' then
    raise exception 'requisition progress is derived from confirmed events';
  end if;
  select care_recipient_id into patient from public.requisitions where id = p_id;
  perform private.require_cap(patient, 'req.review');
  perform pg_advisory_xact_lock(hashtextextended('stock:' || patient, 0));
  if exists (
    select 1 from public.requisition_lifecycle
    where requisition_id = p_id and (completed_at is not null or archived_at is not null)
  ) then
    raise exception 'completed requisition requires compensating operations';
  end if;
  if exists (
    select 1 from public.document_request_links k
    join public.requisition_items i on i.id = k.requisition_item_id
    join public.document_lines l on l.id = k.document_line_id
    join public.operational_documents d on d.id = l.document_id
    where i.requisition_id = p_id and d.status <> 'cancelled' and d.type = 'ENT'
  ) then
    raise exception 'resolve linked deliveries before cancellation';
  end if;
  preview := private.requisition_cancellation_stock(p_id, coalesce(private.can(patient, 'stock.team.read'), false));
  if preview is null then
    if p_choice is not null or p_reference is not null then
      raise exception 'stock cancellation reference does not apply' using errcode = '22023';
    end if;
    return public.v3_transition_requisition_status(p_id, p_to_status, p_reason);
  end if;
  perform private.require_req_decision_authority(patient, 'cancel');
  if p_choice is null or p_choice not in ('keep', 'reverse')
    or p_reference is distinct from preview->>'reference' then
    raise exception 'requisition cancellation stock reference changed or missing' using errcode = 'PT409';
  end if;
  if p_choice = 'reverse' then
    perform private.require_cap(patient, 'stock.team.read');
    if not (preview->>'canReverse')::boolean then
      raise exception 'requisition cancellation stock reversal is unavailable' using errcode = 'PT409';
    end if;
  end if;
  requisition := public.legacy_transition_requisition_status(p_id, p_to_status, p_reason);
  if p_choice = 'reverse' then
    for line in select value from jsonb_array_elements(preview->'lines') loop
      difference := (line->>'beforeIssuance')::numeric - (line->>'counted')::numeric;
      insert into public.stock_movements (
        care_recipient_id, product_id, quantity, movement_type, performed_by,
        source_location, destination_location, justification, reference_type, reference_id
      ) values (
        patient, line->>'productId', abs(difference), 'adjustment', auth.uid(),
        case when difference < 0 then 'CARE_TEAM' end, case when difference > 0 then 'CARE_TEAM' end,
        'Reversão do ajuste de estoque da emissão da requisição', 'requisition_count_reversal', p_id
      );
    end loop;
  end if;
  update public.operational_documents set status = requisition.status::text, version = version + 1 where id = p_id;
  perform private.record_document_event(p_id, 'req.status',
    jsonb_build_object('status', p_to_status, 'reason', p_reason, 'stockChoice', p_choice), gen_random_uuid());
  if p_choice = 'reverse' then
    perform private.require_cap(patient, 'stock.team.read');
  end if;
  return requisition;
end;
$$;

revoke all on function private.requisition_cancellation_stock(uuid, boolean),
  private.transition_requisition_cancellation(uuid, public.requisition_status, text, text, text)
  from public, anon, authenticated, service_role;

create or replace function public.transition_requisition_status(
  p_requisition_id uuid, p_to_status public.requisition_status, p_reason text default null
) returns public.requisitions language sql security definer set search_path = '' as $$
  select private.transition_requisition_cancellation(p_requisition_id, p_to_status, p_reason, null, null);
$$;

do $migration$
declare
  definition text := pg_get_functiondef('public.execute_document_decision(uuid,uuid,jsonb)'::regprocedure);
  previous_fields constant text := $old$   or (body-array['reason','itemId','productId'])<>'{}'::jsonb$old$;
  previous_call constant text := $old$   select to_jsonb(public.transition_requisition_status(p_document,'cancelled',body->>'reason')) into outcome;$old$;
begin
  if strpos(definition, previous_fields) = 0 or strpos(definition, previous_call) = 0 then
    raise exception 'Unexpected requisition decision dispatcher';
  end if;
  definition := replace(definition, previous_fields, $new$   or (body-array['reason','itemId','productId','stockChoice','stockReference'])<>'{}'::jsonb
   or ((body ? 'stockChoice') <> (body ? 'stockReference'))
   or (body ? 'stockChoice' and (action <> 'cancel'
     or coalesce(body->>'stockChoice','') not in ('keep','reverse')
     or coalesce(body->>'stockReference','') !~ '^[a-f0-9]{64}$'))$new$);
  execute replace(definition, previous_call, $new$   select to_jsonb(private.transition_requisition_cancellation(
     p_document,'cancelled',body->>'reason',body->>'stockChoice',body->>'stockReference')) into outcome;
   if body ? 'stockChoice' then
     outcome := outcome || jsonb_build_object('stockChoice',body->'stockChoice');
   end if;$new$);
end;
$migration$;
