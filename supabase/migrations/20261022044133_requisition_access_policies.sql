alter table public.requisitions add column code text;
alter table public.requisitions drop constraint requisitions_protocol_format_check;
alter table public.requisitions add constraint requisitions_protocol_format_check check(protocol~'^HC-[0-9]{8}-[A-Z0-9]{8}$' or protocol~'^HC-[0-9]{6,}$' or protocol~'^REQ-[0-9]{8}-[A-Z0-9-]+$');
alter table public.requisition_items alter column current_stock type numeric(18,6);

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
 if exists(select 1 from public.requisition_items i join public.requisitions oldr on oldr.id=i.requisition_id where i.care_recipient_id=p_care_recipient_id and i.product_id=p.product_id and oldr.status<>'cancelled'
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

-- Administrative workflow cannot manufacture a physical receipt.
alter function public.transition_requisition_status(uuid,public.requisition_status,text) rename to legacy_transition_requisition_status;
revoke all on function public.legacy_transition_requisition_status(uuid,public.requisition_status,text) from public,anon,authenticated,service_role;
create function public.transition_requisition_status(p_requisition_id uuid,p_to_status public.requisition_status,p_reason text default null) returns public.requisitions
language plpgsql security definer set search_path='' as $$declare r public.requisitions;begin
 if p_to_status='delivered' then raise exception 'physical fulfillment is derived from ENT receipts';end if;
 r:=public.legacy_transition_requisition_status(p_requisition_id,p_to_status,p_reason);
 if exists(select 1 from public.operational_documents where id=r.id) then
 update public.operational_documents set status=r.status::text,version=version+1 where id=r.id;
 perform private.record_document_event(r.id,'req.status',jsonb_build_object('status',p_to_status,'reason',p_reason),gen_random_uuid());end if;
 return r;
end;$$;
grant execute on function public.transition_requisition_status(uuid,public.requisition_status,text) to authenticated;

create function private.apply_access_change(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare c public.access_change_requests;x jsonb;begin
 select * into strict c from public.access_change_requests where id=p_id;
 x:=c.proposed;
 if c.kind='settings' then
 update public.patient_settings set settings=settings||x,version=version+1,updated_at=now() where care_recipient_id=c.care_recipient_id;
 elsif c.kind='capability' then
 if x->>'subjectUser' is not null then
 insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(c.care_recipient_id,x->>'capability',(x->>'subjectUser')::uuid,(x->>'enabled')::boolean)
 on conflict(care_recipient_id,capability,subject_user) where subject_user is not null do update set enabled=excluded.enabled;
 else
 insert into public.capability_overrides(care_recipient_id,capability,subject_role,enabled) values(c.care_recipient_id,x->>'capability',x->>'subjectRole',(x->>'enabled')::boolean)
 on conflict(care_recipient_id,capability,subject_role) where subject_role is not null do update set enabled=excluded.enabled;
 end if;
 update public.patient_settings set version=version+1,updated_at=now() where care_recipient_id=c.care_recipient_id;
 elsif c.kind='membership' then
 perform public.admin_upsert_membership(c.care_recipient_id,(x->>'userId')::uuid,(x->>'role')::public.profile_role,false,false);
 update public.patient_settings set version=version+1,updated_at=now() where care_recipient_id=c.care_recipient_id;
 end if;
 update public.access_change_requests set status='applied',decided_at=now() where id=p_id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'access.applied','access_change',p_id,jsonb_build_object('care_recipient_id',c.care_recipient_id,'kind',c.kind));
end;$$;
create function public.configure_patient_access(p_patient uuid,p_kind text,p_change jsonb,p_key uuid,p_version integer,p_request_id uuid default null,p_decision text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.patient_settings;c public.access_change_requests;critical_change boolean;v_id uuid;
begin
 perform private.require_cap(p_patient,'access.manage');
 insert into public.patient_settings(care_recipient_id) values(p_patient) on conflict do nothing;
 select * into s from public.patient_settings where care_recipient_id=p_patient for update;
 if p_request_id is not null then
 select * into strict c from public.access_change_requests where id=p_request_id and care_recipient_id=p_patient for update;
 if c.status<>'pending' then return to_jsonb(c);end if;
 if c.proposed_by=auth.uid() or not exists(select 1 from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=auth.uid() and role='admin' and status='active')
 or (select count(*) from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id where m.care_recipient_id=p_patient and m.role='admin' and m.status='active' and p.status='active')<2 then raise exception 'distinct patient administrator required' using errcode='42501';end if;
 if s.version<>c.base_version then raise exception 'stale policy version' using errcode='40001';end if;
 if p_decision not in ('approve','reject') then raise exception 'invalid decision';end if;
 update public.access_change_requests set approved_by=auth.uid() where id=c.id;
 if p_decision='approve' then perform private.apply_access_change(c.id);else update public.access_change_requests set status='rejected',decided_at=now() where id=c.id;end if;
 return (select to_jsonb(q) from public.access_change_requests q where id=c.id);
 end if;
 select * into c from public.access_change_requests where care_recipient_id=p_patient and idempotency_key=p_key;
 if found then if c.kind<>p_kind or c.proposed<>p_change then raise exception 'idempotency conflict' using errcode='23505';end if;return to_jsonb(c);end if;
 if p_key is null or p_version is null or p_version<>s.version then raise exception 'stale policy version' using errcode='40001';end if;
 if p_kind='settings' then
 if exists(select 1 from jsonb_object_keys(p_change) k where k not in ('balDay','balReview','balApprovers','balRequirement','whatsappSimpleAcceptance'))
 or p_change ? 'balDay' and p_change->'balDay'<>'null'::jsonb and (p_change->>'balDay')::integer not between 0 and 6
 or p_change ? 'balReview' and p_change->>'balReview' not in ('optional','required')
 or p_change ? 'balRequirement' and p_change->>'balRequirement' not in ('any','all')
 or p_change ? 'balApprovers' and (jsonb_typeof(p_change->'balApprovers')<>'array' or jsonb_array_length(p_change->'balApprovers') not between 1 and 2 or exists(select 1 from jsonb_array_elements_text(p_change->'balApprovers') z where z not in ('family','supervisor')))
 or p_change ? 'whatsappSimpleAcceptance' and jsonb_typeof(p_change->'whatsappSimpleAcceptance')<>'boolean' then raise exception 'invalid settings';end if;
 critical_change:=(p_change ? 'balReview' and p_change->>'balReview' is distinct from s.settings->>'balReview') or p_change ? 'balApprovers' or p_change ? 'balRequirement' or coalesce((p_change->>'whatsappSimpleAcceptance')::boolean,false);
 elsif p_kind='capability' then
 if not exists(select 1 from public.capability_definitions where code=p_change->>'capability') or jsonb_typeof(p_change->'enabled') is distinct from 'boolean'
 or (p_change->>'subjectUser' is null)=(p_change->>'subjectRole' is null) then raise exception 'invalid capability override';end if;
 if p_change->>'subjectUser' is not null and not exists(select 1 from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=(p_change->>'subjectUser')::uuid and status='active') then raise exception 'invalid patient member';end if;
 critical_change:=(p_change->>'enabled')::boolean and exists(select 1 from public.capability_definitions where code=p_change->>'capability' and critical);
 elsif p_kind='membership' then critical_change:=true;
 else raise exception 'invalid access change';end if;
 insert into public.access_change_requests(care_recipient_id,kind,proposed,base_version,proposed_by,idempotency_key) values(p_patient,p_kind,p_change,s.version,auth.uid(),p_key) returning id into v_id;
 if not critical_change then perform private.apply_access_change(v_id);end if;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),case when critical_change then 'access.proposed' else 'access.changed' end,'access_change',v_id,jsonb_build_object('care_recipient_id',p_patient,'kind',p_kind));
 return (select to_jsonb(q) from public.access_change_requests q where id=v_id);
