create function private.register_com_purchase(
  p_id uuid, p_body jsonb, p_key uuid, p_version integer
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_patient uuid;
  v_line jsonb;
  v_arrivals jsonb;
  v_replay boolean;
  v_event_id uuid;
  v_receipt_id uuid;
  v_result jsonb;
begin
  select care_recipient_id into v_patient
    from public.operational_documents where id = p_id and type = 'COM';
  perform private.require_cap(v_patient, 'com.read');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('stock:' || v_patient::text, 0));

  if jsonb_typeof(p_body->'lines') is distinct from 'array' then
    raise exception 'invalid purchase lines' using errcode = '22023';
  end if;
  if (select count(distinct (value->>'lineId')::uuid)
      from jsonb_array_elements(p_body->'lines')) <> jsonb_array_length(p_body->'lines') then
    raise exception 'invalid or repeated purchase line' using errcode = '22023';
  end if;
  for v_line in select value from jsonb_array_elements(p_body->'lines') loop
    if v_line ? 'inHand' and jsonb_typeof(v_line->'inHand') is distinct from 'boolean' then
      raise exception 'invalid purchase timing' using errcode = '22023';
    end if;
    if v_line ? 'expectedDate' and (
      v_line->'inHand' = 'true'::jsonb
      or jsonb_typeof(v_line->'expectedDate') is distinct from 'string'
      or v_line->>'expectedDate' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      or not pg_catalog.pg_input_is_valid(v_line->>'expectedDate', 'date')
    ) then
      raise exception 'invalid expected arrival date' using errcode = '22023';
    end if;
  end loop;

  select exists (
    select 1 from public.document_events where actor_id = auth.uid() and idempotency_key = p_key
  ) into v_replay;
  v_result := public.fluent_pre_transfer_command(p_id, 'purchase', p_body, p_key, p_version);

  select jsonb_agg(jsonb_build_object('lineId', (line->>'lineId')::uuid, 'quantity', line->'quantity') order by ord)
    into v_arrivals
    from jsonb_array_elements(p_body->'lines') with ordinality as lines(line, ord)
    where line->'inHand' = 'true'::jsonb;
  if v_arrivals is null then
    return v_result;
  end if;

  -- The generated parent event ID identifies precisely this arrival. A replay
  -- of an older purchase can read an existing arrival but never create one.
  select id into strict v_event_id from public.document_events
    where actor_id = auth.uid() and idempotency_key = p_key and document_id = p_id;
  if not v_replay then
    v_result := public.fluent_pre_transfer_command(
      p_id, 'receive', jsonb_build_object('lines', v_arrivals),
      v_event_id, (v_result->>'version')::integer
    );
  end if;
  select id into v_receipt_id from public.purchase_receipts
    where document_id = p_id and submitted_by = auth.uid() and submission_key = v_event_id;
  if v_receipt_id is null and not v_replay then
    raise exception 'purchase arrival was not recorded' using errcode = '23514';
  end if;
  return v_result || jsonb_build_object('purchaseArrivalId', v_receipt_id);
end;
$$;
revoke all on function private.register_com_purchase(uuid,jsonb,uuid,integer) from public, anon, authenticated, service_role;

create or replace function public.supply_document_command(
  p_id uuid, p_action text, p_body jsonb, p_key uuid, p_version integer
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  t public.ent_transfers;
begin
  if p_action = 'apply_balance' then return private.command_bal_apply(p_id,p_body,p_key,p_version); end if;
  select * into t from public.ent_transfers where document_id = p_id;
  if found then
    perform private.require_cap(t.care_recipient_id,'ent.read');
    if p_action = 'submit' then return private.transfer_command(p_id,'dispatch',p_body,p_key,p_version); end if;
    if t.state in ('pending','agreed') and p_action = 'cancel' then return private.transfer_command(p_id,'withdraw',p_body,p_key,p_version); end if;
    if t.state <> 'dispatched' then raise exception 'transfer not dispatched; use its declaration decision' using errcode = 'PT409'; end if;
    if p_action = 'reassign' then raise exception 'bilateral transfer recipient is frozen; cancel and declare a new transfer' using errcode = '22023'; end if;
  end if;
  if p_action = 'purchase' then
    return private.register_com_purchase(p_id, p_body, p_key, p_version);
  end if;
  return public.fluent_pre_transfer_command(p_id,p_action,p_body,p_key,p_version);
end;
$$;

create function private.com_purchase_schedule(p_id uuid) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'eventId', e.id, 'lineId', (line->>'lineId')::uuid, 'quantity', line->'quantity',
    'expectedDate', line->'expectedDate', 'recordedAt', e.created_at
  ) order by e.version desc, ord), '[]'::jsonb)
  from public.document_events e
  cross join lateral jsonb_array_elements(e.body->'event'->'lines') with ordinality as lines(line, ord)
  where e.document_id = p_id and e.action = 'com.purchase'
    and line->'inHand' is distinct from 'true'::jsonb
    and jsonb_typeof(line->'expectedDate') = 'string'
    and line->>'expectedDate' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    and pg_catalog.pg_input_is_valid(line->>'expectedDate', 'date');
$$;
revoke all on function private.com_purchase_schedule(uuid) from public, anon, authenticated, service_role;

do $$
declare
  definition text := pg_get_functiondef('public.operational_document(uuid)'::regprocedure);
  anchor text := '''purchaseProgress'',private.purchase_progress(p_id),';
begin
  if strpos(definition, anchor) = 0 then
    raise exception 'COM projection anchor not found';
  end if;
  execute replace(definition, anchor, anchor || '''purchaseSchedule'',private.com_purchase_schedule(p_id),');
end;
$$;

do $$
declare
  definition text := pg_get_functiondef('public.execute_document_decision(uuid,uuid,jsonb)'::regprocedure);
  anchor text := 'perform private.require_supply_draft_scope(d.care_recipient_id,''COM'',action,p_document,true);';
begin
  if strpos(definition, anchor) = 0 then
    raise exception 'COM decision authority anchor not found';
  end if;
  execute replace(definition, anchor, anchor || $authority$
   if action = 'purchase' and outcome->>'purchaseArrivalId' is not null then
    perform private.require_cap(d.care_recipient_id, 'com.receive');
    if exists(select 1 from public.purchase_receipts
      where id = (outcome->>'purchaseArrivalId')::uuid and state = 'approved') then
      perform private.require_cap(d.care_recipient_id, 'com.validate');
    end if;
   end if;
  $authority$);
end;
$$;
