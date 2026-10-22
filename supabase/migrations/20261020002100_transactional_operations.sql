alter table public.requisitions add column request_intent jsonb;
-- Reconstruct the stored intention from proven child rows, not a caller's old hash.
-- Observation order was not persisted by older versions, so canonicalize its text.
update public.requisitions r set request_intent=jsonb_build_object('careRecipientId',r.care_recipient_id,
  'lines',coalesce((select jsonb_agg(jsonb_build_object('productId',i.product_id,'currentStock',i.current_stock,'urgent',i.urgent) order by i.product_id) from public.requisition_items i where i.requisition_id=r.id and i.product_id is not null),'[]'::jsonb),
  'extraItems',coalesce((select jsonb_agg(jsonb_build_object('customName',trim(i.custom_name),'currentStock',i.current_stock,'urgent',i.urgent) order by trim(i.custom_name),i.current_stock,i.urgent) from public.requisition_items i where i.requisition_id=r.id and i.product_id is null),'[]'::jsonb),
  'observations',coalesce((select jsonb_agg(trim(o.body) order by trim(o.body)) from public.requisition_observations o where o.requisition_id=r.id),'[]'::jsonb))
where not r.is_historical;
alter table public.requisitions drop constraint requisitions_protocol_format_check;
alter table public.requisitions add constraint requisitions_protocol_format_check check(protocol ~ '^HC-[0-9]{8}-[A-Z0-9]{8}$' or protocol ~ '^HC-[0-9]{6,}$');
create or replace function public.protect_requisition_identity() returns trigger
language plpgsql set search_path=public as $$ begin
  if (new.protocol,new.protocol_number,new.created_by,new.care_recipient_id,new.idempotency_key,new.request_intent,new.payload_hash)
    is distinct from (old.protocol,old.protocol_number,old.created_by,old.care_recipient_id,old.idempotency_key,old.request_intent,old.payload_hash)
  then raise exception 'requisition identity is immutable'; end if;
  return new;
end; $$;
create trigger immutable_requisition_identity before update on public.requisitions for each row execute function public.protect_requisition_identity();

