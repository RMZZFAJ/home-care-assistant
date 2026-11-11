-- Capture the actual family stock only on the native pending->approved transition.
-- Historical receipts are not backfilled or reconstructed from current stock.
create table private.purchase_entry_balances(
 receipt_id uuid primary key references public.purchase_receipts(id),
 document_id uuid not null,care_recipient_id uuid not null,
 validated_by uuid not null references public.profiles(id),validated_name text,
 validated_at timestamptz not null,lines jsonb not null check(jsonb_typeof(lines)='array'),
 foreign key(document_id,care_recipient_id) references public.operational_documents(id,care_recipient_id)
);
alter table private.purchase_entry_balances enable row level security;
revoke all on private.purchase_entry_balances from public,anon,authenticated,service_role;
create index purchase_entry_balances_document_patient on private.purchase_entry_balances(document_id,care_recipient_id);
create index purchase_entry_balances_validator on private.purchase_entry_balances(validated_by);
create function private.guard_purchase_entry_balance() returns trigger language plpgsql set search_path='' as $$begin
 raise exception 'immutable purchase entry balance' using errcode='42501';end;$$;
revoke all on function private.guard_purchase_entry_balance() from public,anon,authenticated,service_role;
create trigger immutable_purchase_entry_balance before update or delete on private.purchase_entry_balances
 for each row execute function private.guard_purchase_entry_balance();

create function private.capture_purchase_entry_balance() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_document public.operational_documents;v_lines jsonb;begin
 if old.state<>'pending' or new.state<>'approved' then return new;end if;
 select * into strict v_document from public.operational_documents where id=new.document_id and type='COM';
 perform private.require_cap(v_document.care_recipient_id,'com.validate');
 if new.validated_by is distinct from auth.uid() or new.validated_at is null then
  raise exception 'native purchase validation authority required' using errcode='42501';end if;
 with materials as (
  select l.id,l.product_id,l.name_snapshot,l.unit_snapshot,sum((x->>'quantity')::numeric) as entered
  from jsonb_array_elements(new.lines) x join public.document_lines l on l.id=(x->>'lineId')::uuid and l.document_id=new.document_id
  group by l.id,l.product_id,l.name_snapshot,l.unit_snapshot
 ) select coalesce(jsonb_agg(jsonb_build_object('lineId',m.id,'productId',m.product_id,'name',m.name_snapshot,'unit',m.unit_snapshot,
   'enteredQuantity',m.entered::text,'quantityAfter',private.stock_quantity(v_document.care_recipient_id,m.product_id,'FAMILY')::text) order by m.id),'[]'::jsonb)
 into v_lines from materials m;
 insert into private.purchase_entry_balances(receipt_id,document_id,care_recipient_id,validated_by,validated_name,validated_at,lines)
 values(new.id,new.document_id,v_document.care_recipient_id,new.validated_by,new.validated_name,new.validated_at,v_lines);
 return new;
end;$$;
revoke all on function private.capture_purchase_entry_balance() from public,anon,authenticated,service_role;
create trigger capture_purchase_entry_balance after update of state on public.purchase_receipts
 for each row when(old.state is distinct from new.state and new.state='approved') execute function private.capture_purchase_entry_balance();

