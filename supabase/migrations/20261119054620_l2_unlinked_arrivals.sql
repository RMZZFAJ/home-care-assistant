create table private.unlinked_arrivals (
  id uuid primary key default gen_random_uuid(),
  care_recipient_id uuid not null references public.care_recipients(id),
  series bigint not null check (series>0),
  code text generated always as ('CHE-'||lpad(series::text,greatest(4,length(series::text)),'0')) stored,
  origin text not null check (origin in ('external_purchase','gift','donation')),
  state text not null check (state in ('pending','approved','rejected','correction_requested')),
  version integer not null default 1 check (version>0),
  submitted_by uuid not null references public.profiles(id),
  submitted_name text not null,
  created_at timestamptz not null default clock_timestamp(),
  submitted_at timestamptz not null default clock_timestamp(),
  lines jsonb not null check (jsonb_typeof(lines)='array'),
  reason text,
  unique (care_recipient_id,series)
);
create index unlinked_arrivals_pending on private.unlinked_arrivals (care_recipient_id,submitted_at desc,id desc)
  where state='pending';
create index unlinked_arrivals_history on private.unlinked_arrivals (care_recipient_id,created_at desc,id desc);

create table private.unlinked_arrival_events (
  arrival_id uuid not null references private.unlinked_arrivals(id),
  version integer not null,
  actor_id uuid not null references public.profiles(id),
  actor_name text not null,
  occurred_at timestamptz not null default clock_timestamp(),
  state text not null,
  reason text,
  lines jsonb not null,
  primary key (arrival_id,version)
);

create table private.unlinked_arrival_commands (
  actor_id uuid not null,
  key uuid not null,
  care_recipient_id uuid not null references public.care_recipients(id),
  intention jsonb,
  result jsonb,
  primary key (actor_id,key),
  check ((intention is null)=(result is null))
);

alter table private.unlinked_arrivals enable row level security;
alter table private.unlinked_arrival_events enable row level security;
alter table private.unlinked_arrival_commands enable row level security;
revoke all on private.unlinked_arrivals,private.unlinked_arrival_events,private.unlinked_arrival_commands
  from public,anon,authenticated,service_role;

create trigger unlinked_arrival_workspace_invalidation after insert or update on private.unlinked_arrivals
  for each row execute function private.invalidate_workspace();

create function private.require_unlinked_arrival_read(p_patient uuid) returns void
language plpgsql stable set search_path='' as $$
begin
  if private.auth_session() is null or coalesce(public.recipient_role(p_patient)::text,'') not in ('admin','family') then
    raise exception 'active family context required' using errcode='42501';
  end if;
  perform private.require_cap(p_patient,'com.read');
end;
$$;

create function private.unlinked_arrival_summary(p_arrival private.unlinked_arrivals) returns jsonb
language sql stable set search_path='' as $$
  select jsonb_build_object('id',p_arrival.id,'code',p_arrival.code,'origin',p_arrival.origin,'state',p_arrival.state,
    'version',p_arrival.version,'author',p_arrival.submitted_name,'createdAt',p_arrival.created_at,
    'submittedAt',p_arrival.submitted_at,'reason',p_arrival.reason);
$$;

create function private.record_unlinked_arrival_event(p_arrival private.unlinked_arrivals) returns void
language sql set search_path='' as $$
  insert into private.unlinked_arrival_events (arrival_id,version,actor_id,actor_name,state,reason,lines)
    select p_arrival.id,p_arrival.version,p.id,p.full_name,p_arrival.state,p_arrival.reason,p_arrival.lines
    from public.profiles p where p.id=auth.uid();
$$;

create function private.credit_unlinked_arrival(p_arrival private.unlinked_arrivals) returns void
language plpgsql set search_path='' as $$
declare item jsonb;
begin
  perform private.require_com_arrival_review(p_arrival.care_recipient_id);
  for item in select value from jsonb_array_elements(p_arrival.lines) loop
    perform private.move_stock(p_arrival.care_recipient_id,item->>'productId',(item->>'quantity')::numeric,
      null,'FAMILY','Chegada '||p_arrival.code||' aprovada','unlinked_arrival',p_arrival.id);
  end loop;
  perform private.require_com_arrival_review(p_arrival.care_recipient_id);