create or replace function public.submit_requisition(p_care_recipient_id uuid,p_idempotency_key uuid,p_payload_hash text,p_lines jsonb,p_extra_items jsonb,p_observations jsonb)
returns table(requisition_id uuid,protocol text,created_at timestamptz)
language plpgsql security definer set search_path=public,extensions as $$
declare r public.requisitions; v_intent jsonb; v_hash text; v_line jsonb; p public.care_recipient_products; v_number bigint;
begin
  if not public.recipient_can(p_care_recipient_id,'submit') then raise exception 'requisition authorization required' using errcode='42501'; end if;
  if p_idempotency_key is null or jsonb_typeof(p_lines) is distinct from 'array' or jsonb_typeof(p_extra_items) is distinct from 'array' or jsonb_typeof(p_observations) is distinct from 'array'
    then raise exception 'invalid payload shape'; end if;
  if jsonb_array_length(p_lines)>1000 or jsonb_array_length(p_extra_items)>20 or jsonb_array_length(p_observations)>50 or jsonb_array_length(p_lines)+jsonb_array_length(p_extra_items)=0 then raise exception 'invalid payload limits'; end if;
  if exists(select 1 from jsonb_array_elements(p_lines) x where jsonb_typeof(x->'productId') is distinct from 'string'
    or jsonb_typeof(x->'currentStock') is distinct from 'number' or (x->>'currentStock')!~'^[0-9]+$'
    or jsonb_typeof(x->'urgent') is distinct from 'boolean')
    or exists(select 1 from jsonb_array_elements(p_lines) x group by x->>'productId' having count(*)>1)
    or exists(select 1 from jsonb_array_elements(p_extra_items) x where jsonb_typeof(x->'customName') is distinct from 'string'
      or length(trim(x->>'customName')) not between 1 and 200 or jsonb_typeof(x->'currentStock') is distinct from 'number'
      or (x->>'currentStock')!~'^[0-9]+$' or jsonb_typeof(x->'urgent') is distinct from 'boolean')
    or exists(select 1 from jsonb_array_elements(p_observations) x where jsonb_typeof(x) is distinct from 'string' or length(trim(x#>>'{}')) not between 1 and 1000)
  then raise exception 'invalid requisition item'; end if;
  v_intent:=jsonb_build_object('careRecipientId',p_care_recipient_id,
    'lines',coalesce((select jsonb_agg(jsonb_build_object('productId',x->>'productId','currentStock',(x->>'currentStock')::integer,'urgent',(x->>'urgent')::boolean) order by x->>'productId') from jsonb_array_elements(p_lines) x),'[]'::jsonb),
    'extraItems',coalesce((select jsonb_agg(jsonb_build_object('customName',trim(x->>'customName'),'currentStock',(x->>'currentStock')::integer,'urgent',(x->>'urgent')::boolean) order by trim(x->>'customName'),(x->>'currentStock')::integer,(x->>'urgent')::boolean) from jsonb_array_elements(p_extra_items) x),'[]'::jsonb),
    'observations',coalesce((select jsonb_agg(trim(value) order by trim(value)) from jsonb_array_elements_text(p_observations)),'[]'::jsonb));
  v_hash:=encode(digest(v_intent::text,'sha256'),'hex');
  perform pg_advisory_xact_lock(hashtextextended('requisition:'||auth.uid()||':'||p_idempotency_key,0));
  select * into r from public.requisitions where created_by=auth.uid() and idempotency_key=p_idempotency_key;
  if found then
    if r.care_recipient_id is distinct from p_care_recipient_id or r.request_intent is distinct from v_intent then raise exception 'idempotency conflict' using errcode='23505'; end if;
    return query select r.id,r.protocol,r.created_at; return;
  end if;
  for v_line in select value from jsonb_array_elements(p_lines) loop
    select * into p from public.care_recipient_products where care_recipient_id=p_care_recipient_id and product_id=v_line->>'productId' and is_active;
    if not found then raise exception 'invalid patient catalogue product'; end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(p_extra_items) x join public.care_recipient_products c on c.care_recipient_id=p_care_recipient_id and c.is_active
    where exists(select 1 from unnest(array_append(c.aliases,c.name)) a where unaccent(lower(trim(a)))=unaccent(lower(trim(x->>'customName'))))) then raise exception 'custom item matches patient catalogue'; end if;
  v_number:=nextval('public.requisition_protocol_number_seq');
  insert into public.requisitions(protocol,protocol_number,created_by,care_recipient_id,status,idempotency_key,payload_hash,request_intent,requester_name_snapshot,recipient_name_snapshot)
  values('HC-'||case when length(v_number::text)<6 then lpad(v_number::text,6,'0') else v_number::text end,v_number,auth.uid(),p_care_recipient_id,'submitted',p_idempotency_key,v_hash,v_intent,
    (select full_name from public.profiles where id=auth.uid()),(select display_name from public.care_recipients where id=p_care_recipient_id)) returning * into r;
  insert into public.requisition_items(requisition_id,product_id,current_stock,urgent,product_name_snapshot,category_snapshot,unit_snapshot,snapshot_source)
  select r.id,c.product_id,(x->>'currentStock')::integer,(x->>'urgent')::boolean,c.name,c.category::text,c.unit,'persisted'
  from jsonb_array_elements(p_lines) x join public.care_recipient_products c on c.care_recipient_id=p_care_recipient_id and c.product_id=x->>'productId';
  insert into public.requisition_items(requisition_id,custom_name,current_stock,urgent,product_name_snapshot,snapshot_source)
  select r.id,trim(x->>'customName'),(x->>'currentStock')::integer,(x->>'urgent')::boolean,trim(x->>'customName'),'persisted' from jsonb_array_elements(p_extra_items) x;
  insert into public.requisition_observations(requisition_id,created_by,body) select r.id,auth.uid(),trim(value) from jsonb_array_elements_text(p_observations);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'requisition.created','requisition',r.id,jsonb_build_object('care_recipient_id',p_care_recipient_id,'protocol',r.protocol));
  return query select r.id,r.protocol,r.created_at;
end; $$;

create or replace function public.transition_requisition_status(p_requisition_id uuid,p_to_status public.requisition_status,p_reason text default null)
returns public.requisitions language plpgsql security definer set search_path=public as $$
declare r public.requisitions; v_from public.requisition_status;
begin
  select * into r from public.requisitions where id=p_requisition_id for update;
  if not found or not public.recipient_can(r.care_recipient_id,'review') then raise exception 'status transition not authorized' using errcode='42501'; end if;
  if not coalesce((r.status,p_to_status) in (('submitted','under_review'),('submitted','cancelled'),('under_review','approved'),('under_review','cancelled'),('approved','separated'),('separated','delivered')),false)
    then raise exception 'invalid status transition'; end if;
  if p_reason is null or length(trim(p_reason)) not between 1 and 1000 then raise exception 'transition reason required'; end if;
  v_from:=r.status;
  update public.requisitions set status=p_to_status,updated_at=now() where id=r.id returning * into r;
  update public.requisition_status_history set reason=trim(p_reason) where id=(select id from public.requisition_status_history where requisition_id=r.id order by changed_at desc,id desc limit 1);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'requisition.status.changed','requisition',r.id,jsonb_build_object('care_recipient_id',r.care_recipient_id,'from',v_from,'to',p_to_status));
  return r;
