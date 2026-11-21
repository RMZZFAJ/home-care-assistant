-- Approved receipts preserve the physical count. Only the part that covers
-- the purchase belongs to the planning counters on the document line.
alter table public.purchase_receipts add column l2_arrival boolean not null default false;

create function private.com_receipt_totals(p_id uuid)
returns table(line_id uuid,pending_count bigint,pending_physical numeric,
  pending_coverage numeric,closed_short numeric,approved_excess numeric)
language sql stable set search_path = '' as $$
  with amounts as (
    select (item->>'lineId')::uuid as line_id,r.state,
      (item->>'quantity')::numeric as physical,
      case when r.l2_arrival then coalesce((item->>'expectedQuantity')::numeric,(item->>'quantity')::numeric)
        else (item->>'quantity')::numeric end as expected,
      r.l2_arrival and item->>'remainingAction' = 'short' as closes_short
    from public.purchase_receipts r cross join lateral jsonb_array_elements(r.lines) item
    where r.document_id=p_id and r.state in ('pending','approved')
  )
  select line_id,count(*) filter(where state='pending'),
    coalesce(sum(physical) filter(where state='pending'),0),
    coalesce(sum(case when closes_short then expected else least(expected,physical) end)
      filter(where state='pending'),0),
    coalesce(sum(greatest(expected-physical,0)) filter(where state='approved' and closes_short),0),
    coalesce(sum(greatest(physical-expected,0)) filter(where state='approved'),0)
  from amounts group by line_id;
$$;

create function private.require_com_receipt_lines(p_id uuid,p_lines jsonb) returns void
language plpgsql set search_path = '' as $$
declare
  item jsonb;
  remaining numeric;
  physical numeric;
  decision text;
begin
  if (select count(distinct (value->>'lineId')::uuid) from jsonb_array_elements(p_lines))
    <> jsonb_array_length(p_lines) then
    raise exception 'duplicate purchase receipt lines' using errcode='22023';
  end if;
  for item, remaining in
    with totals as materialized (select * from private.com_receipt_totals(p_id))
    select entry.value,l.purchased_quantity-l.accepted_quantity-coalesce(t.closed_short,0)-coalesce(t.pending_coverage,0)
      from jsonb_array_elements(p_lines) entry
      join public.document_lines l on l.document_id=p_id and l.id=(entry.value->>'lineId')::uuid
      left join totals t on t.line_id=l.id
  loop
    physical := (item->>'quantity')::numeric;
    decision := item->>'remainingAction';
    if remaining <= 0 then
      raise exception 'purchase line has no arrival remaining' using errcode='PT409';
    end if;
    if not (item ? 'expectedQuantity') then
      if item ?| array['remainingAction','excessConfirmed'] or physical <= 0 or physical > remaining then
        raise exception 'receipt exceeds purchased quantity or needs arrival confirmation' using errcode='22023';
      end if;
      continue;
    end if;
    if coalesce(item->>'expectedQuantity','') !~ '^[0-9]+([.][0-9]{1,6})?$' then
      raise exception 'invalid expected arrival quantity' using errcode='22023';
    end if;
    if (item->>'expectedQuantity')::numeric <> remaining then
      raise exception 'arrival reference changed' using errcode='PT409';
    end if;
    if physical < remaining then
      if coalesce(decision,'') not in ('wait','short') or item ? 'excessConfirmed' then
        raise exception 'short receipt needs a remainder decision' using errcode='22023';
      end if;
    elsif item ? 'remainingAction' or
      (physical>remaining and item->'excessConfirmed' is distinct from 'true'::jsonb) or
      (physical=remaining and item ? 'excessConfirmed') then
      raise exception 'invalid or unconfirmed receipt excess' using errcode='22023';
    end if;
  end loop;
end;
$$;