end;
$$;

-- The same key serializes execution and recovery, including a confirmed non-act.
create function public.unlinked_arrival_command(p_patient uuid,p_key uuid,p_body jsonb default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  prior private.unlinked_arrival_commands;
  arrival private.unlinked_arrivals;
  product public.care_recipient_products;
  previous_item jsonb;
  item jsonb;
  items jsonb := '[]'::jsonb;
  amount numeric;
  correction boolean := coalesce(p_body ? 'arrivalId',false);
  immediate boolean;
  next_series bigint;
begin
  perform private.require_unlinked_arrival_read(p_patient);
  if p_key is null then raise exception 'arrival key required' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('unlinked-arrival:'||auth.uid()||':'||p_key,0));
  perform private.require_unlinked_arrival_read(p_patient);
  select * into prior from private.unlinked_arrival_commands where actor_id=auth.uid() and key=p_key;
  if found then
    if prior.care_recipient_id<>p_patient then raise exception 'arrival outside context' using errcode='42501'; end if;
    if p_body is not null and prior.intention is distinct from p_body then
      raise exception 'arrival key cannot be reused' using errcode='PT409';
    end if;
  elsif p_body is null then
    insert into private.unlinked_arrival_commands (actor_id,key,care_recipient_id)
    values (auth.uid(),p_key,p_patient) returning * into prior;
  else
    if jsonb_typeof(p_body) is distinct from 'object' or jsonb_typeof(p_body->'lines') is distinct from 'array' then
      raise exception 'invalid arrival' using errcode='22023';
    end if;
    if jsonb_array_length(p_body->'lines') not between 1 and 100
      or (p_body-array['origin','arrivalId','version','lines'])<>'{}'::jsonb then
      raise exception 'invalid arrival' using errcode='22023';
    end if;
    perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
    perform private.require_unlinked_arrival_read(p_patient);
    perform private.require_cap(p_patient,'com.receive');
    immediate := public.recipient_role(p_patient)='admin' and coalesce(private.can(p_patient,'com.validate'),false);
    if correction then
      if p_body ? 'origin' or jsonb_typeof(p_body->'arrivalId') is distinct from 'string'
        or jsonb_typeof(p_body->'version') is distinct from 'number'
        or coalesce(p_body->>'version','') !~ '^[1-9][0-9]{0,9}$'
        or (p_body->>'version')::bigint>2147483647 then
        raise exception 'invalid arrival correction' using errcode='22023';
      end if;
      select * into arrival from private.unlinked_arrivals where id=(p_body->>'arrivalId')::uuid
        and care_recipient_id=p_patient and submitted_by=auth.uid() for update;
      if not found then raise exception 'arrival author required' using errcode='42501'; end if;
      if arrival.state<>'correction_requested' or arrival.version<>(p_body->>'version')::integer then
        raise exception 'arrival correction reference changed' using errcode='PT409';
      end if;
      if jsonb_array_length(arrival.lines)<>jsonb_array_length(p_body->'lines') then
        raise exception 'arrival correction must preserve its materials' using errcode='22023';
      end if;
    elsif p_body ? 'version' or coalesce(p_body->>'origin','') not in ('external_purchase','gift','donation') then
      raise exception 'invalid arrival origin' using errcode='22023';
    end if;

    for item in select value from jsonb_array_elements(p_body->'lines') loop
      if jsonb_typeof(item) is distinct from 'object' or (item-array['productId','quantity'])<>'{}'::jsonb
        or jsonb_typeof(item->'productId') is distinct from 'string'
        or jsonb_typeof(item->'quantity') is distinct from 'string'
        or coalesce(item->>'quantity','') !~ '^[0-9]{1,10}(\.[0-9]{1,6})?$' then
        raise exception 'invalid arrival material' using errcode='22023';
      end if;
      if items @> jsonb_build_array(jsonb_build_object('productId', item->>'productId')) then
        raise exception 'duplicate material in arrival' using errcode='22023';
      end if;
      select * into product from public.care_recipient_products
        where care_recipient_id=p_patient and product_id=item->>'productId' and (is_active or correction) for share;
      if not found then raise exception 'invalid arrival material' using errcode='22023'; end if;
      amount := (item->>'quantity')::numeric;
      if amount<=0 or amount>1000000000 or amount<>round(amount,product.quantity_decimals) then
        raise exception 'invalid arrival quantity' using errcode='22023';
      end if;

      if correction then
        select value into previous_item from jsonb_array_elements(arrival.lines) where value->>'productId'=product.product_id;
        if not found then raise exception 'arrival correction must preserve its materials' using errcode='22023'; end if;
      else
        previous_item := jsonb_build_object('lineId',gen_random_uuid(),'productId',product.product_id,
          'name',product.name,'unit',product.unit,'decimals',product.quantity_decimals);
      end if;
      items := items||jsonb_build_array(previous_item||jsonb_build_object('quantity',trim_scale(amount)::text));
    end loop;

    if correction then
      update private.unlinked_arrivals set lines=items,state=case when immediate then 'approved' else 'pending' end,
        version=version+1,submitted_at=clock_timestamp(),reason=null
        where id=arrival.id returning * into arrival;
    else
      select coalesce(max(series),0)+1 into next_series from private.unlinked_arrivals where care_recipient_id=p_patient;
      insert into private.unlinked_arrivals (care_recipient_id,series,origin,state,submitted_by,submitted_name,lines)
        select p_patient,next_series,p_body->>'origin',case when immediate then 'approved' else 'pending' end,auth.uid(),p.full_name,items
        from public.profiles p where p.id=auth.uid() returning * into strict arrival;
    end if;
    if immediate then perform private.credit_unlinked_arrival(arrival); end if;
    perform private.record_unlinked_arrival_event(arrival);
    perform private.require_unlinked_arrival_read(p_patient);
    perform private.require_cap(p_patient,'com.receive');
    insert into private.unlinked_arrival_commands (actor_id,key,care_recipient_id,intention,result)
      values (auth.uid(),p_key,p_patient,p_body,private.unlinked_arrival_summary(arrival)) returning * into prior;
  end if;
  perform private.require_unlinked_arrival_read(p_patient);
  return jsonb_build_object('key',p_key,'state',case when prior.result is null then 'not_applied' else 'recorded' end,'result',prior.result);