end; $$;

alter table public.stock_movements add column payload_hash text, add column extraordinary_confirmed boolean not null default false,
  add column source_balance_before bigint,add column source_balance_after bigint,add column destination_balance_before bigint,add column destination_balance_after bigint,
  add column movement_revision bigint generated by default as identity;
update public.stock_movements set payload_hash=encode(digest(jsonb_build_array(care_recipient_id,product_id,quantity,movement_type,source_location,destination_location,trim(justification),reference_type,reference_id)::text,'sha256'),'hex')
where idempotency_key is not null;
create or replace function public.guard_stock_movement_balance() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_source bigint:=0;v_destination bigint:=0;
begin
  if new.care_recipient_id is null then raise exception 'patient required for new movements'; end if;
  perform pg_advisory_xact_lock(hashtextextended('stock:'||new.care_recipient_id,0));
  -- Allocate after serialization, rather than depending on transaction-start timestamps.
  new.movement_revision:=nextval(pg_get_serial_sequence('public.stock_movements','movement_revision'));
  if new.movement_type='inbound' and (new.source_location is not null or new.destination_location is null)
    or new.movement_type='outbound' and new.source_location is null
    or new.movement_type='adjustment' and (new.source_location is null)=(new.destination_location is null)
    or new.source_location is not null and new.source_location=new.destination_location
    or new.source_location is not null and new.source_location not in ('FAMILY','CARE_TEAM')
    or new.destination_location is not null and new.destination_location not in ('FAMILY','CARE_TEAM') then raise exception 'invalid stock locations'; end if;
  if new.source_location is not null then
    select coalesce(sum(case when destination_location=new.source_location then quantity else 0 end - case when source_location=new.source_location then quantity else 0 end),0) into v_source
    from public.stock_movements where care_recipient_id=new.care_recipient_id and product_id=new.product_id;
    if v_source<new.quantity and not (new.movement_type='adjustment' and new.extraordinary_confirmed and new.reference_type='extraordinary_adjustment' and public.is_global_administrator()) then raise exception 'insufficient stock' using errcode='23514'; end if;
    new.source_balance_before:=v_source;new.source_balance_after:=v_source-new.quantity;
  end if;
  if new.destination_location is not null then
    select coalesce(sum(case when destination_location=new.destination_location then quantity else 0 end - case when source_location=new.destination_location then quantity else 0 end),0) into v_destination
    from public.stock_movements where care_recipient_id=new.care_recipient_id and product_id=new.product_id;
    new.destination_balance_before:=v_destination;new.destination_balance_after:=v_destination+new.quantity;
  end if;
  return new;
