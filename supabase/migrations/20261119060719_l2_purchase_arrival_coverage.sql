alter table public.document_lines add column covered_quantity numeric(18,6) not null default 0,
  add column associated_quantity numeric(18,6) not null default 0,
  add constraint document_lines_purchase_coverage check (
    associated_quantity>=0 and covered_quantity>=associated_quantity
    and (covered_quantity=0 or purchased_quantity+waived_quantity+covered_quantity<=approved_quantity)
  );

create table private.purchase_arrival_allocations (
  id uuid primary key default gen_random_uuid(),
  source_receipt_id uuid references public.purchase_receipts(id),
  source_che_id uuid references private.unlinked_arrivals(id),
  source_line_id uuid not null,
  target_line_id uuid not null references public.document_lines(id),
  primary_association boolean not null,
  planning_quantity numeric(18,6) not null check (planning_quantity>=0),
  arrival_quantity numeric(18,6) not null check (arrival_quantity>=0),
  recorded_at timestamptz not null default clock_timestamp(),
  check (num_nonnulls(source_receipt_id,source_che_id)=1 and planning_quantity+arrival_quantity>0),
  check (primary_association and source_che_id is not null or not primary_association and arrival_quantity=0),
  unique (source_receipt_id,source_line_id,target_line_id),
  unique (source_che_id,source_line_id,target_line_id)
);
create index purchase_arrival_allocations_target on private.purchase_arrival_allocations (target_line_id,recorded_at desc);
alter table private.purchase_arrival_allocations enable row level security;
revoke all on private.purchase_arrival_allocations from public,anon,authenticated,service_role;

-- A primary association may receive units already bought and cover the
-- rest of its open expectation. Earlier plans can only use the latter.
create function private.purchase_arrival_capacity(p_document uuid,p_line uuid)
returns table(planning numeric,waiting numeric)
language sql stable set search_path='' as $$
  select greatest(l.approved_quantity-l.purchased_quantity-l.waived_quantity-l.covered_quantity,0),
    greatest(l.purchased_quantity-l.accepted_quantity-coalesce(t.closed_short,0)-coalesce(t.pending_coverage,0),0)
  from public.document_lines l
  left join private.com_receipt_totals(p_document) t on t.line_id=l.id
  where l.id=p_line and l.document_id=p_document;
$$;

create function public.purchase_arrival_targets(p_patient uuid,p_product text,p_source uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  source_number bigint;
  result jsonb;
begin
  if private.auth_session() is null then raise exception 'active session required' using errcode='42501'; end if;
  perform private.require_cap(p_patient,'com.read');
  perform private.require_cap(p_patient,'com.receive');
  if p_source is not null then
    select d.number into source_number from public.operational_documents d
      where d.id=p_source and d.care_recipient_id=p_patient and d.type='COM'
        and exists (select 1 from public.document_lines l where l.document_id=d.id and l.product_id=p_product);
    if source_number is null then raise exception 'purchase source unavailable' using errcode='42501'; end if;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'documentId',d.id,'lineId',l.id,'code',d.code,'createdAt',d.created_at,'unit',l.unit_snapshot,
    'openPlanning',trim_scale(cap.planning)::text,'waitingArrival',trim_scale(cap.waiting)::text
  ) order by d.number desc,l.id),'[]'::jsonb) into result
  from public.operational_documents d join public.document_lines l on l.document_id=d.id
  cross join lateral private.purchase_arrival_capacity(d.id,l.id) cap
  where d.care_recipient_id=p_patient and d.type='COM' and d.number is not null and l.product_id=p_product
    and d.status in ('approved','partially_approved','purchasing','purchased','partially_received')
    and (p_source is null and cap.planning+cap.waiting>0 or p_source is not null and d.number<source_number and cap.planning>0);
  return result;
end;
$$;

create function private.apply_purchase_arrival_allocation(p_patient uuid,p_product text,p_unit text,
  p_origin uuid,p_source_receipt uuid,p_che uuid,p_source_line uuid,p_ref jsonb,p_received numeric,
  p_primary boolean,p_apply boolean) returns uuid
language plpgsql set search_path='' as $$
declare
  target public.operational_documents;
  line public.document_lines;
  origin_number bigint;
  cap record;
  requested numeric;
  arrived numeric;
  planned numeric;
  precision_limit integer;
