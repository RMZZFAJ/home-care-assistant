-- A cancellation reconciles already confirmed consumption; it never debits it again.
create table public.delivery_consumption_allocations (
 id uuid primary key default gen_random_uuid(),document_id uuid not null references public.operational_documents(id),
 request_id uuid not null,document_line_id uuid not null references public.document_lines(id),
 consumption_movement_id uuid not null references public.stock_movements(id),
 quantity numeric(18,6) not null check(quantity>0 and quantity<=1000000000),
 actor_id uuid not null references public.profiles(id),created_at timestamptz not null default clock_timestamp(),
 unique(document_line_id,consumption_movement_id)
);
create index delivery_consumption_source on public.delivery_consumption_allocations(consumption_movement_id);
alter table public.delivery_consumption_allocations enable row level security;
revoke all on public.delivery_consumption_allocations from public,anon,authenticated,service_role;
grant select on public.delivery_consumption_allocations to authenticated;
create policy delivery_consumption_read on public.delivery_consumption_allocations for select to authenticated
 using(exists(select 1 from public.operational_documents d where d.id=document_id and private.can(d.care_recipient_id,'ent.read')));
create trigger immutable_delivery_consumption_allocation before update or delete on public.delivery_consumption_allocations for each row execute function private.immutable_event();

create function private.delivery_cancellation_request(p_id uuid) returns jsonb language plpgsql stable set search_path='' as $$
declare d public.operational_documents;fact public.document_events;previous_status text;begin
 select * into d from public.operational_documents where id=p_id;
 if d.workflow_data ? 'deliveryCancellation' then return d.workflow_data->'deliveryCancellation';end if;
 if d.status<>'cancellation_pending' then return null;end if;
 select * into fact from public.document_events where document_id=p_id and action='ent.cancel' order by version desc limit 1;
 if not found then return null;end if;
 select body->>'status' into previous_status from public.document_events where document_id=p_id and version<fact.version order by version desc limit 1;
 return jsonb_build_object('id',fact.id,'source','legacy_event','sourceEventId',fact.id,'requestedBy',fact.actor_id,'requestedName',null,
  'requestedAt',fact.created_at,'requestedVersion',fact.version,'reason',fact.body->'event'->>'reason','previousStatus',previous_status,'status','pending');
end;$$;