end; $$;
create or replace function public.record_stock_movement(p_care_recipient_id uuid,p_product_id text,p_quantity integer,p_movement_type public.stock_movement_type,p_source_location text,p_destination_location text,p_justification text,p_idempotency_key uuid default null,p_reference_type text default null,p_reference_id uuid default null)
returns public.stock_movements language plpgsql security definer set search_path=public,extensions as $$
declare v public.stock_movements;v_hash text;
begin
  if not public.recipient_can(p_care_recipient_id,'stock') then raise exception 'stock management not authorized' using errcode='42501'; end if;
  if p_quantity is null or p_quantity<=0 or p_movement_type is null or p_justification is null or length(trim(p_justification)) not between 1 and 1000 or p_idempotency_key is null then raise exception 'invalid stock movement'; end if;
  v_hash:=encode(digest(jsonb_build_array(p_care_recipient_id,p_product_id,p_quantity,p_movement_type,p_source_location,p_destination_location,trim(p_justification),p_reference_type,p_reference_id)::text,'sha256'),'hex');
  perform pg_advisory_xact_lock(hashtextextended('movement:'||auth.uid()||':'||p_idempotency_key,0));
  select * into v from public.stock_movements where performed_by=auth.uid() and idempotency_key=p_idempotency_key;
  if found then
    if v.payload_hash is distinct from v_hash then raise exception 'idempotency conflict' using errcode='23505'; end if;
    return v;
  end if;
  if not exists(select 1 from public.care_recipient_products where care_recipient_id=p_care_recipient_id and product_id=p_product_id and is_active) then raise exception 'invalid patient catalogue product'; end if;
  insert into public.stock_movements(product_id,quantity,movement_type,performed_by,justification,care_recipient_id,source_location,destination_location,idempotency_key,reference_type,reference_id,payload_hash)
  values(p_product_id,p_quantity,p_movement_type,auth.uid(),trim(p_justification),p_care_recipient_id,p_source_location,p_destination_location,p_idempotency_key,p_reference_type,p_reference_id,v_hash) returning * into v;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'stock.movement.created','stock_movement',v.id,jsonb_build_object('care_recipient_id',p_care_recipient_id,'product_id',p_product_id,'quantity',p_quantity,'source_before',v.source_balance_before,'source_after',v.source_balance_after,'destination_before',v.destination_balance_before,'destination_after',v.destination_balance_after));
  return v;
