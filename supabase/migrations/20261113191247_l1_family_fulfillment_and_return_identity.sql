-- L1: identity of returns is separate from the transfer engine and ENT series.
alter table public.operational_documents add column kind text generated always as (
 case when type='ENT' and payload->>'source'='CARE_TEAM' and payload->>'destination'='FAMILY' then 'DEV' else type end
) stored;
alter table public.operational_documents drop constraint operational_documents_care_recipient_id_type_number_key;
alter table public.operational_documents add constraint operational_documents_patient_kind_number_key unique(care_recipient_id,kind,number);
alter table public.document_series drop constraint document_series_type_check;
alter table public.document_series add constraint document_series_type_check check(type in ('REQ','COM','ENT','DEV','BAL'));

alter table public.document_lines
 add column family_fulfillment text check(family_fulfillment in ('partial','complete')),
 add column fulfillment_decided_by uuid references public.profiles(id),
 add column fulfillment_decided_name text,
 add column fulfillment_decided_at timestamptz;

create function private.capture_family_fulfillment() returns trigger
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;choice text:=new.metadata->>'requestFulfillment';
begin
 select * into strict d from public.operational_documents where id=new.document_id;
 if tg_op='UPDATE' and old.family_fulfillment is not null and d.protocol is not null then
  if choice is distinct from old.family_fulfillment or new.family_fulfillment is distinct from old.family_fulfillment
   or new.fulfillment_decided_by is distinct from old.fulfillment_decided_by
   or new.fulfillment_decided_name is distinct from old.fulfillment_decided_name
   or new.fulfillment_decided_at is distinct from old.fulfillment_decided_at then
   raise exception 'family decision is immutable after dispatch' using errcode='22023';end if;
  return new;
 end if;
 if choice is not null then
  if choice not in ('partial','complete') then raise exception 'choose partial or complete fulfillment' using errcode='22023';end if;
  if d.type<>'ENT' or d.payload->>'source'<>'FAMILY' or d.payload->>'destination'<>'CARE_TEAM'
   or not private.requisition_family_representative(d.care_recipient_id,auth.uid()) then
   raise exception 'family authority required for request fulfillment' using errcode='42501';end if;
  perform private.require_cap(d.care_recipient_id,'ent.create');
  new.family_fulfillment:=choice;
  new.fulfillment_decided_by:=auth.uid();
  select full_name into new.fulfillment_decided_name from public.profiles where id=auth.uid() and status='active';
  if new.fulfillment_decided_name is null then raise exception 'active family identity required' using errcode='42501';end if;
  new.fulfillment_decided_at:=clock_timestamp();
 else
  new.family_fulfillment:=null;new.fulfillment_decided_by:=null;new.fulfillment_decided_name:=null;new.fulfillment_decided_at:=null;
 end if;
 return new;
end;$$;
revoke all on function private.capture_family_fulfillment() from public,anon,authenticated,service_role;
create trigger capture_family_fulfillment before insert or update on public.document_lines
 for each row execute function private.capture_family_fulfillment();

create or replace function private.emit_document(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;n bigint;
begin
 select * into strict d from public.operational_documents where id=p_id for update;
 if d.code is not null then return;end if;
 if d.type='ENT' and exists(select 1 from public.document_lines l join public.document_request_links k on k.document_line_id=l.id
  where l.document_id=p_id and (l.family_fulfillment is null or l.fulfillment_decided_by is null)) then
  raise exception 'choose family fulfillment for each linked request item' using errcode='22023';end if;
 insert into public.document_series(care_recipient_id,type,last_number) values(d.care_recipient_id,d.kind,1)
 on conflict(care_recipient_id,type) do update set last_number=public.document_series.last_number+1 returning last_number into n;
 update public.operational_documents set number=n,code=d.kind||'-'||lpad(n::text,greatest(4,length(n::text)),'0'),
 protocol=d.kind||'-'||to_char(now() at time zone 'America/Sao_Paulo','YYYYMMDD')||'-'||upper(left(replace(d.care_recipient_id::text,'-',''),8))||'-'||upper(left(replace(d.created_by::text,'-',''),8))||'-'||n||'-'||upper(left(encode(extensions.digest(p_id::text,'sha256'),'hex'),8)) where id=p_id;
end;$$;

-- The decision is copied from a typed input, with author/time captured only in the database.
do $l1$
declare definition text;anchor text;
begin
 definition:=pg_get_functiondef('private.capture_presentation_conversions(uuid,jsonb)'::regprocedure);
 anchor:='v_metadata jsonb:=coalesce(p_line->''metadata'',''{}'');';
 if position(anchor in definition)=0 then raise exception 'L1 line payload contract drift';end if;
 execute replace(definition,anchor,'v_metadata jsonb:=coalesce(p_line->''metadata'',''{}'')||case when p_line ? ''requestFulfillment'' then jsonb_build_object(''requestFulfillment'',p_line->''requestFulfillment'') else ''{}''::jsonb end;');
 definition:=pg_get_functiondef('private.record_document_event(uuid,text,jsonb,uuid)'::regprocedure);
 anchor:='''type'',d.type,''code'',d.code';
 if position(anchor in definition)=0 then raise exception 'L1 canonical identity contract drift';end if;
 execute replace(definition,anchor,'''type'',d.type,''kind'',d.kind,''code'',d.code');
end;$l1$;

create function private.requisition_item_service(p_item uuid) returns text
language sql stable security definer set search_path='' as $$
 with deliveries as (
  select l.*,d.status from public.document_request_links k join public.document_lines l on l.id=k.document_line_id
  join public.operational_documents d on d.id=l.document_id
  where k.requisition_item_id=p_item and d.type='ENT' and d.kind='ENT' and d.status<>'cancelled'
 ) select case
  when exists(select 1 from deliveries where family_fulfillment='complete' and accepted_quantity=quantity and fully_checked and not coalesce((metadata->>'issueOpen')::boolean,false)) then 'fulfilled'
  when exists(select 1 from deliveries where family_fulfillment='complete' and accepted_quantity>0 and accepted_quantity<quantity) then 'reserved'
  when exists(select 1 from deliveries where family_fulfillment='partial' and accepted_quantity>0) then 'partial'
  else 'pending' end;
$$;
revoke all on function private.requisition_item_service(uuid) from public,anon,authenticated,service_role;

create or replace function public.requisition_fulfillment(p_requisition uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare p uuid;
begin
 select care_recipient_id into p from public.requisitions where id=p_requisition;
 if not private.can(p,'req.read') then raise exception 'required permission' using errcode='42501';end if;
 return (select jsonb_build_object('total',count(*),'fulfilled',count(*) filter(where service='fulfilled'),
  'partial',count(*) filter(where service='partial'),'reserved',count(*) filter(where service='reserved'),
  'lines',coalesce(jsonb_agg(jsonb_build_object('id',i.id,'productId',private.effective_requisition_product(i.id),
   'attended',service='fulfilled','serviceStatus',service,'deliveries',deliveries)),'[]'))
 from (select i.*,private.requisition_item_service(i.id) service,
  coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'code',d.code,'acceptedQuantity',l.accepted_quantity::text,'status',d.status,
   'familyFulfillment',l.family_fulfillment,'decidedBy',l.fulfillment_decided_by,'decidedName',l.fulfillment_decided_name,'decidedAt',l.fulfillment_decided_at))
   from public.document_request_links x join public.document_lines l on l.id=x.document_line_id join public.operational_documents d on d.id=l.document_id
   where x.requisition_item_id=i.id and d.type='ENT'),'[]') deliveries
  from public.requisition_items i where i.requisition_id=p_requisition) i);