end;
$$;

create function public.read_unlinked_arrivals(p_patient uuid,p_id uuid default null,
  p_before_at timestamptz default null,p_before_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  arrival private.unlinked_arrivals;
  result jsonb;
  may_read_stock boolean;
  is_admin boolean;
begin
  perform private.require_unlinked_arrival_read(p_patient);
  is_admin := public.recipient_role(p_patient)='admin' and coalesce(private.can(p_patient,'com.validate'),false);
  may_read_stock := coalesce(private.can(p_patient,'stock.family.read'),false);
  if p_id is not null then
    select * into arrival from private.unlinked_arrivals
      where id=p_id and care_recipient_id=p_patient
        and (submitted_by=auth.uid() or is_admin or (state='approved' and may_read_stock));
    if not found then raise exception 'arrival unavailable' using errcode='42501'; end if;
    return private.unlinked_arrival_summary(arrival)||jsonb_build_object(
      'canCorrect',arrival.state='correction_requested' and arrival.submitted_by=auth.uid() and coalesce(private.can(p_patient,'com.receive'),false),
      'materials',(select jsonb_agg(item.value||jsonb_build_object('familyStock',
        case when may_read_stock then private.stock_quantity(p_patient,item.value->>'productId','FAMILY')::text end) order by item.ordinality)
        from jsonb_array_elements(arrival.lines) with ordinality item),
      'history',(select jsonb_agg(jsonb_build_object('version',e.version,'author',e.actor_name,'at',e.occurred_at,
        'state',e.state,'reason',e.reason,'materials',e.lines) order by e.version)
        from private.unlinked_arrival_events e where e.arrival_id=arrival.id));
  end if;
  if (p_before_at is null)<>(p_before_id is null) then raise exception 'incomplete arrival pagination' using errcode='22023'; end if;
  with page as materialized (
    select a.* from private.unlinked_arrivals a where a.care_recipient_id=p_patient
      and (a.submitted_by=auth.uid() or is_admin or (state='approved' and may_read_stock))
      and (p_before_at is null or (a.created_at,a.id)<(p_before_at,p_before_id))
    order by a.created_at desc,a.id desc limit 31
  ), visible as materialized (select * from page order by created_at desc,id desc limit 30)
  select jsonb_build_object('arrivals',coalesce((select jsonb_agg(private.unlinked_arrival_summary(v) order by created_at desc,id desc)
    from visible v),'[]'::jsonb),'next',case when (select count(*) from page)>30 then (
      select jsonb_build_object('at',created_at,'id',id) from visible order by created_at,id limit 1) end) into result;
  return result;
end;
$$;

-- The batch command already holds the patient stock lock and checks live review authority.
create function private.review_unlinked_arrival(p_patient uuid,p_entry jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare
  arrival private.unlinked_arrivals;
  outcome text := 'blocked';
begin
  select * into arrival from private.unlinked_arrivals where id=(p_entry->>'receiptId')::uuid
    and care_recipient_id=p_patient and submitted_by<>auth.uid() for update;
  if found then
    if arrival.state<>'pending' then
      outcome := 'already_decided';
    elsif arrival.version<>(p_entry->>'version')::integer then
      outcome := 'changed';
    else
      outcome := case p_entry->>'decision' when 'approve' then 'approved' when 'reject' then 'rejected' else 'correction_requested' end;
      update private.unlinked_arrivals set state=outcome,version=version+1,reason=btrim(p_entry->>'reason')
        where id=arrival.id returning * into arrival;
      if outcome='approved' then perform private.credit_unlinked_arrival(arrival); end if;
      perform private.record_unlinked_arrival_event(arrival);
    end if;
  end if;
  return jsonb_build_object('status',outcome,'documentCode',arrival.code,'submittedAt',arrival.submitted_at,
    'materials',coalesce((select jsonb_agg(value->>'name' order by ordinality)
      from jsonb_array_elements(arrival.lines) with ordinality),'[]'::jsonb));
end;
$$;

revoke all on function private.require_unlinked_arrival_read(uuid),private.unlinked_arrival_summary(private.unlinked_arrivals),
  private.record_unlinked_arrival_event(private.unlinked_arrivals),private.credit_unlinked_arrival(private.unlinked_arrivals),
  private.review_unlinked_arrival(uuid,jsonb),public.unlinked_arrival_command(uuid,uuid,jsonb),
  public.read_unlinked_arrivals(uuid,uuid,timestamptz,uuid) from public,anon,authenticated,service_role;
grant execute on function public.unlinked_arrival_command(uuid,uuid,jsonb),
  public.read_unlinked_arrivals(uuid,uuid,timestamptz,uuid) to authenticated;

create or replace function public.com_arrival_review_queue(p_patient uuid,p_document uuid default null,
  p_before_at timestamptz default null,p_before_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  result jsonb;
  may_read_stock boolean;
begin
  perform private.require_com_arrival_review(p_patient);
  if (p_before_at is null)<>(p_before_id is null) then
    raise exception 'incomplete arrival pagination reference' using errcode='22023';
  end if;
  may_read_stock := coalesce(private.can(p_patient,'stock.family.read'),false);
  with candidates as (
    select r.id,r.document_id,r.created_at as submitted_at,r.submitted_name,r.lines,r.l2_arrival,d.code,d.version,
      null::text as origin
    from public.operational_documents d join public.purchase_receipts r on r.document_id=d.id
    where d.care_recipient_id=p_patient and d.type='COM'
      and d.status not in ('cancelled','rejected','administratively_closed')
      and r.state='pending' and r.submitted_by<>auth.uid()
      and (p_document is null or d.id=p_document)
      and (p_before_at is null or (r.created_at,r.id)<(p_before_at,p_before_id))
    union all
    select a.id,null,a.submitted_at,a.submitted_name,a.lines,false,a.code,a.version,a.origin
    from private.unlinked_arrivals a
    where p_document is null and a.care_recipient_id=p_patient and a.state='pending' and a.submitted_by<>auth.uid()
      and (p_before_at is null or (a.submitted_at,a.id)<(p_before_at,p_before_id))
  ), page as materialized (
    select * from candidates order by submitted_at desc,id desc limit 31
  ), visible as materialized (
    select * from page order by submitted_at desc,id desc limit 30
  )
  select jsonb_build_object('arrivals',coalesce((select jsonb_agg(
      jsonb_build_object('receiptId',r.id,'documentId',r.document_id,'documentCode',r.code,'version',r.version,
        'author',r.submitted_name,'submittedAt',r.submitted_at,
        'materials',(select jsonb_agg(jsonb_build_object(
          'lineId',item.line->>'lineId','name',coalesce(l.name_snapshot,item.line->>'name'),
          'unit',coalesce(l.unit_snapshot,item.line->>'unit'),'quantity',item.line->>'quantity',
          'expectedQuantity',case when r.l2_arrival then item.line->>'expectedQuantity' end,
          'remainingAction',case when r.l2_arrival then item.line->>'remainingAction' end,
          'familyStock',case when may_read_stock then private.stock_quantity(p_patient,
            coalesce(l.product_id,item.line->>'productId'),'FAMILY')::text end) order by item.position)
          from jsonb_array_elements(r.lines) with ordinality as item(line,position)
          left join public.document_lines l on l.document_id=r.document_id and l.id=(item.line->>'lineId')::uuid
          where r.document_id is null or l.id is not null))
        ||case when r.origin is null then '{}'::jsonb else jsonb_build_object('origin',r.origin) end
      order by r.submitted_at desc,r.id desc) from visible r),'[]'::jsonb),
    'next',case when (select count(*) from page)>30 then (select jsonb_build_object('at',submitted_at,'id',id)
      from visible order by submitted_at,id limit 1) end) into result;
  return result;
end;
$$;

do $migration$
declare
  definition text := pg_get_functiondef('public.execute_com_arrival_review(uuid,uuid,jsonb)'::regprocedure);
  type_anchor text := $anchor$jsonb_typeof(entry->'documentId') is distinct from 'string'$anchor$;
  groups_anchor text := 'from jsonb_array_elements(p_entries) loop';
  save_anchor text := '    insert into private.com_arrival_review_batches(actor_id,key,care_recipient_id,intention,results)';
  group_statement text := $anchor$for group_id in select distinct (value->>'documentId')::uuid from jsonb_array_elements(p_entries) loop$anchor$;
begin
  if strpos(definition,type_anchor)=0 or strpos(definition,group_statement)=0 or strpos(definition,save_anchor)=0 then
    raise exception 'arrival review migration does not match the installed contract';
  end if;
  definition := replace(definition,type_anchor,$change$coalesce(jsonb_typeof(entry->'documentId'),'') not in ('string','null')$change$);
  definition := replace(definition,group_statement,replace(group_statement,groups_anchor,
    $change$from jsonb_array_elements(p_entries) where jsonb_typeof(value->'documentId')='string' loop$change$));
  definition := replace(definition,save_anchor,$change$
    for entry in select value from jsonb_array_elements(p_entries) where jsonb_typeof(value->'documentId')='null' loop
      statuses := statuses||jsonb_build_object((entry->>'receiptId')::uuid,private.review_unlinked_arrival(p_patient,entry));
    end loop;
$change$||save_anchor);
  execute definition;
end;
$migration$;
