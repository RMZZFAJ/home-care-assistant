-- Complete read models and authenticated review without changing confirmed history.
create table public.requisition_item_resolutions (
 id uuid primary key default gen_random_uuid(),
 requisition_item_id uuid not null unique references public.requisition_items(id),
 care_recipient_id uuid not null references public.care_recipients(id),
 product_id text not null,
 resolved_by uuid not null references public.profiles(id),
 reason text not null check(length(trim(reason)) between 3 and 1000),
 idempotency_key uuid not null,
 created_at timestamptz not null default now(),
 unique(resolved_by,idempotency_key),
 foreign key(care_recipient_id,product_id) references public.care_recipient_products(care_recipient_id,product_id)
);
alter table public.requisition_item_resolutions enable row level security;
grant select on public.requisition_item_resolutions to authenticated;
create policy resolved_item_read on public.requisition_item_resolutions for select to authenticated
 using(private.can(care_recipient_id,'req.read'));
create function private.reject_resolution_mutation() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'confirmed item resolution is immutable' using errcode='23514';end;$$;
create trigger immutable_item_resolution before update or delete on public.requisition_item_resolutions
 for each row execute function private.reject_resolution_mutation();
create function private.effective_requisition_product(p_item uuid) returns text
 language sql stable security definer set search_path='' as $$
 select coalesce(i.product_id,r.product_id) from public.requisition_items i
 left join public.requisition_item_resolutions r on r.requisition_item_id=i.id where i.id=p_item;
$$;
create function public.resolve_requisition_item(p_item uuid,p_product text,p_reason text,p_key uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare i public.requisition_items;r public.requisition_item_resolutions;begin
 select * into strict i from public.requisition_items where id=p_item for update;
 perform private.require_cap(i.care_recipient_id,'catalog.manage');
 perform private.require_cap(i.care_recipient_id,'req.review');
 if p_key is null or p_reason is null or length(trim(p_reason)) not between 3 and 1000
 or i.product_id is not null or i.custom_name is null then raise exception 'invalid custom item resolution';end if;
 select * into r from public.requisition_item_resolutions where resolved_by=auth.uid() and idempotency_key=p_key;
 if found then
 if r.requisition_item_id<>p_item or r.product_id<>p_product or r.reason<>trim(p_reason) then raise exception 'idempotency conflict' using errcode='23505';end if;
 return to_jsonb(r);end if;
 if exists(select 1 from public.requisition_item_resolutions where requisition_item_id=p_item)
 or not exists(select 1 from public.care_recipient_products where care_recipient_id=i.care_recipient_id and product_id=p_product and is_active)
 or not exists(select 1 from public.requisitions where id=i.requisition_id and status<>'cancelled') then raise exception 'invalid custom item product';end if;
 insert into public.requisition_item_resolutions(requisition_item_id,care_recipient_id,product_id,resolved_by,reason,idempotency_key)
 values(i.id,i.care_recipient_id,p_product,auth.uid(),trim(p_reason),p_key) returning * into r;
 update public.operational_documents set version=version+1 where id=i.requisition_id;
 perform private.record_document_event(i.requisition_id,'req.item_resolved',
 jsonb_build_object('itemId',i.id,'originalName',i.custom_name,'productId',p_product,'reason',trim(p_reason)),p_key);
 return to_jsonb(r);
end;$$;
grant execute on function public.resolve_requisition_item(uuid,text,text,uuid) to authenticated;

-- Quantities in transit are distinct from confirmed stock and grouped by ENT.
create function public.stock_transit(p_patient uuid) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_cap(p_patient,'ent.read');
 return coalesce((select jsonb_agg(jsonb_build_object(
 'id',d.id,'code',d.code,'status',d.status,'createdAt',d.created_at,
 'source',d.payload->>'source','destination',d.payload->>'destination',
 'recipientId',d.recipient_id,
 'lines',(select jsonb_agg(jsonb_build_object('productId',l.product_id,'name',l.name_snapshot,
 'unit',l.unit_snapshot,'dispatched',l.quantity::text,'accepted',l.accepted_quantity::text,
 'reconciled',l.reconciled_quantity::text,'pending',(l.quantity-l.accepted_quantity-l.reconciled_quantity)::text,
 'disputed',coalesce((l.metadata->>'issueOpen')::boolean,false)) order by l.name_snapshot)
 from public.document_lines l where l.document_id=d.id))
 order by d.created_at desc,d.id) from public.operational_documents d
 where d.care_recipient_id=p_patient and d.type='ENT'
 and d.status in ('pending_receipt','disputed','cancellation_pending')),'[]');
end;$$;
grant execute on function public.stock_transit(uuid) to authenticated;

-- Per-product consumption totals use ledger debits, never observations or estimates.
create function public.stock_consumption_metrics(p_patient uuid,p_from timestamptz,p_to timestamptz) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare family boolean:=private.can(p_patient,'stock.family.read');team boolean:=private.can(p_patient,'stock.team.read');begin
 if not(family or team) then raise exception 'stock permission required' using errcode='42501';end if;
 if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>interval '366 days' then raise exception 'invalid metrics period';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('productId',x.product_id,'location',x.source_location,
 'quantity',x.total::text,'movements',x.movements,'days',ceil(extract(epoch from(p_to-p_from))/86400),
 'averagePerDay',(x.total/(extract(epoch from(p_to-p_from))/86400))::text))
 from(select product_id,source_location,sum(quantity) total,count(*) movements
 from public.stock_movements where care_recipient_id=p_patient and created_at>=p_from and created_at<p_to
 and destination_location is null and movement_type='consumption'
 and (family and source_location='FAMILY' or team and source_location='CARE_TEAM')
 group by product_id,source_location)x),'[]');
