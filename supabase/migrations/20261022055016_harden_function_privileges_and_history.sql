-- Explicit helper grants are reviewed together with all SECURITY DEFINER entry points.
revoke all on all functions in schema private from public,anon,authenticated,service_role;
grant execute on function private.can(uuid,text),private.attachment_read(uuid) to authenticated;
alter default privileges in schema private revoke execute on functions from public,anon,authenticated,service_role;
create function private.register_legacy_requisition(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare r public.requisitions;begin
 select * into strict r from public.requisitions where id=p_id;
 if exists(select 1 from public.operational_documents where id=p_id) then return;end if;
 insert into public.operational_documents(id,care_recipient_id,type,code,protocol,status,created_by,idempotency_key,payload,workflow_data,created_at)
 values(r.id,r.care_recipient_id,'REQ',r.protocol,r.protocol,coalesce(r.status::text,'historical'),r.created_by,coalesce(r.idempotency_key,r.id),
 jsonb_build_object('patientName',r.recipient_name_snapshot,'requesterName',r.requester_name_snapshot,'legacyReconstructed',true,'sourceCreatedAt',r.created_at,
 'intent',jsonb_build_object('observations',coalesce((select jsonb_agg(body) from public.requisition_observations where requisition_id=p_id),'[]'))),
 jsonb_build_object('legacyReconstructed',true),coalesce(r.created_at,now()));
 perform private.record_document_event(p_id,'req.legacy_imported',jsonb_build_object('source','preserved_history'),gen_random_uuid());
end;$$;
alter table public.document_events disable trigger document_event_notifications;
do $$declare r record;begin for r in select id from public.requisitions where care_recipient_id is not null loop perform private.register_legacy_requisition(r.id);end loop;end;$$;
alter table public.document_events enable trigger document_event_notifications;
-- Provider diagnostics are allowlisted before they leave the database.

create or replace function private.enqueue_document_event() returns trigger language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;m record;s record;g text;begin
 if new.action='req.legacy_imported' then return new;end if;
 select * into strict d from public.operational_documents where id=new.document_id;
 if d.status='draft' then return new;end if;
 for m in select distinct p.id,p.full_name from public.profiles p left join public.care_recipient_memberships v on v.user_id=p.id and v.care_recipient_id=d.care_recipient_id and v.status='active'
 where p.status='active' and (v.id is not null or p.role='admin' and p.global_scope) loop
 if not private.user_can(d.care_recipient_id,m.id,lower(d.type)||'.read') then continue;end if;
 g:=case when exists(select 1 from public.care_recipient_memberships where care_recipient_id=d.care_recipient_id and user_id=m.id and role='family') then 'family' else 'other' end;
 insert into public.requisition_notifications(care_recipient_id,document_id,document_event_id,recipient_user_id,recipient_group,recipient_label,channel)
 values(d.care_recipient_id,d.id,new.id,m.id,g,m.full_name,'internal');
 for s in select * from public.recipient_notification_settings where care_recipient_id=d.care_recipient_id and recipient_user_id=m.id and is_enabled and channel<>'internal' loop
 insert into public.requisition_notifications(care_recipient_id,document_id,document_event_id,recipient_user_id,recipient_group,recipient_label,channel,destination)
 values(d.care_recipient_id,d.id,new.id,m.id,s.recipient_group,m.full_name,s.channel,s.destination);
 end loop;
 end loop;return new;
end;$$;
create or replace function public.document_delivery_status(p_document uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents;begin
 select * into d from public.operational_documents where id=p_document;
 if not found or not private.can(d.care_recipient_id,lower(d.type)||'.read') then raise exception 'document permission required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'requisition_id',requisition_id,'recipient_group',recipient_group,'recipient_label',recipient_label,'channel',channel,'state',state,'attempts',attempts,'attempted_at',attempted_at,'error_code',case when last_error is null then null when last_error in ('INVALID_DESTINATION','PROVIDER_RATE_LIMIT','PROVIDER_RESULT_UNCERTAIN','PROVIDER_REJECTED','CHANNEL_NOT_CONFIGURED','META_COUNTRY_RESTRICTED_130497','DOCUMENT_TEMPLATE_NOT_CONFIGURED','MEDIA_UPLOAD_FAILED','DOCUMENT_PREPARATION_FAILED') then last_error else 'PROCESSING_FAILED' end,'seen_at',seen_at)) from public.requisition_notifications where coalesce(document_id,requisition_id)=p_document),'[]');
end;$$;
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
 if not exists(select 1 from public.requisition_items i join public.requisitions r on r.id=i.requisition_id where i.id=r_id and i.care_recipient_id=p_patient and i.product_id=p.product_id and r.status<>'cancelled') then raise exception 'invalid requisition line link';end if;
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
 if not exists(select 1 from public.requisition_items i join public.requisitions r on r.id=i.requisition_id where i.id=r_id and i.care_recipient_id=p_patient and i.product_id=p.product_id and r.status<>'cancelled') then raise exception 'invalid requisition line link';end if;
 insert into public.document_request_links values(l_id,r_id);
 end loop;
 end loop;
 if p_type='BAL' and (select count(*) from public.document_lines where document_id=p_id)<>(select count(*) from public.care_recipient_products where care_recipient_id=p_patient and is_active) then raise exception 'count every active catalogue product';end if;

 update public.operational_documents set payload=p_payload,recipient_id=case when type='ENT' then (p_payload->>'recipientId')::uuid else recipient_id end,version=version+1,
 workflow_data=case when type='BAL' then workflow_data||jsonb_build_object('referenceRevision',case when p_recount then private.team_revision(p_patient) else (workflow_data->>'referenceRevision')::bigint end,'countVersion',coalesce((workflow_data->>'countVersion')::integer,0)+1) else workflow_data end where id=p_id;
 perform private.record_document_event(p_id,lower(d.type)||case when p_recount then '.recount' else '.draft_updated' end,p_payload,p_key);
 return public.operational_document(p_id);
end;$$;
alter function public.import_historical_requisitions(text,jsonb) rename to legacy_import_historical_requisitions;
revoke all on function public.legacy_import_historical_requisitions(text,jsonb) from public,anon,authenticated,service_role;
create function public.import_historical_requisitions(p_source_hash text,p_rows jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;r record;begin
 result:=public.legacy_import_historical_requisitions(p_source_hash,p_rows);
 for r in select q.id from public.requisitions q join jsonb_array_elements(p_rows) z on q.protocol='HC-'||lpad(z->>'physicalProtocol',6,'0') and q.care_recipient_id=(z->>'careRecipientId')::uuid loop perform private.register_legacy_requisition(r.id);end loop;return result;
end;$$;
grant execute on function public.import_historical_requisitions(text,jsonb) to authenticated;
create or replace function public.requisition_delivery_status(p_requisition_ids uuid[])
returns table(requisition_id uuid,id uuid,recipient_group text,recipient_label text,channel text,state text,attempts integer,attempted_at timestamptz,delivered_at timestamptz,read_at timestamptz,error_code text)
language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null or coalesce(cardinality(p_requisition_ids),0) not between 1 and 100 then raise exception 'invalid status request' using errcode='42501';end if;
 return query select coalesce(n.requisition_id,n.document_id),n.id,n.recipient_group,n.recipient_label,n.channel,n.state,n.attempts,n.attempted_at,n.delivered_at,n.read_at,
 case when n.last_error is null then null when n.last_error in ('INVALID_DESTINATION','PROVIDER_RATE_LIMIT','PROVIDER_RESULT_UNCERTAIN','PROVIDER_REJECTED','CHANNEL_NOT_CONFIGURED','META_COUNTRY_RESTRICTED_130497','DOCUMENT_TEMPLATE_NOT_CONFIGURED','MEDIA_UPLOAD_FAILED','DOCUMENT_PREPARATION_FAILED') then n.last_error else 'PROCESSING_FAILED' end
 from public.requisition_notifications n join public.requisitions r on r.id=coalesce(n.requisition_id,n.document_id) where r.id=any(p_requisition_ids) and private.can(r.care_recipient_id,'req.read') order by n.created_at,n.id;
end;$$;