end; $$;
create or replace function public.extraordinary_stock_adjustment(p_care_recipient_id uuid,p_product_id text,p_quantity integer,p_location text,p_justification text,p_confirmation boolean,p_idempotency_key uuid)
returns public.stock_movements language plpgsql security definer set search_path=public,extensions as $$
declare v public.stock_movements;v_hash text;
begin
  if not public.is_global_administrator() or not public.recipient_can(p_care_recipient_id,'stock') or not coalesce(p_confirmation,false) then raise exception 'confirmed global administrator required' using errcode='42501'; end if;
  if p_quantity is null or p_quantity=0 or p_quantity=-2147483648 or p_location is null or p_location not in ('FAMILY','CARE_TEAM') or p_idempotency_key is null or p_justification is null or length(trim(p_justification)) not between 1 and 1000 then raise exception 'invalid extraordinary adjustment'; end if;
  v_hash:=encode(digest(jsonb_build_array('extraordinary',p_care_recipient_id,p_product_id,p_quantity,p_location,trim(p_justification))::text,'sha256'),'hex');
  perform pg_advisory_xact_lock(hashtextextended('movement:'||auth.uid()||':'||p_idempotency_key,0));
  select * into v from public.stock_movements where performed_by=auth.uid() and idempotency_key=p_idempotency_key;
  if found then if v.payload_hash is distinct from v_hash then raise exception 'idempotency conflict'; end if;return v;end if;
  if not exists(select 1 from public.care_recipient_products where care_recipient_id=p_care_recipient_id and product_id=p_product_id and is_active) then raise exception 'invalid patient catalogue product'; end if;
  insert into public.stock_movements(product_id,quantity,movement_type,performed_by,justification,care_recipient_id,source_location,destination_location,idempotency_key,reference_type,payload_hash,extraordinary_confirmed)
  values(p_product_id,abs(p_quantity),'adjustment',auth.uid(),trim(p_justification),p_care_recipient_id,case when p_quantity<0 then p_location end,case when p_quantity>0 then p_location end,p_idempotency_key,'extraordinary_adjustment',v_hash,true) returning * into v;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'stock.extraordinary.adjustment','stock_movement',v.id,jsonb_build_object('care_recipient_id',p_care_recipient_id,'quantity',p_quantity,'location',p_location,'reason',trim(p_justification),'confirmed',true));
  return v;
end; $$;

alter table public.stock_inventories drop constraint stock_inventories_status_check;
alter table public.stock_inventories add constraint stock_inventories_status_check check(status in ('draft','submitted','under_review','approved','rejected','cancelled'));
alter table public.stock_inventories add column reference_at timestamptz,add column review_reason text;
alter table public.stock_inventory_items add column reference_movement_id uuid references public.stock_movements(id);
create or replace function public.create_stock_inventory(p_care_recipient_id uuid,p_location text)
returns public.stock_inventories language plpgsql security definer set search_path=public as $$
declare v public.stock_inventories;
begin
  if not public.recipient_can(p_care_recipient_id,'count') then raise exception 'inventory authorization required' using errcode='42501'; end if;
  if p_location is null or p_location not in ('FAMILY','CARE_TEAM') then raise exception 'invalid location'; end if;
  perform pg_advisory_xact_lock(hashtextextended('stock:'||p_care_recipient_id,0));
  insert into public.stock_inventories(care_recipient_id,location,counted_by,reference_at) values(p_care_recipient_id,p_location,auth.uid(),clock_timestamp()) returning * into v;
  -- Snapshot every active product, including zero balances, while movement writers are excluded.
  insert into public.stock_inventory_items(inventory_id,product_id,counted_quantity,expected_quantity,reference_movement_id)
  select v.id,p.product_id,0,coalesce((select balance from public.current_stock_balances where care_recipient_id=p_care_recipient_id and product_id=p.product_id and location=p_location),0),
    (select id from public.stock_movements where care_recipient_id=p_care_recipient_id and product_id=p.product_id and (source_location=p_location or destination_location=p_location) order by movement_revision desc limit 1)
  from public.care_recipient_products p where p.care_recipient_id=p_care_recipient_id and p.is_active;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'inventory.created','stock_inventory',v.id,jsonb_build_object('care_recipient_id',p_care_recipient_id));
  return v;
end; $$;
alter table public.stock_inventory_items add column is_counted boolean not null default false;
create or replace function public.add_stock_inventory_item(p_inventory_id uuid,p_product_id text,p_counted_quantity bigint,p_justification text default null)
returns public.stock_inventory_items language plpgsql security definer set search_path=public as $$
declare v public.stock_inventory_items; i public.stock_inventories;
begin
  select * into i from public.stock_inventories where id=p_inventory_id for update;
  if not found or i.status<>'draft' then raise exception 'inventory not editable'; end if;
  if not public.recipient_can(i.care_recipient_id,'count') then raise exception 'inventory authorization required' using errcode='42501'; end if;
  if p_counted_quantity is null or p_counted_quantity<0 or p_counted_quantity>2147483647 then raise exception 'invalid count'; end if;
  update public.stock_inventory_items set counted_quantity=p_counted_quantity,justification=nullif(trim(p_justification),''),is_counted=true where inventory_id=p_inventory_id and product_id=p_product_id returning * into v;
  if not found then raise exception 'product absent from inventory snapshot; open a new inventory'; end if;
  return v;