begin
  if jsonb_typeof(p_ref) is distinct from 'object'
    or not coalesce(pg_input_is_valid(p_ref->>'documentId','uuid'),false)
    or not coalesce(pg_input_is_valid(p_ref->>'lineId','uuid'),false) then
    raise exception 'invalid purchase coverage target' using errcode='22023';
  end if;
  if p_primary then
    if (p_ref-array['documentId','lineId'])<>'{}'::jsonb then
      raise exception 'invalid purchase arrival association' using errcode='22023';
    end if;
    requested := p_received;
  else
    if (p_ref-array['documentId','lineId','quantity'])<>'{}'::jsonb
      or jsonb_typeof(p_ref->'quantity') is distinct from 'string'
      or coalesce(p_ref->>'quantity','') !~ '^[0-9]{1,10}([.][0-9]{1,6})?$' then
      raise exception 'invalid purchase coverage quantity' using errcode='22023';
    end if;
    requested := (p_ref->>'quantity')::numeric;
  end if;
  select quantity_decimals into strict precision_limit from public.care_recipient_products
    where care_recipient_id=p_patient and product_id=p_product;
  if requested<=0 or requested>p_received or requested<>round(requested,precision_limit) then
    raise exception 'invalid purchase coverage quantity' using errcode='22023';
  end if;

  select * into target from public.operational_documents where id=(p_ref->>'documentId')::uuid
    and type='COM' and care_recipient_id=p_patient for update;
  if not found or target.status not in ('approved','partially_approved','purchasing','purchased','partially_received') then
    raise exception 'purchase coverage changed' using errcode='PT409';
  end if;
  if not p_primary then
    select d.number into origin_number from public.operational_documents d where id=p_origin and care_recipient_id=p_patient and type='COM';
    if origin_number is null or target.number is null or target.number>=origin_number then
      raise exception 'coverage requires an earlier purchase' using errcode='22023';
    end if;
  end if;
  select * into line from public.document_lines where id=(p_ref->>'lineId')::uuid and document_id=target.id
    and product_id=p_product and unit_snapshot=p_unit for update;
  if not found then raise exception 'purchase coverage changed' using errcode='PT409'; end if;
  select * into strict cap from private.purchase_arrival_capacity(target.id,line.id);
  arrived := case when p_primary then least(requested,cap.waiting) else 0 end;
  planned := requested-arrived;
  if planned>cap.planning then raise exception 'purchase coverage changed' using errcode='PT409'; end if;
  if p_apply then
    perform private.require_cap(p_patient,'com.read');
    perform private.require_cap(p_patient,'com.validate');
    insert into private.purchase_arrival_allocations (source_receipt_id,source_che_id,source_line_id,target_line_id,
      primary_association,planning_quantity,arrival_quantity)
    values (p_source_receipt,p_che,p_source_line,line.id,p_primary,planned,arrived);
    update public.document_lines set covered_quantity=covered_quantity+planned,accepted_quantity=accepted_quantity+arrived,
      associated_quantity=associated_quantity+case when p_primary then planned else 0 end where id=line.id;
  end if;
  return target.id;
end;
$$;

-- Freeze each affected purchase after every allocation of this declaration
-- exists, so both sides of a CHE association have the same historical links.
create function private.record_purchase_arrival_allocations(p_receipt uuid,p_che uuid) returns void
language plpgsql set search_path='' as $$
declare affected record;
begin
  for affected in
    select line.document_id,jsonb_agg(jsonb_build_object(
      'lineId',line.id,'primaryAssociation',a.primary_association,
      'planningQuantity',trim_scale(a.planning_quantity)::text,'arrivalQuantity',trim_scale(a.arrival_quantity)::text
    ) order by line.id) as materials
    from private.purchase_arrival_allocations a join public.document_lines line on line.id=a.target_line_id
    where a.source_receipt_id=p_receipt or a.source_che_id=p_che
    group by line.document_id order by line.document_id
  loop
    update public.operational_documents set version=version+1 where id=affected.document_id;
    perform private.refresh_purchase_progress(affected.document_id);
    perform private.record_document_event(affected.document_id,'com.arrival_coverage',
      jsonb_build_object('sourceReceiptId',p_receipt,'sourceArrivalId',p_che,'materials',affected.materials),gen_random_uuid());
  end loop;
end;
$$;

