-- A remaining need is a new immutable REQ. A causal source event advances
-- only the reviewed document version; material, science and ledger stay intact.
alter table public.requisitions
 add column source_requisition_id uuid,
 add column source_requisition_version integer,
 add column remaining_need_reason text,
 add constraint requisition_remaining_need_fields check (
  source_requisition_id is null and source_requisition_version is null and remaining_need_reason is null
  or source_requisition_id is not null and source_requisition_id<>id
   and source_requisition_version is not null and source_requisition_version>0
   and remaining_need_reason is not null and length(trim(remaining_need_reason))>=3
   and private.bal_comment_units(remaining_need_reason)<=1000
 );
create unique index requisitions_identity_patient on public.requisitions(id,care_recipient_id);
alter table public.requisitions add constraint requisition_remaining_need_patient_fk
 foreign key(source_requisition_id,care_recipient_id) references public.requisitions(id,care_recipient_id);
create index requisitions_remaining_need_source on public.requisitions(source_requisition_id,care_recipient_id)
 where source_requisition_id is not null;

-- The existing sealed-material trigger compares the full requisition row, so
-- these new fields cannot be rewritten after req.issued either. No backfill.
CREATE OR REPLACE FUNCTION private.submit_requisition_core(p_care_recipient_id uuid, p_idempotency_key uuid, p_payload_hash text, p_lines jsonb, p_extra_items jsonb, p_observations jsonb, p_source uuid, p_source_version integer, p_reason text)
 RETURNS TABLE(requisition_id uuid, protocol text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.requisitions;d public.operational_documents;intent jsonb;x jsonb;p public.care_recipient_products;q numeric;reason text;source_doc public.operational_documents;source_req public.requisitions;source_intent jsonb;source_reason text:=nullif(trim(p_reason),'');
begin
 if not public.can_access_recipient(p_care_recipient_id) then raise exception 'live patient read required' using errcode='42501';end if;
 if p_idempotency_key is null or jsonb_typeof(p_lines) is distinct from 'array' or jsonb_typeof(p_extra_items) is distinct from 'array' or jsonb_typeof(p_observations) is distinct from 'array'
 or jsonb_array_length(p_lines)>1000 or jsonb_array_length(p_extra_items)>20 or jsonb_array_length(p_observations)>50 or jsonb_array_length(p_lines)+jsonb_array_length(p_extra_items)=0 then raise exception 'invalid requisition payload';end if;
 if exists(select 1 from jsonb_array_elements(p_lines) z group by z->>'productId' having count(*)>1) then raise exception 'duplicate product';end if;
 if exists(select 1 from jsonb_array_elements(p_observations) z where jsonb_typeof(z) is distinct from 'string' or length(trim(z#>>'{}')) not between 1 and 1000) then raise exception 'invalid observation';end if;
 intent:=jsonb_build_object('careRecipientId',p_care_recipient_id,
 'lines',coalesce((select jsonb_agg(jsonb_build_object('productId',z->>'productId','stockObservation',private.requisition_stock_observation(z),'stockObservationAt',private.requisition_observation_time(z),'currentStock',(z->>'currentStock')::numeric,'urgent',(z->>'urgent')::boolean,'repeatReason',nullif(trim(z->>'repeatReason'),'')) order by z->>'productId') from jsonb_array_elements(p_lines) z),'[]'),
 'extraItems',coalesce((select jsonb_agg(jsonb_build_object('customName',trim(z->>'customName'),'stockObservation',private.requisition_stock_observation(z),'stockObservationAt',private.requisition_observation_time(z),'currentStock',(z->>'currentStock')::numeric,'urgent',(z->>'urgent')::boolean) order by trim(z->>'customName'),(z->>'currentStock')::numeric,(z->>'urgent')::boolean,private.requisition_stock_observation(z),private.requisition_observation_time(z)) from jsonb_array_elements(p_extra_items) z),'[]'),
 'observations',coalesce((select jsonb_agg(trim(value) order by trim(value)) from jsonb_array_elements_text(p_observations)),'[]'));
 if p_source is not null then
  if p_source_version is null or p_source_version<1 or source_reason is null or length(source_reason)<3 or private.bal_comment_units(source_reason)>1000 then
   raise exception 'invalid remaining need reference or reason' using errcode='22023';end if;
  if exists(select 1 from jsonb_array_elements(p_lines) z where (z-array['productId','currentStock','stockObservation','stockObservationAt','urgent','repeatReason'])<>'{}'::jsonb)
   or exists(select 1 from jsonb_array_elements(p_extra_items) z where (z-array['customName','currentStock','stockObservation','stockObservationAt','urgent'])<>'{}'::jsonb) then
   raise exception 'unsupported remaining need fields' using errcode='22023';end if;
  source_intent:=jsonb_build_object('requisitionId',p_source,'version',p_source_version,'reason',source_reason);
  intent:=intent||jsonb_build_object('remainingNeed',source_intent);
 elsif p_source_version is not null or p_reason is not null then raise exception 'incomplete remaining need reference' using errcode='22023';end if;
 -- Own keys serialize across patients; the patient lock remains shared with
 -- existing creation/duplicate validation. Recovery still needs current read.
 perform pg_advisory_xact_lock(hashtextextended('requisition-own-key:'||auth.uid()||':'||p_idempotency_key,0));
 perform pg_advisory_xact_lock(hashtextextended('requisition-patient:'||p_care_recipient_id,0));
 if not public.can_access_recipient(p_care_recipient_id) then raise exception 'live patient read required' using errcode='42501';end if;
 select * into r from public.requisitions where created_by=auth.uid() and idempotency_key=p_idempotency_key;
 if found then
 if r.care_recipient_id is distinct from p_care_recipient_id or (r.request_intent is distinct from intent and not (
  p_source is null and not (r.request_intent ? 'remainingNeed') and not exists(select 1 from jsonb_array_elements(p_lines||p_extra_items) line where line->>'stockObservationAt' is not null)
  and (private.requisition_mode_only_intent(intent,p_extra_items) is not distinct from r.request_intent
   or (not exists(select 1 from jsonb_array_elements(p_lines||p_extra_items) line where line ? 'stockObservation')
    and private.requisition_legacy_intent(intent) is not distinct from r.request_intent))
 )) then raise exception 'idempotency conflict' using errcode='23505';end if;
 return query select r.id,r.protocol,r.created_at;return;end if;
 perform private.require_cap(p_care_recipient_id,'req.create');
 if p_source is not null then
  select * into source_doc from public.operational_documents where id=p_source and care_recipient_id=p_care_recipient_id and type='REQ' for update;
  if not found then raise exception 'remaining need source unavailable' using errcode='42501';end if;
  select * into strict source_req from public.requisitions where id=p_source and care_recipient_id=p_care_recipient_id;
  if source_req.is_historical then raise exception 'historical requisition is read only' using errcode='23514';end if;
  if source_doc.version is distinct from p_source_version then raise exception 'stale remaining need source' using errcode='PT409';end if;
  if not exists(select 1 from public.requisition_items i where i.requisition_id=p_source and
   (exists(select 1 from jsonb_array_elements(p_lines) z where private.effective_requisition_product(i.id)=z->>'productId')
    or i.product_id is null and exists(select 1 from jsonb_array_elements(p_extra_items) z
      where public.unaccent(lower(trim(z->>'customName')))=public.unaccent(lower(trim(i.custom_name)))))) then
   raise exception 'remaining need must identify an original material' using errcode='22023';end if;
  perform private.require_cap(p_care_recipient_id,'req.create');
 end if;
 for x in select value from jsonb_array_elements(p_lines) loop
 select * into p from public.care_recipient_products where care_recipient_id=p_care_recipient_id and product_id=x->>'productId' and is_active;
 q:=(x->>'currentStock')::numeric;reason:=nullif(trim(x->>'repeatReason'),'');
 if not found or jsonb_typeof(x->'urgent') is distinct from 'boolean' or length(coalesce(reason,''))>1000 then raise exception 'invalid requisition line';end if;
 perform private.validate_requisition_observation(x,p.quantity_decimals);
 if exists(select 1 from public.requisition_items i join public.requisitions oldr on oldr.id=i.requisition_id where i.care_recipient_id=p_care_recipient_id and private.effective_requisition_product(i.id)=p.product_id and oldr.status<>'cancelled'
 and not exists(select 1 from public.document_request_links k join public.document_lines l on l.id=k.document_line_id join public.operational_documents od on od.id=l.document_id where k.requisition_item_id=i.id and od.type='ENT' and od.status<>'cancelled' and l.accepted_quantity>0))
 and length(coalesce(reason,source_reason,''))<3 then raise exception 'duplicate review required' using errcode='P0001';end if;
 end loop;
 for x in select value from jsonb_array_elements(p_extra_items) loop
 q:=(x->>'currentStock')::numeric;
 if length(trim(coalesce(x->>'customName',''))) not between 1 and 200 or jsonb_typeof(x->'urgent') is distinct from 'boolean' then raise exception 'invalid extra';end if;
 perform private.validate_requisition_observation(x,6);
 if exists(select 1 from public.care_recipient_products c cross join lateral unnest(array_append(c.aliases,c.name)) a where c.care_recipient_id=p_care_recipient_id and c.is_active and public.unaccent(lower(trim(a)))=public.unaccent(lower(trim(x->>'customName')))) then raise exception 'custom item matches patient catalogue';end if;
 end loop;
 insert into public.operational_documents(care_recipient_id,type,created_by,status,idempotency_key,payload)
 values(p_care_recipient_id,'REQ',auth.uid(),'submitted',p_idempotency_key,jsonb_build_object('intent',intent,'requesterName',(select full_name from public.profiles where id=auth.uid()),'patientName',(select display_name from public.care_recipients where id=p_care_recipient_id))||case when p_source is null then '{}'::jsonb else jsonb_build_object('sourceRequisition',source_intent||jsonb_build_object('code',source_doc.code,'protocol',source_doc.protocol)) end) returning * into d;
 perform private.emit_document(d.id);select * into d from public.operational_documents where id=d.id;
 insert into public.requisitions(id,protocol,code,created_by,care_recipient_id,status,idempotency_key,payload_hash,request_intent,requester_name_snapshot,recipient_name_snapshot,source_requisition_id,source_requisition_version,remaining_need_reason)
 values(d.id,d.protocol,d.code,auth.uid(),p_care_recipient_id,'submitted',p_idempotency_key,encode(extensions.digest(intent::text,'sha256'),'hex'),intent,
 (select full_name from public.profiles where id=auth.uid()),(select display_name from public.care_recipients where id=p_care_recipient_id),p_source,p_source_version,source_reason) returning * into r;
 insert into public.requisition_items(requisition_id,product_id,current_stock,stock_observation,stock_observation_at,stock_observation_time_source,urgent,product_name_snapshot,category_snapshot,unit_snapshot,snapshot_source)
 select r.id,c.product_id,(z->>'currentStock')::numeric,private.requisition_stock_observation(z),coalesce(private.requisition_observation_at(z),d.created_at),case when private.requisition_observation_at(z) is null then 'server_submission' else 'client_draft' end,(z->>'urgent')::boolean,c.name,c.category::text,c.unit,'persisted' from jsonb_array_elements(p_lines) z join public.care_recipient_products c on c.care_recipient_id=p_care_recipient_id and c.product_id=z->>'productId';
 insert into public.requisition_items(requisition_id,custom_name,current_stock,stock_observation,stock_observation_at,stock_observation_time_source,urgent,product_name_snapshot,snapshot_source)
 select r.id,trim(z->>'customName'),(z->>'currentStock')::numeric,private.requisition_stock_observation(z),coalesce(private.requisition_observation_at(z),d.created_at),case when private.requisition_observation_at(z) is null then 'server_submission' else 'client_draft' end,(z->>'urgent')::boolean,trim(z->>'customName'),'persisted' from jsonb_array_elements(p_extra_items) z;
 insert into public.requisition_observations(requisition_id,created_by,body) select r.id,auth.uid(),trim(value) from jsonb_array_elements_text(p_observations);
 perform private.record_document_event(d.id,'req.issued',intent,p_idempotency_key);
 if p_source is not null then
  update public.operational_documents set version=version+1 where id=p_source;
  perform private.record_document_event(p_source,'req.remaining_need_declared',jsonb_build_object('newRequisitionId',d.id,'newProtocol',d.protocol,'sourceVersion',p_source_version,'reason',source_reason),gen_random_uuid());
 end if;
 perform private.require_cap(p_care_recipient_id,'req.create');
 return query select r.id,r.protocol,r.created_at;
end;$function$;


-- Keep the original RPC signature and OID for all existing callers.
create or replace function public.submit_requisition(p_care_recipient_id uuid,p_idempotency_key uuid,p_payload_hash text,p_lines jsonb,p_extra_items jsonb,p_observations jsonb)
returns table(requisition_id uuid,protocol text,created_at timestamptz)
language sql security definer set search_path='' as $$
 select * from private.submit_requisition_core(p_care_recipient_id,p_idempotency_key,p_payload_hash,p_lines,p_extra_items,p_observations,null,null,null);
$$;
create function public.submit_remaining_requisition(p_care_recipient_id uuid,p_idempotency_key uuid,p_lines jsonb,p_extra_items jsonb,p_observations jsonb,p_source uuid,p_source_version integer,p_reason text)
returns table(requisition_id uuid,protocol text,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
 if p_source is null then raise exception 'remaining need source required' using errcode='22023';end if;
 return query select * from private.submit_requisition_core(p_care_recipient_id,p_idempotency_key,null,p_lines,p_extra_items,p_observations,p_source,p_source_version,p_reason);
end;$$;
revoke all on function private.submit_requisition_core(uuid,uuid,text,jsonb,jsonb,jsonb,uuid,integer,text),
 public.submit_remaining_requisition(uuid,uuid,jsonb,jsonb,jsonb,uuid,integer,text) from public,anon,authenticated,service_role;
grant execute on function public.submit_remaining_requisition(uuid,uuid,jsonb,jsonb,jsonb,uuid,integer,text) to authenticated;