end;$$;

-- Reuse the existing lifecycle/stock locks, completion events and cancellation guards.
do $l1$
declare definition text;anchor text;
begin
 definition:=replace(pg_get_functiondef('private.refresh_requisition_lifecycle(uuid)'::regprocedure),chr(13),'');
 anchor:=$find$exists(select 1 from public.document_request_links k join public.document_lines l on l.id=k.document_line_id join public.operational_documents d on d.id=l.document_id
 where k.requisition_item_id=i.id and d.type='ENT' and d.status<>'cancelled' and l.accepted_quantity>0)$find$;
 if position(anchor in definition)=0 then raise exception 'L1 fulfillment lifecycle contract drift';end if;
 definition:=replace(definition,anchor,'private.requisition_item_service(i.id)=''fulfilled''');
 anchor:='''accepted'',l.accepted_quantity::text';
 if position(anchor in definition)=0 then raise exception 'L1 fulfillment state contract drift';end if;
 execute replace(definition,anchor,'''familyFulfillment'',l.family_fulfillment,''decidedBy'',l.fulfillment_decided_by,''decidedAt'',l.fulfillment_decided_at,'||anchor);
end;$l1$;

-- Keep private-note references searchable by stable identity when resuming the four-field draft.
do $l1$
declare definition text;anchor text;
begin
 definition:=pg_get_functiondef('public.document_progress_references(uuid,text,integer)'::regprocedure);
 definition:=replace(definition,'and position(lower(p_search) in lower(coalesce(r.code,'''')||'' ''||coalesce(r.protocol,'''')))>0',
  'and (r.id::text=p_search or position(lower(p_search) in lower(coalesce(r.code,'''')||'' ''||coalesce(r.protocol,'''')))>0)');
 execute replace(definition,'and position(lower(p_search) in lower(coalesce(r.code,'''')||'' ''||n.body))>0',
  'and (n.id::text=p_search or position(lower(p_search) in lower(coalesce(r.code,'''')||'' ''||n.body))>0)');
 definition:=pg_get_functiondef('private.require_progress_audience(uuid,jsonb)'::regprocedure);
 anchor:='private_note:=coalesce(opts->>''visibility'',''public'')=''family'';';
 if position(anchor in definition)=0 then raise exception 'L1 audience validation contract drift';end if;
 execute replace(definition,anchor,'if opts is not null then perform private.progress_publication_mentions(d.care_recipient_id,opts);end if;'||anchor);
end;$l1$;

do $l1$
declare definition text;anchor text;
begin
 definition:=pg_get_functiondef('private.validate_supply_draft(jsonb,text,uuid)'::regprocedure);
 anchor:='''sharedNeedReasons'',''presentationSelections'',''manualQuantities''';
 if position(anchor in definition)=0 then raise exception 'L1 private supply form drift';end if;
 definition:=replace(definition,anchor,anchor||',''requestFulfillments''');
 anchor:='f:=p_content->''form'';c:=p_content->''context'';';
 if position(anchor in definition)=0 then raise exception 'L1 private supply field drift';end if;
 execute replace(definition,anchor,anchor||$validate$
  if f ? 'requestFulfillments' then
   if jsonb_typeof(f->'requestFulfillments') is distinct from 'object' or (select count(*) from jsonb_object_keys(f->'requestFulfillments'))>1000
    then raise exception 'invalid family fulfillment draft' using errcode='22023';end if;
   for k,v in select * from jsonb_each(f->'requestFulfillments') loop
    if length(k) not between 1 and 120 or jsonb_typeof(v) is distinct from 'string' or v#>>'{}' not in ('','partial','complete')
     then raise exception 'invalid family fulfillment choice' using errcode='22023';end if;
   end loop;
  end if;
 $validate$);
end;$l1$;