end;$$;
grant execute on function public.stock_consumption_metrics(uuid,timestamptz,timestamptz) to authenticated;

-- A Flow submission is only a suggestion until its owner reviews it in the app.
alter table public.flow_submissions add column report_id uuid references public.consumption_reports(id),
 add column reviewed_at timestamptz;
create function public.review_flow_submission(p_id uuid,p_accept boolean,p_kind text,p_text text,p_lines jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare s public.flow_submissions;v uuid;begin
 select * into strict s from public.flow_submissions where id=p_id for update;
 perform private.require_cap(s.care_recipient_id,'consumption.report');
 if s.user_id<>auth.uid() or p_accept is null then raise exception 'flow owner required' using errcode='42501';end if;
 if s.status<>'pending_confirmation' then return jsonb_build_object('status',s.status,'reportId',s.report_id);end if;
 if p_accept then
 v:=public.report_extraordinary_consumption(s.care_recipient_id,p_kind,'CARE_TEAM',p_text,p_lines,s.id);
 update public.flow_submissions set status='confirmed',report_id=v,reviewed_at=now() where id=s.id;
 else update public.flow_submissions set status='rejected',reviewed_at=now() where id=s.id;end if;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),case when p_accept then 'flow.confirmed' else 'flow.rejected' end,'flow_submission',s.id,
 jsonb_build_object('care_recipient_id',s.care_recipient_id,'report_id',v));
 return jsonb_build_object('status',case when p_accept then 'confirmed' else 'rejected' end,'reportId',v);
end;$$;
grant execute on function public.review_flow_submission(uuid,boolean,text,text,jsonb) to authenticated;

-- Strict validation is shared by API and direct RPC callers.
alter function public.configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text) rename to validated_legacy_patient_access;
revoke all on function public.validated_legacy_patient_access(uuid,text,jsonb,uuid,integer,uuid,text) from public,anon,authenticated,service_role;
create function public.configure_patient_access(p_patient uuid,p_kind text,p_change jsonb,p_key uuid,p_version integer,p_request_id uuid default null,p_decision text default null) returns jsonb
 language plpgsql security definer set search_path='' as $$