create function private.purchase_entry_balance_facts(p_id uuid,p_version integer) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_document public.operational_documents;v_event public.document_events;v_map jsonb;
 v_line jsonb;v_entry jsonb;v_state text;v_has_entry boolean;v_allowed boolean;v_result jsonb:='[]'::jsonb;begin
 select * into strict v_document from public.operational_documents where id=p_id and type='COM';
 perform private.require_cap(v_document.care_recipient_id,'com.read');
 select * into v_event from public.document_events where document_id=p_id and version=p_version;
 if not found then
  return(select coalesce(jsonb_agg(jsonb_build_object('lineId',l.id,'state','unavailable','quantity',null,'entry',null) order by l.id),'[]') from public.document_lines l where l.document_id=p_id);
 end if;
 v_allowed:=coalesce(private.can(v_document.care_recipient_id,'stock.family.read'),false);
 with first_approval as materialized (
  -- A revalidation with another key is not a new physical entry. Select the
  -- first approved native event of each receipt, then the latest per material.
  select distinct on(x.body#>>'{purchaseReceipt,id}') x.id as event_id,x.version as event_version,x.body->'purchaseReceipt' as receipt
  from public.document_events x where x.document_id=p_id and x.version<=p_version and x.action in('com.receive','com.validate_receipt')
   and x.body#>>'{purchaseReceipt,state}'='approved'
  order by x.body#>>'{purchaseReceipt,id}',x.version
 ), receipt_lines as (
  select a.event_id,a.event_version,a.receipt,y->>'lineId' as line_id,sum((y->>'quantity')::numeric) as entered
  from first_approval a cross join lateral jsonb_array_elements(a.receipt->'lines') y
  group by a.event_id,a.event_version,a.receipt,y->>'lineId'
 ), last_entries as (
  select distinct on(r.line_id) r.* from receipt_lines r order by r.line_id,r.event_version desc
 ) select coalesce(jsonb_object_agg(r.line_id,jsonb_build_object('entry',jsonb_build_object(
   'receiptId',r.receipt->'id','eventId',r.event_id,'eventVersion',r.event_version,
   'enteredQuantity',r.entered::text,'submittedAt',r.receipt->'created_at','submittedName',r.receipt->'submitted_name',
   'validatedAt',r.receipt->'validated_at','validatorId',r.receipt->'validated_by','validatorName',r.receipt->'validated_name'),
   'capturedQuantity',captured.line->'quantityAfter')),'{}'::jsonb) into v_map
 from last_entries r left join private.purchase_entry_balances b on b.receipt_id::text=r.receipt->>'id'
  and b.document_id=p_id and b.care_recipient_id=v_document.care_recipient_id
  and b.validated_by::text=r.receipt->>'validated_by' and b.validated_at=(r.receipt->>'validated_at')::timestamptz
 left join lateral(select value as line from jsonb_array_elements(b.lines) where value->>'lineId'=r.line_id and (value->>'enteredQuantity')::numeric=r.entered) captured on true;
 for v_line in select value from jsonb_array_elements(v_event.body->'lines') order by value->>'id' loop
  v_entry:=v_map->(v_line->>'id');
  v_has_entry:=v_entry is not null or exists(select 1 from jsonb_array_elements(coalesce(v_event.body->'purchaseReceipts','[]'::jsonb)) r
   cross join lateral jsonb_array_elements(r->'lines') l where r->>'state'='approved' and l->>'lineId'=v_line->>'id');
  v_state:=case when v_entry->>'capturedQuantity' is not null then case when v_allowed then 'known' else 'restricted' end
   when not v_has_entry and v_line->>'accepted_quantity' ~ '^[0]+([.][0]+)?$' then 'not_validated' else 'unavailable' end;
  v_result:=v_result||jsonb_build_array(jsonb_build_object('lineId',v_line->'id','state',v_state,
   'quantity',case when v_state='known' then v_entry->'capturedQuantity' else 'null'::jsonb end,'entry',coalesce(v_entry->'entry','null'::jsonb)));
 end loop;
 return v_result;
end;$$;
revoke all on function private.purchase_entry_balance_facts(uuid,integer) from public,anon,authenticated,service_role;

do $$declare v_definition text;v_anchor text;begin
 v_definition:=pg_get_functiondef('public.operational_document(uuid)'::regprocedure);
 v_anchor:=$old$jsonb_build_object('purchaseProgress',private.purchase_progress(p_id))$old$;
 if position(v_anchor in v_definition)=0 then raise exception 'purchase read contract drift';end if;
 execute replace(v_definition,v_anchor,$new$jsonb_build_object('purchaseProgress',private.purchase_progress(p_id),'purchaseEntryBalances',private.purchase_entry_balance_facts(p_id,d.version))$new$);
end;$$;