create function private.delivery_cancellation_context(p_id uuid) returns jsonb language plpgsql stable set search_path='' as $$
declare d public.operational_documents;l public.document_lines;legacy record;request jsonb;pool jsonb;entry jsonb;source_refs jsonb;lines jsonb:='[]';
 idx integer;decimals integer;need numeric;free numeric;used numeric;available numeric;cutoff timestamptz;has_unknown boolean:=false;line_unknown boolean;transit numeric:=0;result jsonb;begin
 select * into d from public.operational_documents where id=p_id;
 request:=private.delivery_cancellation_request(p_id);if request is null then return null;end if;
 if request->>'status'<>'pending' then return jsonb_build_object('request',request,'history',coalesce(d.workflow_data->'deliveryCancellationHistory','[]'::jsonb),'lines',coalesce(request->'outcome'->'lines','[]'::jsonb),'sourceReady',true,'unresolvedTransit','0','referenceHash',null);end if;
 if not private.can(d.care_recipient_id,case when d.payload->>'destination'='FAMILY' then 'stock.family.read' else 'stock.team.read' end) then
  return jsonb_build_object('request',request,'history',coalesce(d.workflow_data->'deliveryCancellationHistory','[]'::jsonb),'sourceReady',false,'sourceAccess',false,'lines','[]'::jsonb,'referenceHash',null);
 end if;
 for l in select * from public.document_lines where document_id=p_id order by product_id,id loop
  line_unknown:=false;source_refs:='[]';available:=0;
  select quantity_decimals into decimals from public.care_recipient_products where care_recipient_id=d.care_recipient_id and product_id=l.product_id and unit=l.unit_snapshot;
  if not found then line_unknown:=true;end if;
  transit:=transit+greatest(l.quantity-l.accepted_quantity-l.reconciled_quantity,0);
  select min(m.created_at) into cutoff from public.stock_movements m where m.care_recipient_id=d.care_recipient_id and m.product_id=l.product_id
   and m.reference_type='document' and m.reference_id=p_id and m.source_location='TRANSIT' and m.destination_location=d.payload->>'destination';
  if l.accepted_quantity>0 and cutoff is null then line_unknown:=true;end if;
  select coalesce(jsonb_agg(jsonb_build_object('movementId',m.id,'reportId',m.reference_id,'recordedAt',m.created_at,
   'free',(m.quantity-coalesce((select sum(a.quantity) from public.delivery_consumption_allocations a where a.consumption_movement_id=m.id),0))::text) order by m.created_at,m.id),'[]'::jsonb) into pool
   from public.stock_movements m join public.consumption_reports r on r.id=m.reference_id and r.care_recipient_id=m.care_recipient_id and r.status='confirmed' and r.location=m.source_location
   where m.care_recipient_id=d.care_recipient_id and m.product_id=l.product_id and m.source_location=d.payload->>'destination' and m.destination_location is null and m.reference_type='consumption';
  -- Old events did not preserve individual source movements. Reserve their proven
  -- quantities virtually within their original temporal window, never against future consumption.
  for legacy in select cancellation.id,cancellation.created_at,issued.created_at as issued_at,legacy_line->>'consumedQuantity' as quantity
   from public.document_events cancellation join public.operational_documents issued on issued.id=cancellation.document_id
   cross join lateral jsonb_array_elements(coalesce(cancellation.body->'event'->'lines','[]')) legacy_line
   join public.document_lines original_line on original_line.id::text=legacy_line->>'lineId' and original_line.document_id=issued.id
   where cancellation.care_recipient_id=d.care_recipient_id and cancellation.action='ent.consent_cancel'
    and issued.payload->>'destination'=d.payload->>'destination' and original_line.product_id=l.product_id and legacy_line ? 'consumedQuantity'
   order by cancellation.created_at,cancellation.id,original_line.id loop
   if coalesce(legacy.quantity,'') !~ '^[0-9]+([.][0-9]+)?$' then line_unknown:=true;continue;end if;
   need:=legacy.quantity::numeric;
   if need>0 then for idx in 0..jsonb_array_length(pool)-1 loop
    entry:=pool->idx;free:=(entry->>'free')::numeric;
    if free>0 and (entry->>'recordedAt')::timestamptz>=legacy.issued_at and (entry->>'recordedAt')::timestamptz<=legacy.created_at then
     used:=least(need,free);pool:=jsonb_set(pool,array[idx::text,'free'],to_jsonb((free-used)::text));need:=need-used;
    end if;exit when need=0;
   end loop;end if;
   if need>0 then line_unknown:=true;end if;
  end loop;
  if cutoff is not null then for entry in select value from jsonb_array_elements(pool) loop
   free:=(entry->>'free')::numeric;
   if free>0 and (entry->>'recordedAt')::timestamptz>=cutoff then
    used:=least(free,l.accepted_quantity-available);
    if used>0 then source_refs:=source_refs||jsonb_build_array((entry-'free')||jsonb_build_object('quantity',used::text));available:=available+used;end if;
   end if;exit when available=l.accepted_quantity;
  end loop;end if;
  has_unknown:=has_unknown or line_unknown;
  lines:=lines||jsonb_build_array(jsonb_build_object('lineId',l.id,'productId',l.product_id,'name',l.name_snapshot,'unit',l.unit_snapshot,
   'acceptedQuantity',l.accepted_quantity::text,'quantityDecimals',decimals,'availableConsumedQuantity',available::text,'minimumReturnQuantity',greatest(l.accepted_quantity-available,0)::text,
   'unresolvedTransit',greatest(l.quantity-l.accepted_quantity-l.reconciled_quantity,0)::text,'sourceReady',not line_unknown,'consumptionReferences',source_refs));
 end loop;
 result:=jsonb_build_object('request',request,'history',coalesce(d.workflow_data->'deliveryCancellationHistory','[]'::jsonb),'lines',lines,'sourceReady',not has_unknown,'unresolvedTransit',transit::text,'referenceVersion',d.version);
 return result||jsonb_build_object('referenceHash',encode(extensions.digest(result::text,'sha256'),'hex'));
end;$$;