end; $$;
create or replace function public.submit_stock_inventory(p_inventory_id uuid) returns public.stock_inventories
language plpgsql security definer set search_path=public as $$
declare i public.stock_inventories;
begin
  select * into i from public.stock_inventories where id=p_inventory_id for update;
  if not found or i.status<>'draft' or not public.recipient_can(i.care_recipient_id,'count') then raise exception 'inventory cannot be submitted' using errcode='42501'; end if;
  if not exists(select 1 from public.stock_inventory_items where inventory_id=i.id)
    or exists(select 1 from public.stock_inventory_items where inventory_id=i.id and (not is_counted or expected_quantity is null or counted_quantity<>expected_quantity and justification is null)) then raise exception 'complete all counts and justify divergences'; end if;
  update public.stock_inventories set status='submitted',counted_at=now() where id=i.id returning * into i;
  return i;
end; $$;
create or replace function public.approve_stock_inventory(p_inventory_id uuid) returns public.stock_inventories
language plpgsql security definer set search_path=public as $$
declare i public.stock_inventories;x public.stock_inventory_items;v_current uuid;v_delta bigint;
begin
  select * into i from public.stock_inventories where id=p_inventory_id for update;
  if not found or not public.recipient_can(i.care_recipient_id,'review') then raise exception 'inventory approval required' using errcode='42501'; end if;
  if i.status='approved' then return i; end if;
  if i.status not in ('submitted','under_review') or i.reference_at is null then raise exception 'inventory must be recounted from a current snapshot'; end if;
  perform pg_advisory_xact_lock(hashtextextended('stock:'||i.care_recipient_id,0));
  -- Validate all references before inserting any adjustment.
  for x in select * from public.stock_inventory_items where inventory_id=i.id order by product_id loop
    select id into v_current from public.stock_movements where care_recipient_id=i.care_recipient_id and product_id=x.product_id and (source_location=i.location or destination_location=i.location) order by movement_revision desc limit 1;
    if v_current is distinct from x.reference_movement_id or x.expected_quantity is null or not x.is_counted then raise exception 'inventory reference changed; recount required' using errcode='40001'; end if;
  end loop;
  for x in select * from public.stock_inventory_items where inventory_id=i.id order by product_id loop
    v_delta:=x.counted_quantity-x.expected_quantity;
    if abs(v_delta)>2147483647 then raise exception 'inventory adjustment exceeds allowed quantity'; end if;
    if v_delta<>0 then
      if x.justification is null then raise exception 'divergence justification required'; end if;
      insert into public.stock_movements(product_id,quantity,movement_type,performed_by,justification,care_recipient_id,source_location,destination_location,reference_type,reference_id)
      values(x.product_id,abs(v_delta)::integer,'adjustment',auth.uid(),x.justification,i.care_recipient_id,case when v_delta<0 then i.location end,case when v_delta>0 then i.location end,'inventory',i.id);
    end if;
  end loop;
  update public.stock_inventories set status='approved',approved_by=auth.uid(),approved_at=now() where id=i.id returning * into i;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'inventory.approved','stock_inventory',i.id,jsonb_build_object('care_recipient_id',i.care_recipient_id));
  return i;
end; $$;