end;$$;
grant execute on function public.configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text) to authenticated;

create function public.patient_directory(p_patient uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not public.can_access_recipient(p_patient) then raise exception 'required permission' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'name',p.full_name,'role',m.role)) from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id where m.care_recipient_id=p_patient and m.status='active' and p.status='active'),'[]');
end;$$;
grant execute on function public.patient_directory(uuid) to authenticated;

create function public.configure_catalogue_unit(p_patient uuid,p_product text,p_unit text,p_decimals integer,p_barcode text default null,p_presentation text default null,p_base_quantity numeric default null) returns jsonb
language plpgsql security definer set search_path='' as $$declare v_id uuid;begin
 perform private.require_cap(p_patient,'catalog.manage');
 if p_decimals not between 0 and 6 or not exists(select 1 from public.measurement_units where code=p_unit and (care_recipient_id is null or care_recipient_id=p_patient)) then raise exception 'invalid measurement unit';end if;
 if exists(select 1 from public.stock_movements where care_recipient_id=p_patient and product_id=p_product) and exists(select 1 from public.care_recipient_products where care_recipient_id=p_patient and product_id=p_product and (unit<>p_unit or quantity_decimals<>p_decimals)) then raise exception 'unit with operational history is immutable';end if;
 update public.care_recipient_products set unit=p_unit,quantity_decimals=p_decimals where care_recipient_id=p_patient and product_id=p_product;
 if not found then raise exception 'product not found';end if;
 if p_barcode is not null then
 if p_base_quantity<=0 or p_base_quantity<>round(p_base_quantity,p_decimals) or length(trim(coalesce(p_presentation,'')))<2 then raise exception 'invalid presentation';end if;
 insert into public.product_presentations(care_recipient_id,product_id,barcode,name,base_quantity) values(p_patient,p_product,p_barcode,p_presentation,p_base_quantity)
 on conflict(care_recipient_id,barcode) do update set name=excluded.name,base_quantity=excluded.base_quantity where public.product_presentations.product_id=excluded.product_id returning id into v_id;
 if v_id is null then raise exception 'barcode already associated with another product';end if;
 end if;
 return jsonb_build_object('presentationId',v_id);
end;$$;
create function public.create_measurement_unit(p_patient uuid,p_code text,p_name text,p_dimension text,p_decimals integer) returns uuid
language plpgsql security definer set search_path='' as $$declare v_id uuid;begin
 if p_patient is null then if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
 else perform private.require_cap(p_patient,'catalog.manage');end if;
 if length(trim(p_code)) not between 1 and 30 or length(trim(p_name)) not between 2 and 80 then raise exception 'invalid unit';end if;
 insert into public.measurement_units(care_recipient_id,code,name,dimension,decimals) values(p_patient,p_code,p_name,p_dimension,p_decimals) returning id into v_id;return v_id;
end;$$;
grant execute on function public.configure_catalogue_unit(uuid,text,text,integer,text,text,numeric),public.create_measurement_unit(uuid,text,text,text,integer) to authenticated;

-- Low-level legacy transfer/inventory endpoints cannot bypass receipt or BAL rules.
revoke execute on function public.record_stock_movement(uuid,text,integer,public.stock_movement_type,text,text,text,uuid,text,uuid),
 public.create_stock_inventory(uuid,text),public.add_stock_inventory_item(uuid,text,bigint,text),public.submit_stock_inventory(uuid),public.approve_stock_inventory(uuid),public.recount_stock_inventory(uuid),public.review_stock_inventory(uuid,text,text) from authenticated;