create function private.command_delivery_cancellation(p_id uuid,p_action text,p_body jsonb,p_key uuid,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;event public.document_events;l public.document_lines;request jsonb;plan jsonb;x jsonb;line_plan jsonb;reference jsonb;history jsonb;
 outcome jsonb;results jsonb:='[]';allocations jsonb;qty numeric;consumed numeric;need numeric;used numeric;decimals integer;cap text;request_id uuid;
 before_revision bigint;return_ids jsonb;resume_status text;now_at timestamptz;begin
 select * into d from public.operational_documents where id=p_id;if not found or d.type<>'ENT' then raise exception 'delivery not found';end if;
 perform private.require_cap(d.care_recipient_id,'ent.read');
 if p_action is null or p_action not in ('cancel','consent_cancel','refuse_cancellation','withdraw_cancellation') or p_key is null or p_version is null or p_version<1
  or jsonb_typeof(p_body) is distinct from 'object' or jsonb_typeof(p_body->'reason') is distinct from 'string' or length(trim(p_body->>'reason')) not between 3 and 1000 then raise exception 'invalid delivery cancellation command' using errcode='22023';end if;
 if p_action='cancel' then
  if (p_body-'reason')<>'{}'::jsonb then raise exception 'invalid delivery cancellation request' using errcode='22023';end if;
 else
  if coalesce(p_body->>'requestId','') !~ '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$' then raise exception 'invalid cancellation request reference' using errcode='22023';end if;
  request_id:=(p_body->>'requestId')::uuid;
  if p_action='consent_cancel' then
   if (p_body-'reason'-'requestId'-'referenceHash'-'lines')<>'{}'::jsonb or coalesce(p_body->>'referenceHash','') !~ '^[0-9a-f]{64}$' or jsonb_typeof(p_body->'lines') is distinct from 'array' then raise exception 'invalid delivery consumption reference' using errcode='22023';end if;
  elsif (p_body-'reason'-'requestId')<>'{}'::jsonb then raise exception 'invalid cancellation decision' using errcode='22023';end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||d.care_recipient_id,0));
 select * into strict d from public.operational_documents where id=p_id for update;perform private.require_cap(d.care_recipient_id,'ent.read');
 select * into event from public.document_events where actor_id=auth.uid() and idempotency_key=p_key;
 if found then
  if event.document_id<>p_id or event.action<>'ent.'||p_action or event.body->'event'<>p_body then raise exception 'idempotency conflict' using errcode='23505';end if;
  return public.operational_document(p_id)||jsonb_build_object('commandOutcome',jsonb_build_object('state','recovered','action',p_action,'eventId',event.id,'version',event.version,'requestId',coalesce(request_id::text,event.body->'deliveryCancellation'->'request'->>'id')));
 end if;
 request:=private.delivery_cancellation_request(p_id);
 if p_action<>'cancel' then
  if request is null or request->>'id' is distinct from request_id::text then raise exception 'delivery cancellation decision conflict' using errcode='P0001';end if;
  if request->>'status' is distinct from 'pending' then
   if request->'outcome'->>'action'=p_action and request->'outcome'->>'actorId'=auth.uid()::text and request->'outcome'->'intent'=p_body then
    return public.operational_document(p_id)||jsonb_build_object('commandOutcome',jsonb_build_object('state','recovered','action',p_action,'requestId',request_id,'version',request->'outcome'->'version'));
   end if;
   raise exception 'delivery cancellation decision conflict' using errcode='P0001';
  end if;
 end if;
 cap:=case when p_action in ('cancel','withdraw_cancellation') then 'ent.cancel' else 'ent.receive' end;
 perform private.require_cap(d.care_recipient_id,cap);
 if p_action in ('consent_cancel','refuse_cancellation') and d.recipient_id is distinct from auth.uid() then raise exception 'original recipient cancellation decision required' using errcode='42501';end if;
 if p_action='withdraw_cancellation' and request->>'requestedBy' is distinct from auth.uid()::text then raise exception 'original cancellation requester required' using errcode='42501';end if;
 if d.version<>p_version then raise exception 'stale document version' using errcode='P0001';end if;
 now_at:=clock_timestamp();
 if p_action='cancel' then
  if request->>'status'='pending' then raise exception 'delivery cancellation decision conflict' using errcode='P0001';end if;
  if d.status in ('draft','cancelled','rejected') or not exists(select 1 from public.document_lines where document_id=p_id and accepted_quantity>0) then raise exception 'invalid cancellation request state';end if;
  history:=coalesce(d.workflow_data->'deliveryCancellationHistory','[]'::jsonb);if request is not null then history:=history||jsonb_build_array(request);end if;
  request_id:=gen_random_uuid();
  request:=jsonb_build_object('id',request_id,'source','server_record','requestedBy',auth.uid(),'requestedName',(select full_name from public.profiles where id=auth.uid()),'requestedAt',now_at,
   'requestedVersion',d.version+1,'previousStatus',d.status,'reason',p_body->>'reason','status','pending');
  update public.operational_documents set version=version+1,status='cancellation_pending',workflow_data=workflow_data||jsonb_build_object('deliveryCancellation',request,'deliveryCancellationHistory',history,'cancellationRequestedBy',auth.uid(),'cancellationReason',p_body->>'reason') where id=p_id;
 else
  if d.status<>'cancellation_pending' then raise exception 'delivery cancellation decision conflict' using errcode='P0001';end if;
  if p_action='consent_cancel' then
   perform private.require_cap(d.care_recipient_id,case when d.payload->>'destination'='FAMILY' then 'stock.family.read' else 'stock.team.read' end);
   plan:=private.delivery_cancellation_context(p_id);
   if not (plan->>'sourceReady')::boolean then raise exception 'delivery consumption reference unavailable' using errcode='22023';end if;
   if (plan->>'unresolvedTransit')::numeric>0 then raise exception 'delivery transit requires reconciliation' using errcode='22023';end if;
   if plan->>'referenceHash'<>p_body->>'referenceHash' then raise exception 'stale delivery consumption reference' using errcode='P0001';end if;
   if jsonb_array_length(p_body->'lines')<>(select count(*) from public.document_lines where document_id=p_id)
    or (select count(distinct z->>'lineId') from jsonb_array_elements(p_body->'lines') z)<>jsonb_array_length(p_body->'lines') then raise exception 'invalid cancellation return lines' using errcode='22023';end if;
   select coalesce(max(movement_revision),0) into before_revision from public.stock_movements where care_recipient_id=d.care_recipient_id;
   for l in select * from public.document_lines where document_id=p_id order by product_id,id loop
    select value into x from jsonb_array_elements(p_body->'lines') where value->>'lineId'=l.id::text;
    if x is null or (x-'lineId'-'returnQuantity')<>'{}'::jsonb or coalesce(x->>'returnQuantity','') !~ '^[0-9]+([.][0-9]+)?$' then raise exception 'invalid actual return quantity' using errcode='22023';end if;
    qty:=(x->>'returnQuantity')::numeric;select quantity_decimals into decimals from public.care_recipient_products where care_recipient_id=d.care_recipient_id and product_id=l.product_id and unit=l.unit_snapshot;
    if not found then raise exception 'delivery unit reference changed' using errcode='P0001';end if;perform private.require_exact_quantity(qty,decimals,true);
    if qty>l.accepted_quantity then raise exception 'actual return exceeds acceptance' using errcode='22023';end if;
    consumed:=l.accepted_quantity-qty;need:=consumed;allocations:='[]';
    select value into strict line_plan from jsonb_array_elements(plan->'lines') where value->>'lineId'=l.id::text;
    if consumed>(line_plan->>'availableConsumedQuantity')::numeric then raise exception 'confirmed delivery consumption insufficient' using errcode='22023';end if;
    for reference in select value from jsonb_array_elements(line_plan->'consumptionReferences') loop
     used:=least(need,(reference->>'quantity')::numeric);exit when used=0;
     insert into public.delivery_consumption_allocations(document_id,request_id,document_line_id,consumption_movement_id,quantity,actor_id)
      values(p_id,request_id,l.id,(reference->>'movementId')::uuid,used,auth.uid());
     allocations:=allocations||jsonb_build_array(reference||jsonb_build_object('quantity',used::text));need:=need-used;
    end loop;
    if need<>0 then raise exception 'confirmed delivery consumption insufficient' using errcode='22023';end if;
    if qty>0 then perform private.move_stock(d.care_recipient_id,l.product_id,qty,d.payload->>'destination',d.payload->>'source','Devolução real consentida no cancelamento ENT','document',p_id);end if;
    select coalesce(jsonb_agg(m.id order by m.movement_revision),'[]'::jsonb) into return_ids from public.stock_movements m where m.care_recipient_id=d.care_recipient_id and m.product_id=l.product_id and m.reference_type='document' and m.reference_id=p_id and m.movement_revision>before_revision;
    results:=results||jsonb_build_array(jsonb_build_object('lineId',l.id,'productId',l.product_id,'name',l.name_snapshot,'unit',l.unit_snapshot,'acceptedQuantity',l.accepted_quantity::text,'returnQuantity',qty::text,'consumedQuantity',consumed::text,'consumptionReferences',allocations,'returnMovementIds',return_ids));
   end loop;
   resume_status:='cancelled';
  else
   select case when exists(select 1 from public.document_lines where document_id=p_id and (accepted_quantity+reconciled_quantity<quantity or coalesce((metadata->>'issueOpen')::boolean,false))) then 'disputed' else 'confirmed' end into resume_status;
  end if;
  outcome:=jsonb_build_object('action',p_action,'actorId',auth.uid(),'actorName',(select full_name from public.profiles where id=auth.uid()),'recordedAt',now_at,'reason',p_body->>'reason','version',d.version+1,'intent',p_body,'lines',results);
  request:=request||jsonb_build_object('status',case p_action when 'consent_cancel' then 'consented' when 'refuse_cancellation' then 'refused' else 'withdrawn' end,'outcome',outcome);
  update public.operational_documents set version=version+1,status=resume_status,workflow_data=workflow_data||jsonb_build_object('deliveryCancellation',request) where id=p_id;
 end if;
 perform private.record_document_event(p_id,'ent.'||p_action,p_body,p_key);
 perform private.require_cap(d.care_recipient_id,cap);
 if p_action='consent_cancel' then perform private.require_cap(d.care_recipient_id,case when d.payload->>'destination'='FAMILY' then 'stock.family.read' else 'stock.team.read' end);end if;
 return public.operational_document(p_id)||jsonb_build_object('commandOutcome',jsonb_build_object('state','committed','action',p_action,'requestId',request_id,'version',d.version+1));