create or replace function public.recount_stock_inventory(p_inventory_id uuid) returns public.stock_inventories
language plpgsql security definer set search_path=public as $$
declare i public.stock_inventories;v public.stock_inventories;
begin
  select * into i from public.stock_inventories where id=p_inventory_id for update;
  if not found or not public.recipient_can(i.care_recipient_id,'count') or i.status in ('approved','cancelled') then raise exception 'inventory cannot be recounted' using errcode='42501'; end if;
  update public.stock_inventories set status='cancelled',review_reason='substituído por nova contagem' where id=i.id;
  v:=public.create_stock_inventory(i.care_recipient_id,i.location);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'inventory.recounted','stock_inventory',v.id,jsonb_build_object('care_recipient_id',i.care_recipient_id,'previous_inventory_id',i.id));
  return v;
end; $$;
create unique index inventory_adjustment_once on public.stock_movements(reference_id,product_id) where reference_type='inventory';
create or replace function public.review_stock_inventory(p_inventory_id uuid,p_action text,p_reason text default null)
returns public.stock_inventories language plpgsql security definer set search_path=public as $$
declare i public.stock_inventories;
begin
  select * into i from public.stock_inventories where id=p_inventory_id for update;
  if not found or not public.recipient_can(i.care_recipient_id,'review') then raise exception 'inventory review authorization required' using errcode='42501'; end if;
  if p_action is null or p_action not in ('under_review','rejected','cancelled') or p_reason is null or length(trim(p_reason)) not between 1 and 1000 then raise exception 'invalid inventory review'; end if;
  if i.status in ('approved','rejected','cancelled') or p_action='under_review' and i.status<>'submitted' or p_action='rejected' and i.status not in ('submitted','under_review') then raise exception 'invalid inventory transition'; end if;
  update public.stock_inventories set status=p_action,review_reason=trim(p_reason) where id=i.id returning * into i;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'inventory.'||p_action,'stock_inventory',i.id,jsonb_build_object('care_recipient_id',i.care_recipient_id,'reason',trim(p_reason)));
  return i;
end; $$;

