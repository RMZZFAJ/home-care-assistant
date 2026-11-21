create table private.com_arrival_review_batches (
  actor_id uuid not null,
  key uuid not null,
  care_recipient_id uuid not null,
  intention jsonb,
  results jsonb,
  recorded_at timestamptz not null default clock_timestamp(),
  primary key (actor_id,key),
  check ((intention is null)=(results is null))
);
alter table private.com_arrival_review_batches enable row level security;
revoke all on private.com_arrival_review_batches from public,anon,authenticated,service_role;

create function private.require_com_arrival_review(p_patient uuid) returns void
language plpgsql set search_path = '' as $$
begin
  if private.auth_session() is null or public.recipient_role(p_patient) is distinct from 'admin' then
    raise exception 'arrival review requires an active administrator' using errcode='42501';
  end if;
  perform private.require_cap(p_patient,'com.read');
  perform private.require_cap(p_patient,'com.validate');
end;
$$;

create function public.com_arrival_review_queue(p_patient uuid,p_document uuid default null,
  p_before_at timestamptz default null,p_before_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  result jsonb;
  may_read_stock boolean;
begin
  perform private.require_com_arrival_review(p_patient);
  if (p_before_at is null)<>(p_before_id is null) then
    raise exception 'incomplete arrival pagination reference' using errcode='22023';
  end if;
  may_read_stock := coalesce(private.can(p_patient,'stock.family.read'),false);
  with page as materialized (
    select r.id,r.document_id,r.created_at,r.submitted_name,r.lines,r.l2_arrival,d.code,d.version
    from public.operational_documents d join public.purchase_receipts r on r.document_id=d.id
    where d.care_recipient_id=p_patient and d.type='COM'
      and d.status not in ('cancelled','rejected','administratively_closed')
      and r.state='pending' and r.submitted_by<>auth.uid()
      and (p_document is null or d.id=p_document)
      and (p_before_at is null or (r.created_at,r.id)<(p_before_at,p_before_id))
    order by r.created_at desc,r.id desc limit 31
  ), visible as materialized (
    select * from page order by created_at desc,id desc limit 30
  )
  select jsonb_build_object('arrivals',coalesce((select jsonb_agg(jsonb_build_object(
      'receiptId',r.id,'documentId',r.document_id,'documentCode',r.code,'version',r.version,
      'author',r.submitted_name,'submittedAt',r.created_at,
      'materials',(select jsonb_agg(jsonb_build_object('lineId',l.id,'name',l.name_snapshot,'unit',l.unit_snapshot,
        'quantity',item.line->>'quantity',
        'expectedQuantity',case when r.l2_arrival then item.line->>'expectedQuantity' end,
        'remainingAction',case when r.l2_arrival then item.line->>'remainingAction' end,
        'familyStock',case when may_read_stock then private.stock_quantity(p_patient,l.product_id,'FAMILY')::text end)
        order by item.position) from jsonb_array_elements(r.lines) with ordinality as item(line,position)
        join public.document_lines l on l.document_id=r.document_id and l.id=(item.line->>'lineId')::uuid))
      order by r.created_at desc,r.id desc) from visible r),'[]'::jsonb),
    'next',case when (select count(*) from page)>30 then (select jsonb_build_object('at',created_at,'id',id)
      from visible order by created_at,id limit 1) end) into result;
  return result;
end;
$$;

-- One patient lock establishes the selected document versions before any act.
-- Subsequent acts on the same COM use the version produced by the preceding act.
-- Each receipt keeps the existing native audit, stock and PDF pipeline.
create function public.execute_com_arrival_review(p_patient uuid,p_key uuid,p_entries jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  batch private.com_arrival_review_batches;
  d public.operational_documents;
  receipt public.purchase_receipts;
  group_id uuid;
  entry jsonb;
  entry_id uuid;
  action text;
  body jsonb;
  base_version integer;
  next_version integer;
  status text;
  statuses jsonb := '{}'::jsonb;
begin
  perform private.require_com_arrival_review(p_patient);
  if p_key is null or jsonb_typeof(p_entries) is distinct from 'array' then
    raise exception 'invalid arrival review' using errcode='22023';
  end if;
  if jsonb_array_length(p_entries) not between 1 and 100 then
    raise exception 'invalid arrival review length' using errcode='22023';
  end if;
  for entry in select value from jsonb_array_elements(p_entries) loop
    if jsonb_typeof(entry) is distinct from 'object'
      or (entry-array['documentId','receiptId','version','decision','reason'])<>'{}'::jsonb
      or coalesce(entry->>'decision','') not in ('approve','reject','request_correction')
      or jsonb_typeof(entry->'documentId') is distinct from 'string' or jsonb_typeof(entry->'receiptId') is distinct from 'string'
      or jsonb_typeof(entry->'version') is distinct from 'number' or coalesce(entry->>'version','') !~ '^[1-9][0-9]{0,9}$'
      or (entry->>'version')::bigint>2147483647
      or (entry->>'decision'='approve' and entry ? 'reason')
      or (entry->>'decision'<>'approve' and (jsonb_typeof(entry->'reason') is distinct from 'string'
        or length(btrim(entry->>'reason')) not between 3 and 1000)) then
      raise exception 'invalid arrival decision' using errcode='22023';
    end if;
    perform (entry->>'documentId')::uuid;
  end loop;
  if (select count(distinct (value->>'receiptId')::uuid) from jsonb_array_elements(p_entries))<>jsonb_array_length(p_entries) then
    raise exception 'duplicate arrival decision' using errcode='22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('com-arrival-review:'||auth.uid()||':'||p_key,0));
  select * into batch from private.com_arrival_review_batches where actor_id=auth.uid() and key=p_key;
  if found then
    if batch.care_recipient_id<>p_patient or batch.intention is distinct from p_entries then
      raise exception 'arrival review key cannot be reused' using errcode='PT409';
    end if;
  else
    perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
    perform private.require_com_arrival_review(p_patient);
    for group_id in select distinct (value->>'documentId')::uuid from jsonb_array_elements(p_entries) loop
      select * into d from public.operational_documents where id=group_id and care_recipient_id=p_patient and type='COM' for update;
      base_version := d.version;
      next_version := base_version;
      for entry in select value from jsonb_array_elements(p_entries) where (value->>'documentId')::uuid=group_id loop
        entry_id := (entry->>'receiptId')::uuid;
        receipt := null;
        status := 'blocked';
        if base_version is not null and d.status not in ('cancelled','rejected','administratively_closed') then
          select * into receipt from public.purchase_receipts where id=entry_id and document_id=group_id for update;
          if receipt.id is not null and receipt.submitted_by<>auth.uid() then
            if receipt.state<>'pending' then
              status := 'already_decided';
            elsif base_version<>(entry->>'version')::integer then
              status := 'changed';
            else
              body := jsonb_build_object('receiptId',entry_id);
              if entry->>'decision'<>'approve' then body := body||jsonb_build_object('reason',btrim(entry->>'reason')); end if;
              action := case entry->>'decision' when 'approve' then 'validate_receipt'
                when 'reject' then 'reject_receipt' else 'request_receipt_correction' end;
              begin
                perform public.supply_document_command(group_id,action,body,gen_random_uuid(),next_version);
                select version into strict next_version from public.operational_documents where id=group_id;
                select state into strict status from public.purchase_receipts where id=entry_id;
                if status<>(case entry->>'decision' when 'approve' then 'approved'
                  when 'reject' then 'rejected' else 'correction_requested' end) then
                  raise exception 'arrival review did not record the selected decision';
                end if;
              exception
                when insufficient_privilege then status := 'blocked';
                when raise_exception then
                  if sqlerrm not in ('invalid receipt quantity','receipt not pending') then raise; end if;
                  status := 'blocked';
              end;
            end if;
          end if;
        end if;
        statuses := statuses||jsonb_build_object(entry_id,jsonb_build_object(
          'status',status,'documentCode',d.code,'submittedAt',receipt.created_at,
          'materials',coalesce((select jsonb_agg(l.name_snapshot order by item.position)
            from jsonb_array_elements(receipt.lines) with ordinality as item(line,position)
            join public.document_lines l on l.document_id=group_id and l.id=(item.line->>'lineId')::uuid),'[]'::jsonb)));
      end loop;
    end loop;
    insert into private.com_arrival_review_batches(actor_id,key,care_recipient_id,intention,results)
    select auth.uid(),p_key,p_patient,p_entries,jsonb_agg(jsonb_build_object('receiptId',(item->>'receiptId')::uuid,
      'documentId',(item->>'documentId')::uuid)||(statuses->((item->>'receiptId')::uuid)::text) order by position)
    from jsonb_array_elements(p_entries) with ordinality as rows(item,position) returning * into batch;
  end if;
  perform private.require_com_arrival_review(p_patient);
  return jsonb_build_object('key',batch.key,'state','recorded','results',batch.results);
end;
$$;

create function public.settle_com_arrival_review(p_patient uuid,p_key uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare batch private.com_arrival_review_batches;
begin
  perform private.require_com_arrival_review(p_patient);
  if p_key is null then raise exception 'arrival review key required' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('com-arrival-review:'||auth.uid()||':'||p_key,0));
  select * into batch from private.com_arrival_review_batches where actor_id=auth.uid() and key=p_key;
  if not found then
    insert into private.com_arrival_review_batches(actor_id,key,care_recipient_id)
      values(auth.uid(),p_key,p_patient) returning * into batch;
  elsif batch.care_recipient_id<>p_patient then
    raise exception 'arrival review outside this context' using errcode='42501';
  end if;
  perform private.require_com_arrival_review(p_patient);
  return jsonb_build_object('key',batch.key,'state',case when batch.results is null then 'not_applied' else 'recorded' end,'results',batch.results);
end;
$$;

revoke all on function private.require_com_arrival_review(uuid),public.com_arrival_review_queue(uuid,uuid,timestamptz,uuid),
  public.execute_com_arrival_review(uuid,uuid,jsonb),public.settle_com_arrival_review(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.com_arrival_review_queue(uuid,uuid,timestamptz,uuid),
  public.execute_com_arrival_review(uuid,uuid,jsonb),public.settle_com_arrival_review(uuid,uuid) to authenticated;
