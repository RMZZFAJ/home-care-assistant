alter table public.purchase_receipts drop constraint purchase_receipts_state_check;
alter table public.purchase_receipts add constraint purchase_receipts_state_check
  check (state in ('pending','approved','rejected','correction_requested'));
alter table public.purchase_receipts add column corrections jsonb not null default '[]'::jsonb
  check (jsonb_typeof(corrections)='array');

-- Preserve the reservation during correction. It is visible as awaiting the
-- author, so it cannot be credited by the reviewer while the author edits it.
create function private.com_receipt_totals(p_id uuid,p_excluding_receipt uuid)
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
    where r.document_id=p_id and r.id is distinct from p_excluding_receipt
      and r.state in ('pending','approved','correction_requested')
  )
  select line_id,count(*) filter(where state='pending'),
    coalesce(sum(physical) filter(where state='pending'),0),
    coalesce(sum(case when closes_short then expected else least(expected,physical) end)
      filter(where state in ('pending','correction_requested')),0),
    coalesce(sum(greatest(expected-physical,0)) filter(where state='approved' and closes_short),0),
    coalesce(sum(greatest(physical-expected,0)) filter(where state='approved'),0)
  from amounts group by line_id;
$$;

create or replace function private.com_receipt_totals(p_id uuid)
returns table(line_id uuid,pending_count bigint,pending_physical numeric,
  pending_coverage numeric,closed_short numeric,approved_excess numeric)
language sql stable set search_path = '' as $$
  select * from private.com_receipt_totals(p_id,null);
$$;

-- Share the receipt/reference validator with new arrivals. Only the receipt
-- being corrected is excluded when checking the replacement declaration.
do $$
declare
  definition text := pg_get_functiondef('private.require_com_receipt_lines(uuid,jsonb)'::regprocedure);
  args text := 'private.require_com_receipt_lines(p_id uuid, p_lines jsonb)';
  totals text := 'private.com_receipt_totals(p_id)';
begin
  if strpos(definition,args)=0 or strpos(definition,totals)=0 then
    raise exception 'COM receipt validation anchors not found';
  end if;
  definition := replace(definition,args,'private.require_com_receipt_lines(p_id uuid, p_lines jsonb, p_excluding_receipt uuid)');
  definition := replace(definition,totals,'private.com_receipt_totals(p_id,p_excluding_receipt)');
  execute definition;
end;
$$;

-- A corrected declaration may still be settled after another valid arrival
-- supplies the entire expectation. A fresh unrelated arrival stays blocked.
do $$
declare
  definition text;
  anchor text;
begin
  definition := pg_get_functiondef('private.require_com_receipt_lines(uuid,jsonb,uuid)'::regprocedure);
  anchor := 'if remaining <= 0 then';
  if strpos(definition,anchor)=0 then raise exception 'correction reference anchor not found'; end if;
  execute replace(definition,anchor,'if remaining < 0 or (remaining = 0 and p_excluding_receipt is null) then');

  definition := pg_get_functiondef('private.credit_purchase_receipt(uuid)'::regprocedure);
  anchor := '(physical=0 and (not r.l2_arrival or coalesce(item->>''remainingAction'','''') not in (''wait'',''short'')))';
  if strpos(definition,anchor)=0 then raise exception 'correction credit anchor not found'; end if;
  execute replace(definition,anchor,$body$(physical=0 and (not r.l2_arrival or
      (coalesce(item->>'remainingAction','') not in ('wait','short') and
       not coalesce(r.corrections->-1 ? 'resubmittedAt' and (item->>'expectedQuantity')::numeric=0,false))))$body$);

  definition := pg_get_viewdef('private.document_progress_facts'::regclass,false);
  anchor := '''com.reject_receipt''::text';
  if strpos(definition,anchor)=0 then raise exception 'arrival progress anchor not found'; end if;
  execute 'create or replace view private.document_progress_facts as ' || replace(definition,anchor,
    anchor || ', ''com.request_receipt_correction''::text, ''com.resubmit_receipt''::text');
end;
$$;

create or replace function private.require_com_receipt_lines(p_id uuid,p_lines jsonb) returns void
language sql set search_path = '' as $$
  select private.require_com_receipt_lines(p_id,p_lines,null);
$$;

create function private.require_com_correction_authority(p_patient uuid,p_action text) returns void
language plpgsql set search_path = '' as $$
begin
  if p_action='request_receipt_correction' then
    perform private.require_cap(p_patient,'com.validate');
    if public.recipient_role(p_patient) is distinct from 'admin' then
      raise exception 'administrator required for arrival correction request' using errcode='42501';
    end if;
  else
    perform private.require_cap(p_patient,'com.receive');
  end if;
end;
$$;

create function private.command_com_arrival_correction(p_id uuid,p_action text,p_body jsonb,p_key uuid,p_version integer)
returns jsonb language plpgsql set search_path = '' as $$
declare
  d public.operational_documents;
  r public.purchase_receipts;
  e public.document_events;
  receipt_id uuid;
  recorded_at timestamptz;
  change jsonb;