-- An import records what the source proves; unknown date/author/status stay NULL.
alter table public.requisitions alter column created_by drop not null,alter column status drop not null,alter column created_at drop not null;
create or replace function public.import_historical_requisitions(p_source_hash text,p_rows jsonb) returns jsonb
language plpgsql security definer set search_path=public,extensions as $$
declare b public.requisition_import_batches;x jsonb;v_hash text;v_row_hash text;v_id uuid;v_recipient uuid;v_protocol text;v_report jsonb:='[]';v_imported integer:=0;v_rejected integer:=0;
begin
  if auth.uid() is null or jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 1000 then raise exception 'invalid import'; end if;
  -- Authorize each context before replaying reports or processing any row.
  for x in select value from jsonb_array_elements(p_rows) loop
    v_recipient:=(x->>'careRecipientId')::uuid;
    if v_recipient is null or not public.recipient_can(v_recipient,'admin') then raise exception 'import authorization required' using errcode='42501'; end if;
  end loop;
  v_hash:=encode(digest(p_rows::text,'sha256'),'hex');
  perform pg_advisory_xact_lock(hashtextextended('historical-import',0));
  select * into b from public.requisition_import_batches where source_hash=v_hash;
  if found then return jsonb_build_object('batchId',b.id,'total',b.total_rows,'imported',b.imported_rows,'rejected',b.rejected_rows,'report',b.report,'replayed',true);end if;
  insert into public.requisition_import_batches(source_hash,imported_by,total_rows) values(v_hash,auth.uid(),jsonb_array_length(p_rows)) returning * into b;
  for x in select value from jsonb_array_elements(p_rows) loop
    begin
      if (x->>'physicalProtocol') is null or (x->>'physicalProtocol')!~'^[1-9]$|^1[01]$' or jsonb_typeof(x->'lines') is distinct from 'array' or jsonb_array_length(x->'lines') not between 1 and 1000 then raise exception 'invalid row';end if;
      v_recipient:=(x->>'careRecipientId')::uuid;v_protocol:='HC-'||lpad(x->>'physicalProtocol',6,'0');v_row_hash:=encode(digest(x::text,'sha256'),'hex');
      if exists(select 1 from public.requisitions where protocol=v_protocol) then raise exception 'duplicate protocol';end if;
      if exists(select 1 from jsonb_array_elements(x->'lines') l where jsonb_typeof(l) is distinct from 'object' or jsonb_typeof(l->'productId') is distinct from 'string' or jsonb_typeof(l->'currentStock') is distinct from 'number'
        or not exists(select 1 from public.care_recipient_products c where c.care_recipient_id=v_recipient and c.product_id=l->>'productId') or (l->>'currentStock') is null or (l->>'currentStock')!~'^[0-9]+$'
        or exists(select 1 from jsonb_object_keys(l) k where k not in ('productId','currentStock','urgent')))
        or exists(select 1 from jsonb_array_elements(x->'lines') l group by l->>'productId' having count(*)>1) then raise exception 'invalid patient product';end if;
      insert into public.requisitions(protocol,created_by,care_recipient_id,status,idempotency_key,payload_hash,is_historical,created_at,updated_at,requester_name_snapshot,recipient_name_snapshot)
      values(v_protocol,null,v_recipient,nullif(x->>'status','')::public.requisition_status,gen_random_uuid(),v_row_hash,true,nullif(x->>'createdAt','')::timestamptz,now(),nullif(trim(x->>'requesterName'),''),(select display_name from public.care_recipients where id=v_recipient)) returning id into v_id;
      insert into public.requisition_items(requisition_id,product_id,current_stock,urgent,product_name_snapshot,category_snapshot,unit_snapshot,snapshot_source)
      select v_id,c.product_id,(l->>'currentStock')::integer,coalesce((l->>'urgent')::boolean,false),c.name,c.category::text,c.unit,'legacy_reconstructed'
      from jsonb_array_elements(x->'lines') l join public.care_recipient_products c on c.care_recipient_id=v_recipient and c.product_id=l->>'productId';
      if exists(select 1 from jsonb_array_elements(coalesce(x->'observations','[]'::jsonb)) o where jsonb_typeof(o) is distinct from 'string' or length(trim(o#>>'{}')) not between 1 and 1000) then raise exception 'invalid observation';end if;
      insert into public.requisition_observations(requisition_id,created_by,body) select v_id,auth.uid(),trim(value) from jsonb_array_elements_text(coalesce(x->'observations','[]'::jsonb));
      insert into public.historical_requisition_imports(batch_id,physical_protocol,requisition_id,row_hash) values(b.id,(x->>'physicalProtocol')::integer,v_id,v_row_hash);
      v_imported:=v_imported+1;v_report:=v_report||jsonb_build_array(jsonb_build_object('row',x->>'physicalProtocol','status','imported'));
    exception when others then v_rejected:=v_rejected+1;v_report:=v_report||jsonb_build_array(jsonb_build_object('row',x->>'physicalProtocol','status','rejected','reason','invalid or duplicate record'));end;
  end loop;
  update public.requisition_import_batches set imported_rows=v_imported,rejected_rows=v_rejected,report=v_report where id=b.id;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'requisition.import.completed','requisition_import_batch',b.id,jsonb_build_object('imported',v_imported,'rejected',v_rejected));
  return jsonb_build_object('batchId',b.id,'total',jsonb_array_length(p_rows),'imported',v_imported,'rejected',v_rejected,'report',v_report,'replayed',false);
end; $$;
revoke all on function public.extraordinary_stock_adjustment(uuid,text,integer,text,text,boolean,uuid),public.review_stock_inventory(uuid,text,text) from public,anon;
grant execute on function public.extraordinary_stock_adjustment(uuid,text,integer,text,text,boolean,uuid),public.review_stock_inventory(uuid,text,text) to authenticated;
revoke all on function public.recount_stock_inventory(uuid) from public,anon;
grant execute on function public.recount_stock_inventory(uuid) to authenticated;