begin
 perform private.require_cap(p_patient,'access.manage');
 if p_request_id is null then
 if jsonb_typeof(p_change) is distinct from 'object' then raise exception 'invalid access change';end if;
 if p_kind='settings' then
 if exists(select 1 from jsonb_each(p_change) e where
 e.key='balDay' and not(e.value='null'::jsonb or jsonb_typeof(e.value)='number' and e.value::text~'^[0-6]$')
 or e.key='balReview' and (jsonb_typeof(e.value)<>'string' or e.value#>>'{}' not in ('optional','required'))
 or e.key='balRequirement' and (jsonb_typeof(e.value)<>'string' or e.value#>>'{}' not in ('any','all'))
 or e.key='whatsappSimpleAcceptance' and jsonb_typeof(e.value)<>'boolean'
 or e.key='balApprovers' and jsonb_typeof(e.value)<>'array') then raise exception 'invalid settings';end if;
 if p_change ? 'balApprovers' and (
 jsonb_array_length(p_change->'balApprovers') not between 1 and 2
 or exists(select 1 from jsonb_array_elements(p_change->'balApprovers') a where jsonb_typeof(a)<>'string' or a#>>'{}' not in ('family','supervisor'))
 or (select count(distinct a) from jsonb_array_elements(p_change->'balApprovers') a)<>jsonb_array_length(p_change->'balApprovers')) then raise exception 'invalid approvers';end if;
 elsif p_kind='capability' then
 if exists(select 1 from jsonb_object_keys(p_change) k where k not in ('capability','subjectUser','subjectRole','enabled'))
 or p_change ? 'subjectRole' and coalesce(p_change->>'subjectRole','') not in ('admin','family','supervisor','professional','reader') then raise exception 'invalid capability subject';end if;
 elsif p_kind='membership' then
 if exists(select 1 from jsonb_object_keys(p_change) k where k not in ('userId','role'))
 or coalesce(p_change->>'role','') not in ('admin','family','supervisor','professional','reader')
 or p_change->>'userId' is null then raise exception 'invalid membership change';end if;
 end if;
 end if;
 return public.validated_legacy_patient_access(p_patient,p_kind,p_change,p_key,p_version,p_request_id,p_decision);
end;$$;
grant execute on function public.configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text) to authenticated;

-- Resolve extra lines through an explicit mapping; original request rows stay intact.
create or replace function public.create_supply_document(p_patient uuid,p_type text,p_payload jsonb,p_key uuid,p_draft boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;x jsonb;p public.care_recipient_products;q numeric;l_id uuid;r_id uuid;s jsonb;v_cap text;v_recipient uuid;
begin
 if p_type not in ('COM','ENT','BAL') or p_key is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'invalid document';end if;
 v_cap:=case p_type when 'COM' then 'com.create' when 'ENT' then 'ent.create' else 'bal.count' end;
 perform private.require_cap(p_patient,v_cap);
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
 perform pg_advisory_xact_lock(hashtextextended('document:'||auth.uid()||':'||p_key,0));
 select * into d from public.operational_documents where created_by=auth.uid() and idempotency_key=p_key;
 if found then
 if d.care_recipient_id<>p_patient or d.type<>p_type or d.payload<>p_payload then raise exception 'idempotency conflict' using errcode='23505';end if;
 return public.operational_document(d.id);end if;
 if jsonb_typeof(p_payload->'lines') is distinct from 'array' or jsonb_array_length(p_payload->'lines') not between 1 and 1000 then raise exception 'invalid lines';end if;
 if p_type='ENT' then
 if coalesce(p_payload->>'source','') not in ('FAMILY','CARE_TEAM') or coalesce(p_payload->>'destination','') not in ('FAMILY','CARE_TEAM') or p_payload->>'source'=p_payload->>'destination' then raise exception 'invalid custody';end if;
 v_recipient:=(p_payload->>'recipientId')::uuid;
 if v_recipient is null or not private.user_can(p_patient,v_recipient,'ent.receive') or v_recipient=auth.uid() or not exists(select 1 from public.care_recipient_memberships m join public.profiles a on a.id=m.user_id where m.care_recipient_id=p_patient and m.user_id=v_recipient and m.status='active' and a.status='active'
 and (m.role::text in (case when p_payload->>'destination'='FAMILY' then 'family' else 'professional' end,'admin') or p_payload->>'destination'='CARE_TEAM' and m.role::text='supervisor')) then raise exception 'invalid designated recipient';end if;
 end if;
 insert into public.patient_settings(care_recipient_id) values(p_patient) on conflict do nothing;
 select settings into s from public.patient_settings where care_recipient_id=p_patient;
 insert into public.operational_documents(care_recipient_id,type,created_by,recipient_id,idempotency_key,payload,status,workflow_data)
 values(p_patient,p_type,auth.uid(),v_recipient,p_key,p_payload,'draft',case when p_type='BAL' then jsonb_build_object('referenceRevision',private.team_revision(p_patient),'countVersion',1,'reviewPolicy',s) else '{}' end) returning * into d;
 for x in select value from jsonb_array_elements(p_payload->'lines') loop
 select * into p from public.care_recipient_products where care_recipient_id=p_patient and product_id=x->>'productId' and is_active;
 if not found then raise exception 'invalid patient catalogue product';end if;
 q:=(x->>'quantity')::numeric;
 if q is null or q<0 or (p_type<>'BAL' and q=0) or q>1000000000 or q<>round(q,p.quantity_decimals) then raise exception 'invalid product quantity';end if;
 insert into public.document_lines(document_id,care_recipient_id,product_id,name_snapshot,unit_snapshot,category_snapshot,quantity,approved_quantity,metadata)
 values(d.id,p_patient,p.product_id,p.name,p.unit,p.category::text,q,case when p_type='COM' and public.recipient_role(p_patient)='admin' then q else 0 end,
 case when p_type='BAL' then jsonb_build_object('expectedQuantity',private.stock_quantity(p_patient,p.product_id,'CARE_TEAM')) else coalesce(x->'metadata','{}') end) returning id into l_id;
 for r_id in select value::text::uuid from jsonb_array_elements_text(coalesce(x->'requisitionItemIds','[]')) loop
 if not exists(select 1 from public.requisition_items i join public.requisitions r on r.id=i.requisition_id where i.id=r_id and i.care_recipient_id=p_patient and private.effective_requisition_product(i.id)=p.product_id and r.status<>'cancelled') then raise exception 'invalid requisition line link';end if;
 insert into public.document_request_links values(l_id,r_id);
 end loop;
 end loop;
 if p_type='BAL' and (select count(*) from public.document_lines where document_id=d.id)<>(select count(*) from public.care_recipient_products where care_recipient_id=p_patient and is_active) then raise exception 'count every active catalogue product';end if;
 if not p_draft then
 perform private.emit_document(d.id);
 update public.operational_documents set status=case p_type when 'COM' then case when public.recipient_role(p_patient)='admin' then 'approved' else 'pending_approval' end when 'ENT' then 'pending_receipt' else 'submitted' end where id=d.id;
 if p_type='ENT' then for x in select to_jsonb(l) from public.document_lines l where document_id=d.id order by product_id loop
 perform private.move_stock(p_patient,x->>'product_id',(x->>'quantity')::numeric,p_payload->>'source','TRANSIT','Expedição ENT','document',d.id);end loop;end if;
 if p_type='BAL' and s->>'balReview'='optional' then perform private.apply_bal(d.id);end if;
 end if;
 perform private.record_document_event(d.id,lower(p_type)||case when p_draft then '.draft' else '.issued' end,p_payload,p_key);
 return public.operational_document(d.id);
end;$$;
create or replace function public.revise_supply_document(p_id uuid,p_payload jsonb,p_key uuid,p_version integer,p_recount boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;e public.document_events;x jsonb;p public.care_recipient_products;q numeric;l_id uuid;r_id uuid;p_patient uuid;p_type text;begin
 select * into strict d from public.operational_documents where id=p_id;
 p_patient:=d.care_recipient_id;p_type:=d.type;
 perform private.require_cap(p_patient,case d.type when 'BAL' then 'bal.count' else lower(d.type)||'.create' end);
 if d.created_by<>auth.uid() and not public.can_manage_recipient(p_patient) then raise exception 'draft owner required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
 select * into strict d from public.operational_documents where id=p_id for update;
 select * into e from public.document_events where actor_id=auth.uid() and idempotency_key=p_key;
 if found then if e.document_id<>p_id or e.body->'event'<>p_payload then raise exception 'idempotency conflict' using errcode='23505';end if;return public.operational_document(p_id);end if;
 if p_key is null or p_version is null or d.version<>p_version then raise exception 'stale document version' using errcode='40001';end if;
 if not(d.status='draft' or p_recount and d.type='BAL' and d.status='submitted') or d.type='REQ' then raise exception 'only drafts or pending BAL may be revised';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or jsonb_typeof(p_payload->'lines') is distinct from 'array' or jsonb_array_length(p_payload->'lines') not between 1 and 1000 then raise exception 'invalid draft lines';end if;
 if d.type='ENT' and (not private.user_can(p_patient,(p_payload->>'recipientId')::uuid,'ent.receive') or (p_payload->>'recipientId')::uuid=d.created_by or coalesce(p_payload->>'source','') not in ('FAMILY','CARE_TEAM') or coalesce(p_payload->>'destination','') not in ('FAMILY','CARE_TEAM') or p_payload->>'source'=p_payload->>'destination') then raise exception 'invalid ENT recipient or custody';end if;
 delete from public.document_request_links where document_line_id in(select id from public.document_lines where document_id=p_id);
 delete from public.document_lines where document_id=p_id;
 for x in select value from jsonb_array_elements(p_payload->'lines') loop
 select * into p from public.care_recipient_products where care_recipient_id=p_patient and product_id=x->>'productId' and is_active;
 if not found then raise exception 'invalid patient catalogue product';end if;
 q:=(x->>'quantity')::numeric;
 if q is null or q<0 or (p_type<>'BAL' and q=0) or q>1000000000 or q<>round(q,p.quantity_decimals) then raise exception 'invalid product quantity';end if;
 insert into public.document_lines(document_id,care_recipient_id,product_id,name_snapshot,unit_snapshot,category_snapshot,quantity,approved_quantity,metadata)
 values(p_id,p_patient,p.product_id,p.name,p.unit,p.category::text,q,case when p_type='COM' and public.recipient_role(p_patient)='admin' then q else 0 end,
 case when p_type='BAL' then jsonb_build_object('expectedQuantity',private.stock_quantity(p_patient,p.product_id,'CARE_TEAM')) else coalesce(x->'metadata','{}') end) returning id into l_id;
 for r_id in select value::text::uuid from jsonb_array_elements_text(coalesce(x->'requisitionItemIds','[]')) loop
 if not exists(select 1 from public.requisition_items i join public.requisitions r on r.id=i.requisition_id where i.id=r_id and i.care_recipient_id=p_patient and private.effective_requisition_product(i.id)=p.product_id and r.status<>'cancelled') then raise exception 'invalid requisition line link';end if;
 insert into public.document_request_links values(l_id,r_id);
 end loop;
 end loop;
 if p_type='BAL' and (select count(*) from public.document_lines where document_id=p_id)<>(select count(*) from public.care_recipient_products where care_recipient_id=p_patient and is_active) then raise exception 'count every active catalogue product';end if;

 update public.operational_documents set payload=p_payload,recipient_id=case when type='ENT' then (p_payload->>'recipientId')::uuid else recipient_id end,version=version+1,
 workflow_data=case when type='BAL' then workflow_data||jsonb_build_object('referenceRevision',case when p_recount then private.team_revision(p_patient) else (workflow_data->>'referenceRevision')::bigint end,'countVersion',coalesce((workflow_data->>'countVersion')::integer,0)+1) else workflow_data end where id=p_id;
 perform private.record_document_event(p_id,lower(d.type)||case when p_recount then '.recount' else '.draft_updated' end,p_payload,p_key);
 return public.operational_document(p_id);
end;$$;
create or replace function public.requisition_item_context(p_patient uuid,p_products text[]) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not private.can(p_patient,'req.read') or cardinality(p_products)>1000 then raise exception 'required permission' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('productId',c.product_id,'familyStock',case when private.can(p_patient,'req.family_stock') then private.stock_quantity(p_patient,c.product_id,'FAMILY')::text else null end,
 'pending',coalesce((select jsonb_agg(jsonb_build_object('requisitionId',r.id,'lineId',i.id,'code',coalesce(d.code,r.protocol),'createdAt',r.created_at,'status',r.status)) from public.requisition_items i join public.requisitions r on r.id=i.requisition_id left join public.operational_documents d on d.id=r.id where i.care_recipient_id=p_patient and private.effective_requisition_product(i.id)=c.product_id and r.status<>'cancelled' and not exists(select 1 from public.document_request_links k join public.document_lines dl on dl.id=k.document_line_id join public.operational_documents od on od.id=dl.document_id where k.requisition_item_id=i.id and od.type='ENT' and od.status<>'cancelled' and dl.accepted_quantity>0)),'[]')))
 from public.care_recipient_products c where c.care_recipient_id=p_patient and c.product_id=any(p_products)),'[]');
end;$$;
create or replace function public.requisition_fulfillment(p_requisition uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p uuid;begin
 select care_recipient_id into p from public.requisitions where id=p_requisition;
 if not private.can(p,'req.read') then raise exception 'required permission' using errcode='42501';end if;
 return (select jsonb_build_object('total',count(*),'fulfilled',count(*) filter(where attended),'lines',coalesce(jsonb_agg(jsonb_build_object('id',i.id,'productId',private.effective_requisition_product(i.id),'attended',attended,'deliveries',deliveries)),'[]'))
 from (select i.*,exists(select 1 from public.document_request_links x join public.document_lines l on l.id=x.document_line_id join public.operational_documents d on d.id=l.document_id where x.requisition_item_id=i.id and d.type='ENT' and d.status<>'cancelled' and l.accepted_quantity>0) attended,
 coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'code',d.code,'acceptedQuantity',l.accepted_quantity::text,'status',d.status)) from public.document_request_links x join public.document_lines l on l.id=x.document_line_id join public.operational_documents d on d.id=l.document_id where x.requisition_item_id=i.id and d.type='ENT'),'[]') deliveries
 from public.requisition_items i where i.requisition_id=p_requisition) i);