create or replace function private.purchase_progress(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with line_facts as (
    select l.*,coalesce(t.pending_count,0) pending_count,coalesce(t.pending_physical,0) pending_physical,
      coalesce(t.closed_short,0) closed_short,coalesce(t.approved_excess,0) approved_excess,
      greatest(l.purchased_quantity-l.accepted_quantity-coalesce(t.closed_short,0),0) physical_remaining,
      coalesce(t.pending_coverage,0) pending_coverage
    from public.document_lines l left join private.com_receipt_totals(p_id) t on t.line_id=l.id
    where l.document_id=p_id
  ), facts as (
    select coalesce(bool_or(approved_quantity>purchased_quantity+waived_quantity),false) expectation_pending,
      coalesce(bool_or(physical_remaining>0),false) physical_pending,
      coalesce(bool_or(pending_count>0),false) validation_pending,
      coalesce(bool_or(closed_short>0),false) shortage_closed,
      coalesce(jsonb_agg(jsonb_build_object('lineId',id,'name',name_snapshot,'unit',unit_snapshot,
        'plannedQuantity',quantity,'approvedQuantity',approved_quantity,'purchasedQuantity',purchased_quantity,
        'validatedQuantity',accepted_quantity+approved_excess,'pendingValidationQuantity',pending_physical,
        'unarrivedQuantity',greatest(physical_remaining-pending_coverage,0),
        'closedShortQuantity',closed_short,'approvedExcessQuantity',approved_excess,
        'waivedQuantity',waived_quantity,'waivableQuantity',greatest(approved_quantity-purchased_quantity-waived_quantity,0),
        'remainingExpectation',greatest(approved_quantity-purchased_quantity-waived_quantity,0))
        order by category_snapshot,name_snapshot,id),'[]') lines
    from line_facts
  )
  select jsonb_build_object('expectationClosed',d.workflow_data ? 'purchaseExpectationClosure',
    'expectationPending',f.expectation_pending,'physicalPending',f.physical_pending,'validationPending',f.validation_pending,
    'state',case when d.status in ('draft','pending_approval','rejected','cancelled') then d.status
      when d.workflow_data ? 'purchaseExpectationClosure' and f.validation_pending then 'closed_pending_validation'
      when d.workflow_data ? 'purchaseExpectationClosure' and f.physical_pending then 'closed_pending_arrival'
      when not f.expectation_pending and not f.physical_pending and not f.validation_pending
        and (d.workflow_data ? 'purchaseExpectationClosure' or f.shortage_closed) then 'closed_below_quantity'
      when f.validation_pending then 'pending_validation' else d.status end,
    'closure',d.workflow_data->'purchaseExpectationClosure','lines',f.lines)
  from public.operational_documents d cross join facts f where d.id=p_id and d.type='COM';
$$;

create or replace function private.credit_purchase_receipt(p_receipt uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.purchase_receipts;
  d public.operational_documents;
  item jsonb;
  l public.document_lines;
  physical numeric;
  planned numeric;
  precision_limit integer;
begin
  select * into strict r from public.purchase_receipts where id=p_receipt for update;
  if r.state='approved' then return; end if;
  if r.state<>'pending' then raise exception 'receipt not pending'; end if;
  select * into strict d from public.operational_documents where id=r.document_id;
  perform private.require_cap(d.care_recipient_id,'com.validate');
  for item in select value from jsonb_array_elements(r.lines) loop
    select * into strict l from public.document_lines where id=(item->>'lineId')::uuid and document_id=d.id;
    select quantity_decimals into strict precision_limit from public.care_recipient_products
      where care_recipient_id=d.care_recipient_id and product_id=l.product_id;
    physical := (item->>'quantity')::numeric;
    planned := case when r.l2_arrival then least(physical,coalesce((item->>'expectedQuantity')::numeric,physical)) else physical end;
    if physical is null or physical<0 or physical>1000000000 or physical<>round(physical,precision_limit)
      or (physical=0 and (not r.l2_arrival or coalesce(item->>'remainingAction','') not in ('wait','short')))
      or l.accepted_quantity+planned>l.purchased_quantity then
      raise exception 'invalid receipt quantity';
    end if;
    if physical>0 then
      perform private.move_stock(d.care_recipient_id,l.product_id,physical,null,'FAMILY',
        'Recebimento COM validado','purchase_receipt',r.id);
      update public.document_lines set accepted_quantity=accepted_quantity+planned where id=l.id;
    end if;
  end loop;
  update public.purchase_receipts set state='approved',validated_by=auth.uid(),validated_at=clock_timestamp() where id=r.id;
  perform private.refresh_purchase_progress(d.id);
  perform private.require_cap(d.care_recipient_id,'com.validate');
end;
$$;

revoke all on function private.com_receipt_totals(uuid),private.require_com_receipt_lines(uuid,jsonb)
  from public,anon,authenticated,service_role;

-- Retain the native transaction, authorization, event and idempotency chain.
do $$
declare
  definition text := pg_get_functiondef('public.audited_legacy_supply_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
  start_marker text := $anchor$ if (select count(distinct entry.value->>'lineId') from jsonb_array_elements(p_body->'lines') entry)<>jsonb_array_length(p_body->'lines') then raise exception 'duplicate lines';end if;$anchor$;
  end_marker text := ' insert into public.purchase_receipts(document_id,submitted_by,state,lines,submission_key)';
  insert_statement text := 'insert into public.purchase_receipts(document_id,submitted_by,state,lines,submission_key) values(p_id,auth.uid(),''pending'',p_body->''lines'',p_key) returning id into r_id;';
  receive_at integer := strpos(definition,'elsif d.type=''COM'' and p_action=''receive'' then');
  first_at integer := strpos(substr(definition,receive_at),start_marker);
  last_at integer := strpos(definition,end_marker);
begin
  if receive_at=0 or first_at=0 or last_at<=receive_at+first_at-1 or strpos(definition,insert_statement)=0 then
    raise exception 'COM receive anchors not found';
  end if;
  definition := substr(definition,1,receive_at+first_at-2)
    || ' perform private.require_com_receipt_lines(p_id,p_body->''lines'');' || chr(10)
    || substr(definition,last_at);
  execute replace(definition,insert_statement,$insert$
    insert into public.purchase_receipts(document_id,submitted_by,state,lines,submission_key,l2_arrival)
    values(p_id,auth.uid(),'pending',p_body->'lines',p_key,
      exists(select 1 from jsonb_array_elements(p_body->'lines') item where item ? 'expectedQuantity'))
    returning id into r_id;
  $insert$);
end;
$$;

-- ENT can source every unit actually credited by this COM, including a
-- stated excess, within the available family stock and existing source rules.
do $$
declare
  definition text;
  original text;
begin
  definition := pg_get_functiondef('private.supply_source_materials(uuid,uuid,text)'::regprocedure);
  original := definition;
  definition := replace(definition,'l.accepted_quantity','(l.accepted_quantity+coalesce(arrival.approved_excess,0))');
  definition := replace(definition,
    'from public.document_lines l',
    'from public.document_lines l left join private.com_receipt_totals(p_id) arrival on arrival.line_id=l.id');
  if definition=original or strpos(definition,'private.com_receipt_totals(p_id)')=0 then
    raise exception 'COM source projection anchors not found';
  end if;
  execute definition;

  definition := pg_get_functiondef('private.require_supply_purchase_capacity(uuid,jsonb,jsonb)'::regprocedure);
  original := definition;
  definition := replace(definition,'sum(line.accepted_quantity)','sum(line.accepted_quantity+coalesce(arrival.approved_excess,0))');
  definition := replace(definition,'group by material.value',
    'left join lateral private.com_receipt_totals(d.id) arrival on arrival.line_id=line.id group by material.value');
  if definition=original or strpos(definition,'private.com_receipt_totals(d.id)')=0 then
    raise exception 'COM source capacity anchors not found';
  end if;
  execute definition;
end;
$$;

-- A zero-quantity shortage decision has no stock snapshot or PDF entry.
do $$
declare
  definition text;
  anchor text;
begin
  definition := pg_get_functiondef('private.capture_purchase_entry_balance()'::regprocedure);
  anchor := 'group by l.id,l.product_id,l.name_snapshot,l.unit_snapshot';
  if strpos(definition,anchor)=0 then raise exception 'COM capture anchor not found'; end if;
  execute replace(definition,anchor,'where (x->>''quantity'')::numeric>0 ' || anchor);

  definition := pg_get_functiondef('private.purchase_entry_balance_facts(uuid,integer)'::regprocedure);
  anchor := 'group by a.event_id,a.event_version,a.receipt,y->>''lineId''';
  if strpos(definition,anchor)=0 then raise exception 'COM entry fact anchor not found'; end if;
  definition := replace(definition,anchor,'where (y->>''quantity'')::numeric>0 ' || anchor);
  anchor := 'l->>''lineId''=v_line->>''id''';
  if strpos(definition,anchor)=0 then raise exception 'COM entry presence anchor not found'; end if;
  execute replace(definition,anchor,anchor || ' and (l->>''quantity'')::numeric>0');
end;
$$;