end;$$;

do $migration$
declare definition text;anchor text;replacement text;begin
 definition:=pg_get_functiondef('public.supply_document_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
 anchor:='select * into v_d from public.operational_documents where id=p_id;';
 replacement:=anchor||E'\n if v_d.type=''ENT'' and (p_action in (''consent_cancel'',''refuse_cancellation'',''withdraw_cancellation'') or p_action=''cancel'' and exists(select 1 from public.document_lines where document_id=p_id and accepted_quantity>0)) then return private.command_delivery_cancellation(p_id,p_action,p_body,p_key,p_version);end if;';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'delivery command entry anchor mismatch';end if;execute replace(definition,anchor,replacement);
 definition:=pg_get_functiondef('public.operational_document(uuid)'::regprocedure);
 anchor:='return to_jsonb(d)||';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'delivery read model anchor mismatch';end if;
 execute replace(definition,anchor,'return to_jsonb(d)||case when d.type=''ENT'' then jsonb_build_object(''deliveryCancellation'',private.delivery_cancellation_context(p_id)) else ''{}''::jsonb end||');
 definition:=pg_get_functiondef('private.science_snapshot()'::regprocedure);
 anchor:='new.content_hash:=encode(extensions.digest(new.body::text,''sha256''),''hex'');';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'delivery cancellation snapshot anchor mismatch';end if;
 execute replace(definition,anchor,'if d.type=''ENT'' then new.body:=new.body||jsonb_build_object(''deliveryCancellation'',private.delivery_cancellation_context(d.id));end if;'||E'\n '||anchor);
 -- Resolving a real transit discrepancy does not silently withdraw its active cancellation request.
 definition:=pg_get_functiondef('public.audited_legacy_supply_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
 anchor:='update public.operational_documents set status=case when exists(select 1 from public.document_lines where document_id=p_id and coalesce((metadata->>''issueOpen'')::boolean,false)) then ''disputed'' else ''confirmed'' end where id=p_id;';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'delivery resolution pending-state anchor mismatch';end if;
 replacement:=replace(anchor,'status=case when exists','status=case when private.delivery_cancellation_request(p_id)->>''status''=''pending'' then ''cancellation_pending'' when exists');definition:=replace(definition,anchor,replacement);
 anchor:='if d.status<>''disputed'' or auth.uid()<>d.recipient_id and not public.can_manage_recipient(d.care_recipient_id) then raise exception ''resolution not authorized'' using errcode=''42501'';end if;';
 replacement:='if d.status not in (''disputed'',''cancellation_pending'') or not (auth.uid()=d.recipient_id and private.can(d.care_recipient_id,''ent.receive'') or auth.uid()<>d.recipient_id and public.can_manage_recipient(d.care_recipient_id) and private.can(d.care_recipient_id,''access.manage'')) then raise exception ''resolution not authorized'' using errcode=''42501'';end if;';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'delivery resolution authority anchor mismatch';end if;definition:=replace(definition,anchor,replacement);
 anchor:='perform private.record_document_event(p_id,lower(d.type)||''.''||p_action,p_body,p_key);';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'delivery resolution final authority anchor mismatch';end if;
 execute replace(definition,anchor,anchor||E'\n if d.type=''ENT'' and p_action=''resolve'' then perform private.require_cap(d.care_recipient_id,case when auth.uid()=d.recipient_id then ''ent.receive'' else ''access.manage'' end);end if;');
end;$migration$;
revoke all on function private.delivery_cancellation_request(uuid),private.delivery_cancellation_context(uuid),private.command_delivery_cancellation(uuid,text,jsonb,uuid,integer) from public,anon,authenticated,service_role;
notify pgrst,'reload schema';