create function private.cover_purchase_receipt() returns trigger language plpgsql set search_path='' as $$
declare
  d public.operational_documents;
  material public.document_lines;
  item jsonb;
  apply boolean;
begin
  if new.state not in ('pending','approved') or (tg_op='UPDATE' and new.state=old.state and new.lines=old.lines) then return new; end if;
  if not exists (select 1 from jsonb_array_elements(new.lines) j where j ? 'coverage') then return new; end if;
  apply := new.state='approved';
  select * into strict d from public.operational_documents where id=new.document_id and type='COM';
  perform private.require_cap(d.care_recipient_id,'com.read');
  for item in select value from jsonb_array_elements(new.lines) where value ? 'coverage' loop
    select * into strict material from public.document_lines where id=(item->>'lineId')::uuid and document_id=d.id;
    perform private.apply_purchase_arrival_allocation(d.care_recipient_id,material.product_id,material.unit_snapshot,d.id,
      new.id,null,material.id,item->'coverage',(item->>'quantity')::numeric,false,apply);
  end loop;
  if apply then perform private.record_purchase_arrival_allocations(new.id,null); end if;
  return new;
end;
$$;
create trigger purchase_receipt_coverage after insert or update of state,lines on public.purchase_receipts
  for each row execute function private.cover_purchase_receipt();

create function private.cover_unlinked_arrival() returns trigger language plpgsql set search_path='' as $$
declare
  item jsonb;
  primary_document uuid;
  apply boolean;
begin
  if new.state not in ('pending','approved') or (tg_op='UPDATE' and new.state=old.state and new.lines=old.lines) then return new; end if;
  apply := new.state='approved';
  for item in select value from jsonb_array_elements(new.lines) where value ?| array['association','coverage'] loop
    if not item ? 'association' then raise exception 'select an associated purchase first' using errcode='22023'; end if;
    primary_document := private.apply_purchase_arrival_allocation(new.care_recipient_id,item->>'productId',item->>'unit',null,
      null,new.id,(item->>'lineId')::uuid,item->'association',(item->>'quantity')::numeric,true,apply);
    if item ? 'coverage' then
      perform private.apply_purchase_arrival_allocation(new.care_recipient_id,item->>'productId',item->>'unit',primary_document,
        null,new.id,(item->>'lineId')::uuid,item->'coverage',(item->>'quantity')::numeric,false,apply);
    end if;
  end loop;
  if apply and exists (select 1 from jsonb_array_elements(new.lines) j where j ? 'association') then
    perform private.record_purchase_arrival_allocations(null,new.id);
  end if;
  return new;
end;
$$;
create trigger unlinked_arrival_coverage after insert or update of state,lines on private.unlinked_arrivals
  for each row execute function private.cover_unlinked_arrival();

revoke all on function private.purchase_arrival_capacity(uuid,uuid),
  private.apply_purchase_arrival_allocation(uuid,text,text,uuid,uuid,uuid,uuid,jsonb,numeric,boolean,boolean),
  private.record_purchase_arrival_allocations(uuid,uuid),
  private.cover_purchase_receipt(),private.cover_unlinked_arrival(),public.purchase_arrival_targets(uuid,text,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.purchase_arrival_targets(uuid,text,uuid) to authenticated;

create function private.purchase_arrival_coverage_facts(p_document uuid) returns jsonb
language sql stable set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',a.id,'targetDocumentId',target.id,'targetCode',target.code,'targetLineId',line.id,'material',line.name_snapshot,
    'unit',line.unit_snapshot,'sourceDocumentId',source.id,'sourceCode',coalesce(source.code,che.code),
    'sourceReceiptId',a.source_receipt_id,'sourceArrivalId',a.source_che_id,'primaryAssociation',a.primary_association,
    'planningQuantity',trim_scale(a.planning_quantity)::text,'arrivalQuantity',trim_scale(a.arrival_quantity)::text,
    'recordedAt',a.recorded_at) order by a.recorded_at desc,a.id),'[]'::jsonb)
  from private.purchase_arrival_allocations a
  join public.document_lines line on line.id=a.target_line_id
  join public.operational_documents target on target.id=line.document_id
  left join public.purchase_receipts r on r.id=a.source_receipt_id
  left join private.unlinked_arrivals che on che.id=a.source_che_id
  left join public.operational_documents source on source.id=coalesce(r.document_id, (
    select t.document_id from private.purchase_arrival_allocations primary_link
    join public.document_lines t on t.id=primary_link.target_line_id
    where primary_link.source_che_id=a.source_che_id and primary_link.source_line_id=a.source_line_id
      and primary_link.primary_association
  )) and source.id<>target.id
  where target.id=p_document or source.id=p_document;