begin
  select * into d from public.operational_documents where id=p_id and type='COM';
  if not found then raise exception 'purchase document not found' using errcode='42501'; end if;
  perform private.require_cap(d.care_recipient_id,'com.read');
  perform private.require_com_correction_authority(d.care_recipient_id,p_action);
  perform pg_advisory_xact_lock(hashtextextended('stock:'||d.care_recipient_id,0));
  select * into strict d from public.operational_documents where id=p_id for update;
  if p_key is null or p_version is null or jsonb_typeof(p_body) is distinct from 'object'
    or jsonb_typeof(p_body->'receiptId') is distinct from 'string' then
    raise exception 'invalid arrival correction command' using errcode='22023';
  end if;
  receipt_id := (p_body->>'receiptId')::uuid;
  select * into r from public.purchase_receipts where id=receipt_id and document_id=p_id for update;
  if not found or (p_action='resubmit_receipt' and r.submitted_by is distinct from auth.uid())
    or (p_action='request_receipt_correction' and r.submitted_by=auth.uid()) then
    raise exception 'arrival correction requires the authorized actor' using errcode='42501';
  end if;

  select * into e from public.document_events where actor_id=auth.uid() and idempotency_key=p_key;
  if found then
    if e.document_id<>p_id or e.action<>'com.'||p_action or e.body->'event' is distinct from p_body then
      raise exception 'arrival correction key reused' using errcode='23505';
    end if;
    return public.operational_document(p_id);
  end if;
  if d.version<>p_version or d.status in ('cancelled','rejected') then
    raise exception 'arrival correction reference changed' using errcode='PT409';
  end if;

  recorded_at := clock_timestamp();
  if p_action='request_receipt_correction' then
    if (p_body-array['receiptId','reason'])<>'{}'::jsonb or jsonb_typeof(p_body->'reason') is distinct from 'string'
      or length(btrim(p_body->>'reason')) not between 3 and 1000 then
      raise exception 'arrival correction reason required' using errcode='22023';
    end if;
    if r.state<>'pending' then raise exception 'arrival no longer awaiting review' using errcode='PT409'; end if;
    change := jsonb_build_object('requestedAt',recorded_at,'requesterId',auth.uid(),
      'requesterName',(select full_name from public.profiles where id=auth.uid()),
      'reason',btrim(p_body->>'reason'),'previousLines',r.lines);
    update public.purchase_receipts set state='correction_requested',corrections=r.corrections||change where id=r.id;
  elsif p_action='resubmit_receipt' then
    if r.state<>'correction_requested' then raise exception 'arrival no longer awaiting its author' using errcode='PT409'; end if;
    if (p_body-array['receiptId','lines'])<>'{}'::jsonb then
      raise exception 'invalid correction declaration' using errcode='22023';
    end if;
    perform private.validate_supply_command(d,'receive',jsonb_build_object('lines',p_body->'lines'));
    if exists(select 1 from jsonb_array_elements(p_body->'lines') item
      where not (item ? 'expectedQuantity') or (item-array['lineId','quantity','expectedQuantity','remainingAction','excessConfirmed'])<>'{}'::jsonb)
      or (select array_agg((item->>'lineId')::uuid order by (item->>'lineId')::uuid) from jsonb_array_elements(r.lines) item)
      is distinct from (select array_agg((item->>'lineId')::uuid order by (item->>'lineId')::uuid) from jsonb_array_elements(p_body->'lines') item) then
      raise exception 'correction must preserve the arrival materials' using errcode='22023';
    end if;
    perform private.require_com_receipt_lines(p_id,p_body->'lines',r.id);
    change := (r.corrections->-1)||jsonb_build_object('resubmittedAt',recorded_at,'correctedLines',p_body->'lines');
    update public.purchase_receipts set state='pending',lines=p_body->'lines',l2_arrival=true,
      corrections=jsonb_set(r.corrections,'{-1}',change) where id=r.id;
  else
    raise exception 'unsupported arrival correction action' using errcode='22023';
  end if;

  update public.operational_documents set version=version+1 where id=p_id;
  perform private.refresh_purchase_progress(p_id);
  perform private.record_document_event(p_id,'com.'||p_action,p_body,p_key);
  perform private.require_com_correction_authority(d.care_recipient_id,p_action);
  return public.operational_document(p_id);
end;
$$;

revoke all on function private.com_receipt_totals(uuid,uuid),private.require_com_receipt_lines(uuid,jsonb,uuid),
  private.require_com_correction_authority(uuid,text),private.command_com_arrival_correction(uuid,text,jsonb,uuid,integer)
  from public,anon,authenticated,service_role;

do $$
declare
  definition text;
  anchor text;
begin
  definition := pg_get_functiondef('public.supply_document_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
  anchor := 'return public.fluent_pre_transfer_command(p_id,p_action,p_body,p_key,p_version);';
  if strpos(definition,anchor)=0 then raise exception 'supply correction dispatch anchor not found'; end if;
  execute replace(definition,anchor,$body$if p_action in ('request_receipt_correction','resubmit_receipt') then
    return private.command_com_arrival_correction(p_id,p_action,p_body,p_key,p_version);
  end if;
  return public.fluent_pre_transfer_command(p_id,p_action,p_body,p_key,p_version);$body$);

  definition := pg_get_functiondef('public.execute_document_decision(uuid,uuid,jsonb)'::regprocedure);
  anchor := 'perform private.require_supply_draft_scope(d.care_recipient_id,''COM'',action,p_document,true);';
  if strpos(definition,anchor)=0 then raise exception 'official COM authority anchor not found'; end if;
  execute replace(definition,anchor,$body$if action in ('request_receipt_correction','resubmit_receipt') then
    perform private.require_com_correction_authority(d.care_recipient_id,action);
  else
    perform private.require_supply_draft_scope(d.care_recipient_id,'COM',action,p_document,true);
  end if;$body$);
end;
$$;