end;$$;
create or replace function public.submit_requisition(p_care_recipient_id uuid,p_idempotency_key uuid,p_payload_hash text,p_lines jsonb,p_extra_items jsonb,p_observations jsonb)
returns table(requisition_id uuid,protocol text,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare r public.requisitions;d public.operational_documents;intent jsonb;x jsonb;p public.care_recipient_products;q numeric;reason text;
begin
 perform private.require_cap(p_care_recipient_id,'req.create');
 if p_idempotency_key is null or jsonb_typeof(p_lines) is distinct from 'array' or jsonb_typeof(p_extra_items) is distinct from 'array' or jsonb_typeof(p_observations) is distinct from 'array'
 or jsonb_array_length(p_lines)>1000 or jsonb_array_length(p_extra_items)>20 or jsonb_array_length(p_observations)>50 or jsonb_array_length(p_lines)+jsonb_array_length(p_extra_items)=0 then raise exception 'invalid requisition payload';end if;
 if exists(select 1 from jsonb_array_elements(p_lines) z group by z->>'productId' having count(*)>1) then raise exception 'duplicate product';end if;
 if exists(select 1 from jsonb_array_elements(p_observations) z where jsonb_typeof(z) is distinct from 'string' or length(trim(z#>>'{}')) not between 1 and 1000) then raise exception 'invalid observation';end if;
 intent:=jsonb_build_object('careRecipientId',p_care_recipient_id,
 'lines',coalesce((select jsonb_agg(jsonb_build_object('productId',z->>'productId','currentStock',(z->>'currentStock')::numeric,'urgent',(z->>'urgent')::boolean,'repeatReason',nullif(trim(z->>'repeatReason'),'')) order by z->>'productId') from jsonb_array_elements(p_lines) z),'[]'),
 'extraItems',coalesce((select jsonb_agg(jsonb_build_object('customName',trim(z->>'customName'),'currentStock',(z->>'currentStock')::numeric,'urgent',(z->>'urgent')::boolean) order by trim(z->>'customName'),(z->>'currentStock')::numeric,(z->>'urgent')::boolean) from jsonb_array_elements(p_extra_items) z),'[]'),
 'observations',coalesce((select jsonb_agg(trim(value) order by trim(value)) from jsonb_array_elements_text(p_observations)),'[]'));
 perform pg_advisory_xact_lock(hashtextextended('requisition-patient:'||p_care_recipient_id,0));
 select * into r from public.requisitions where created_by=auth.uid() and idempotency_key=p_idempotency_key;
 if found then
 if r.care_recipient_id<>p_care_recipient_id or r.request_intent<>intent then raise exception 'idempotency conflict' using errcode='23505';end if;
 return query select r.id,r.protocol,r.created_at;return;end if;
 for x in select value from jsonb_array_elements(p_lines) loop
 select * into p from public.care_recipient_products where care_recipient_id=p_care_recipient_id and product_id=x->>'productId' and is_active;
 q:=(x->>'currentStock')::numeric;reason:=nullif(trim(x->>'repeatReason'),'');
 if not found or q is null or q<0 or q>100000 or q<>round(q,p.quantity_decimals) or jsonb_typeof(x->'urgent') is distinct from 'boolean' or length(coalesce(reason,''))>1000 then raise exception 'invalid requisition line';end if;
 if exists(select 1 from public.requisition_items i join public.requisitions oldr on oldr.id=i.requisition_id where i.care_recipient_id=p_care_recipient_id and private.effective_requisition_product(i.id)=p.product_id and oldr.status<>'cancelled'
 and not exists(select 1 from public.document_request_links k join public.document_lines l on l.id=k.document_line_id join public.operational_documents od on od.id=l.document_id where k.requisition_item_id=i.id and od.type='ENT' and od.status<>'cancelled' and l.accepted_quantity>0))
 and length(coalesce(reason,''))<3 then raise exception 'duplicate review required' using errcode='P0001';end if;
 end loop;
 for x in select value from jsonb_array_elements(p_extra_items) loop
 q:=(x->>'currentStock')::numeric;
 if q is null or q<0 or q>100000 or length(trim(coalesce(x->>'customName',''))) not between 1 and 200 or jsonb_typeof(x->'urgent') is distinct from 'boolean' then raise exception 'invalid extra';end if;
 if exists(select 1 from public.care_recipient_products c cross join lateral unnest(array_append(c.aliases,c.name)) a where c.care_recipient_id=p_care_recipient_id and c.is_active and public.unaccent(lower(trim(a)))=public.unaccent(lower(trim(x->>'customName')))) then raise exception 'custom item matches patient catalogue';end if;
 end loop;
 insert into public.operational_documents(care_recipient_id,type,created_by,status,idempotency_key,payload)
 values(p_care_recipient_id,'REQ',auth.uid(),'submitted',p_idempotency_key,jsonb_build_object('intent',intent,'requesterName',(select full_name from public.profiles where id=auth.uid()),'patientName',(select display_name from public.care_recipients where id=p_care_recipient_id))) returning * into d;
 perform private.emit_document(d.id);select * into d from public.operational_documents where id=d.id;
 insert into public.requisitions(id,protocol,code,created_by,care_recipient_id,status,idempotency_key,payload_hash,request_intent,requester_name_snapshot,recipient_name_snapshot)
 values(d.id,d.protocol,d.code,auth.uid(),p_care_recipient_id,'submitted',p_idempotency_key,encode(extensions.digest(intent::text,'sha256'),'hex'),intent,
 (select full_name from public.profiles where id=auth.uid()),(select display_name from public.care_recipients where id=p_care_recipient_id)) returning * into r;
 insert into public.requisition_items(requisition_id,product_id,current_stock,urgent,product_name_snapshot,category_snapshot,unit_snapshot,snapshot_source)
 select r.id,c.product_id,(z->>'currentStock')::numeric,(z->>'urgent')::boolean,c.name,c.category::text,c.unit,'persisted' from jsonb_array_elements(p_lines) z join public.care_recipient_products c on c.care_recipient_id=p_care_recipient_id and c.product_id=z->>'productId';
 insert into public.requisition_items(requisition_id,custom_name,current_stock,urgent,product_name_snapshot,snapshot_source)
 select r.id,trim(z->>'customName'),(z->>'currentStock')::numeric,(z->>'urgent')::boolean,trim(z->>'customName'),'persisted' from jsonb_array_elements(p_extra_items) z;
 insert into public.requisition_observations(requisition_id,created_by,body) select r.id,auth.uid(),trim(value) from jsonb_array_elements_text(p_observations);
 perform private.record_document_event(d.id,'req.issued',intent,p_idempotency_key);
 return query select r.id,r.protocol,r.created_at;
end;$$;
create or replace function private.record_document_event(p_id uuid,p_action text,p_body jsonb,p_key uuid) returns void
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;s jsonb;h text;actors jsonb;begin
 select * into strict d from public.operational_documents where id=p_id for update;
 actors:=jsonb_build_object('issuer',coalesce(d.canonical_snapshot->'actors'->'issuer',(select jsonb_build_object('id',id,'name',full_name,'registration',professional_registration,'state',professional_state,'category',professional_category) from public.profiles where id=d.created_by)),
 'recipient',(select jsonb_build_object('id',id,'name',full_name,'registration',professional_registration,'state',professional_state,'category',professional_category) from public.profiles where id=d.recipient_id),
 'patient',coalesce(d.canonical_snapshot->'actors'->'patient',(select jsonb_build_object('id',id,'name',display_name) from public.care_recipients where id=d.care_recipient_id)));
 s:=jsonb_build_object('schemaVersion',2,'id',d.id,'careRecipientId',d.care_recipient_id,'type',d.type,'code',d.code,'protocol',d.protocol,'createdAt',d.created_at,
 'status',d.status,'createdBy',d.created_by,'recipientId',d.recipient_id,'actors',actors,'payload',d.payload,'workflow',d.workflow_data,
 'lines',case when d.type='REQ' then coalesce((select jsonb_agg(to_jsonb(i) order by i.id) from public.requisition_items i where requisition_id=d.id),'[]') else coalesce((select jsonb_agg(to_jsonb(l) order by l.product_id) from public.document_lines l where document_id=p_id),'[]') end,
 'approvals',coalesce((select jsonb_agg(to_jsonb(a)) from public.bal_approvals a where document_id=p_id),'[]'),
 'itemResolutions',coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from public.requisition_item_resolutions r join public.requisition_items i on i.id=r.requisition_item_id where i.requisition_id=p_id),'[]'),
 'requestLinks',coalesce((select jsonb_agg(to_jsonb(k)) from public.document_request_links k join public.document_lines l on l.id=k.document_line_id where l.document_id=p_id),'[]'),
 'attachments',coalesce((select jsonb_agg(jsonb_build_object('id',id,'filename',filename,'sha256',sha256,'bytes',bytes)) from public.attachments where document_id=p_id and state='ready'),'[]'),
 'version',d.version,'action',p_action,'event',p_body,'previousHash',d.content_hash);
 h:=encode(extensions.digest(s::text,'sha256'),'hex');
 update public.operational_documents set canonical_snapshot=s,content_hash=h,updated_at=now() where id=p_id;
 insert into public.document_events(document_id,care_recipient_id,version,action,actor_id,body,content_hash,idempotency_key) values(p_id,d.care_recipient_id,d.version,p_action,auth.uid(),s,h,p_key);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),p_action,'document',p_id,jsonb_build_object('care_recipient_id',d.care_recipient_id,'type',d.type,'version',d.version));
end;$$;