$$;
revoke all on function private.purchase_arrival_coverage_facts(uuid) from public,anon,authenticated,service_role;

do $migration$
declare
  definition text;
  routine regprocedure;
  old_value text;
  new_value text;
begin
  for routine,old_value,new_value in values
    ('private.purchase_progress(uuid)'::regprocedure,'purchased_quantity+waived_quantity','purchased_quantity+waived_quantity+covered_quantity'),
    ('private.purchase_progress(uuid)'::regprocedure,'approved_quantity-purchased_quantity-waived_quantity','approved_quantity-purchased_quantity-waived_quantity-covered_quantity'),
    ('private.purchase_progress(uuid)'::regprocedure,$a$'waivedQuantity',waived_quantity,$a$,$b$'coveredQuantity',covered_quantity,'associatedQuantity',associated_quantity,'waivedQuantity',waived_quantity,$b$),
    ('private.purchase_progress(uuid)'::regprocedure,'accepted_quantity+approved_excess','accepted_quantity+approved_excess+associated_quantity'),
    ('private.refresh_purchase_progress(uuid)'::regprocedure,'accepted_quantity+waived_quantity=approved_quantity','accepted_quantity+waived_quantity+covered_quantity=approved_quantity'),
    ('private.refresh_purchase_progress(uuid)'::regprocedure,'and accepted_quantity>0','and (accepted_quantity>0 or associated_quantity>0 or covered_quantity>0)'),
    ('private.close_purchase_expectation(uuid,jsonb,uuid,integer)'::regprocedure,
      'waived_quantity=approved_quantity-purchased_quantity where document_id=p_id and approved_quantity>purchased_quantity+waived_quantity',
      'waived_quantity=approved_quantity-purchased_quantity-covered_quantity where document_id=p_id and approved_quantity>purchased_quantity+waived_quantity+covered_quantity'),
    ('public.audited_legacy_supply_command(uuid,text,jsonb,uuid,integer)'::regprocedure,
      'l.purchased_quantity+q>l.approved_quantity-l.waived_quantity','l.purchased_quantity+q>l.approved_quantity-l.waived_quantity-l.covered_quantity'),
    ('private.supply_source_materials(uuid,uuid,text)'::regprocedure,
      'l.accepted_quantity+coalesce(arrival.approved_excess,0)','l.accepted_quantity+l.associated_quantity+coalesce(arrival.approved_excess,0)'),
    ('private.require_supply_purchase_capacity(uuid,jsonb,jsonb)'::regprocedure,
      'line.accepted_quantity+coalesce(arrival.approved_excess,0)','line.accepted_quantity+line.associated_quantity+coalesce(arrival.approved_excess,0)'),
    ('private.command_com_arrival_correction(uuid,text,jsonb,uuid,integer)'::regprocedure,
      $a$'remainingAction','excessConfirmed']$a$,$b$'remainingAction','excessConfirmed','coverage']$b$),
    ('public.unlinked_arrival_command(uuid,uuid,jsonb)'::regprocedure,
      $a$item-array['productId','quantity']$a$,$b$item-array['productId','quantity','association','coverage']$b$),
    ('public.unlinked_arrival_command(uuid,uuid,jsonb)'::regprocedure,
      $a$previous_item||jsonb_build_object('quantity',trim_scale(amount)::text)$a$,
      $b$(previous_item-array['association','coverage'])||jsonb_build_object('quantity',trim_scale(amount)::text)
        ||(case when item ? 'association' then jsonb_build_object('association',item->'association') else '{}'::jsonb end)
        ||(case when item ? 'coverage' then jsonb_build_object('coverage',item->'coverage') else '{}'::jsonb end)$b$),
    ('public.operational_document(uuid)'::regprocedure,
      $a$'purchaseProgress',private.purchase_progress(p_id),$a$,
      $b$'purchaseCoverage',case when d.type='COM' then private.purchase_arrival_coverage_facts(p_id) else '[]'::jsonb end,
        'purchaseProgress',private.purchase_progress(p_id),$b$),
    ('public.execute_com_arrival_review(uuid,uuid,jsonb)'::regprocedure,
      $a$when insufficient_privilege then status := 'blocked';$a$,
      $b$when insufficient_privilege then status := 'blocked';
          when sqlstate 'PT409' then
            if sqlerrm<>'purchase coverage changed' then raise; end if;
            status := 'blocked';$b$),
    ('private.review_unlinked_arrival(uuid,jsonb)'::regprocedure,
      $a$      update private.unlinked_arrivals set state=outcome,version=version+1,reason=btrim(p_entry->>'reason')
        where id=arrival.id returning * into arrival;
      if outcome='approved' then perform private.credit_unlinked_arrival(arrival); end if;
      perform private.record_unlinked_arrival_event(arrival);$a$,
      $b$      begin
        update private.unlinked_arrivals set state=outcome,version=version+1,reason=btrim(p_entry->>'reason')
          where id=arrival.id returning * into arrival;
        if outcome='approved' then perform private.credit_unlinked_arrival(arrival); end if;
        perform private.record_unlinked_arrival_event(arrival);
      exception when sqlstate 'PT409' then
        if sqlerrm<>'purchase coverage changed' then raise; end if;
        outcome := 'blocked';
      end;$b$)
  loop
    definition := pg_get_functiondef(routine);
    if strpos(definition,old_value)=0 then raise exception 'purchase coverage anchor missing in %: %',routine,old_value; end if;
    execute replace(definition,old_value,new_value);
  end loop;

  definition := pg_get_viewdef('private.document_progress_facts'::regclass,false);
  old_value := '''com.resubmit_receipt''::text';
  if strpos(definition,old_value)=0 then raise exception 'coverage progress anchor missing'; end if;
  execute 'create or replace view private.document_progress_facts as '||
    replace(definition,old_value,old_value||', ''com.arrival_coverage''::text');
end;
$migration$;

create function private.purchase_arrival_link_details(p_patient uuid,p_item jsonb) returns jsonb
language sql stable set search_path='' as $$
  select coalesce((select jsonb_build_object('linkedPurchase',jsonb_build_object('documentId',d.id,'code',d.code))
    from public.operational_documents d where d.care_recipient_id=p_patient and d.id=(p_item->'association'->>'documentId')::uuid),'{}')
  || coalesce((select jsonb_build_object('priorPlanning',jsonb_build_object('documentId',d.id,'code',d.code,'quantity',p_item->'coverage'->>'quantity'))
    from public.operational_documents d where d.care_recipient_id=p_patient and d.id=(p_item->'coverage'->>'documentId')::uuid),'{}');
$$;
revoke all on function private.purchase_arrival_link_details(uuid,jsonb) from public,anon,authenticated,service_role;

do $projection$
declare definition text;
begin
  definition := pg_get_functiondef('public.com_arrival_review_queue(uuid,uuid,timestamptz,uuid)'::regprocedure);
  if strpos(definition,'order by item.position)')=0 then raise exception 'review coverage read anchor missing'; end if;
  execute replace(definition,'order by item.position)',
    '||private.purchase_arrival_link_details(p_patient,item.line) order by item.position)');

  definition := pg_get_functiondef('public.read_unlinked_arrivals(uuid,uuid,timestamptz,uuid)'::regprocedure);
  if strpos(definition,'end) order by item.ordinality)')=0 then raise exception 'arrival coverage read anchor missing'; end if;
  execute replace(definition,'end) order by item.ordinality)',
    'end)||private.purchase_arrival_link_details(p_patient,item.value) order by item.ordinality)');
end;
$projection$;

do $freeze$
declare
  definition text := pg_get_functiondef('private.science_snapshot()'::regprocedure);
  anchor text := $a$new.content_hash:=encode(extensions.digest(new.body::text,'sha256'),'hex');$a$;
begin
  if strpos(definition,anchor)=0 then raise exception 'purchase coverage snapshot anchor missing'; end if;
  execute replace(definition,anchor,$b$
    if d.type='COM' and exists (select 1 from jsonb_array_elements(private.purchase_arrival_coverage_facts(d.id))) then
      new.body:=new.body||jsonb_build_object('purchaseCoverage',private.purchase_arrival_coverage_facts(d.id));
    end if;
  $b$||anchor);
end;
$freeze$;
