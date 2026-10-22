-- Exact quantities and custody transitions share the established append-only ledger.
drop view public.current_stock_balances;
alter table public.stock_movements alter column quantity type numeric(18,6),
 alter column source_balance_before type numeric(18,6),alter column source_balance_after type numeric(18,6),
 alter column destination_balance_before type numeric(18,6),alter column destination_balance_after type numeric(18,6);
alter table public.stock_movements drop constraint stock_movement_locations_check;
alter table public.stock_movements add constraint stock_movement_locations_check check(
 (source_location is null or source_location in ('FAMILY','CARE_TEAM','TRANSIT')) and
 (destination_location is null or destination_location in ('FAMILY','CARE_TEAM','TRANSIT')));
create or replace function public.guard_stock_movement_balance() returns trigger
language plpgsql security definer set search_path='' as $$
declare s numeric:=0;t numeric:=0;precision_limit integer;
begin
 if new.care_recipient_id is null then raise exception 'patient required';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||new.care_recipient_id,0));
 select quantity_decimals into precision_limit from public.care_recipient_products where care_recipient_id=new.care_recipient_id and product_id=new.product_id;
 if new.quantity<>round(new.quantity,precision_limit) then raise exception 'incompatible product precision';end if;
 if new.source_location is null and new.destination_location is null or new.source_location=new.destination_location then raise exception 'invalid stock locations';end if;
 new.movement_revision:=nextval(pg_get_serial_sequence('public.stock_movements','movement_revision'));
 if new.source_location is not null then
 select coalesce(sum(case when destination_location=new.source_location then quantity else 0 end-case when source_location=new.source_location then quantity else 0 end),0)
 into s from public.stock_movements where care_recipient_id=new.care_recipient_id and product_id=new.product_id;
 if s<new.quantity and not(new.extraordinary_confirmed and new.reference_type='extraordinary_adjustment' and public.is_global_administrator()) then raise exception 'insufficient stock' using errcode='23514';end if;
 new.source_balance_before:=s;new.source_balance_after:=s-new.quantity;
 end if;
 if new.destination_location is not null then
 select coalesce(sum(case when destination_location=new.destination_location then quantity else 0 end-case when source_location=new.destination_location then quantity else 0 end),0)
 into t from public.stock_movements where care_recipient_id=new.care_recipient_id and product_id=new.product_id;
 new.destination_balance_before:=t;new.destination_balance_after:=t+new.quantity;
 end if;
 return new;
end;$$;
create view public.current_stock_balances with(security_invoker=true) as
 select care_recipient_id,product_id,location,sum(delta) as balance from (
 select care_recipient_id,product_id,destination_location location,quantity delta from public.stock_movements where destination_location is not null
 union all select care_recipient_id,product_id,source_location,-quantity from public.stock_movements where source_location is not null
 ) x where care_recipient_id is not null and case location when 'FAMILY' then private.can(care_recipient_id,'stock.family.read')
 when 'CARE_TEAM' then private.can(care_recipient_id,'stock.team.read') else private.can(care_recipient_id,'ent.read') end
 group by care_recipient_id,product_id,location;
grant select on public.current_stock_balances to authenticated;
do $$declare p record;begin
 for p in select policyname from pg_policies where schemaname='public' and tablename='stock_movements' loop
 execute format('drop policy %I on public.stock_movements',p.policyname);end loop;
end;$$;
create policy ledger_custody_read on public.stock_movements for select to authenticated using(
 private.can(care_recipient_id,'stock.family.read') or private.can(care_recipient_id,'stock.team.read') and
 (source_location in ('CARE_TEAM','TRANSIT') or destination_location in ('CARE_TEAM','TRANSIT')));

create function private.stock_quantity(p_patient uuid,p_product text,p_location text) returns numeric
language sql stable security definer set search_path='' as $$
 select coalesce(sum(case when destination_location=p_location then quantity else 0 end-case when source_location=p_location then quantity else 0 end),0)
 from public.stock_movements where care_recipient_id=p_patient and product_id=p_product;
$$;
create function private.team_revision(p_patient uuid) returns bigint language sql stable security definer set search_path='' as $$
 select coalesce(max(movement_revision),0) from public.stock_movements where care_recipient_id=p_patient and
 (source_location in ('CARE_TEAM','TRANSIT') or destination_location in ('CARE_TEAM','TRANSIT'));
$$;
create function private.move_stock(p_patient uuid,p_product text,p_quantity numeric,p_source text,p_destination text,p_reason text,p_reference text,p_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$declare v_id uuid;begin
 if p_quantity<=0 then raise exception 'positive quantity required';end if;
 insert into public.stock_movements(care_recipient_id,product_id,quantity,movement_type,performed_by,source_location,destination_location,justification,reference_type,reference_id)
 values(p_patient,p_product,p_quantity,case when p_source is null then 'inbound'::public.stock_movement_type when p_destination is null then 'outbound'::public.stock_movement_type else 'outbound'::public.stock_movement_type end,
 auth.uid(),p_source,p_destination,p_reason,p_reference,p_id) returning id into v_id;return v_id;
end;$$;
create function private.require_cap(p_patient uuid,p_cap text) returns void language plpgsql security definer set search_path='' as $$begin
 if not private.can(p_patient,p_cap) or not exists(select 1 from public.care_recipients where id=p_patient and is_active) then
 raise exception 'required permission: %',p_cap using errcode='42501';end if;
end;$$;

create function public.operational_document(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents;begin
 select * into d from public.operational_documents where id=p_id;
 if not found or not private.can(d.care_recipient_id,lower(d.type)||'.read') then raise exception 'document not found' using errcode='42501';end if;
 return to_jsonb(d)||jsonb_build_object('lines',coalesce((select jsonb_agg(to_jsonb(l)||jsonb_build_object('requisitionItemIds',coalesce((select jsonb_agg(requisition_item_id) from public.document_request_links where document_line_id=l.id),'[]')) order by l.category_snapshot,l.name_snapshot) from public.document_lines l where document_id=p_id),'[]'),
 'events',coalesce((select jsonb_agg(jsonb_build_object('id',id,'version',version,'action',action,'actorId',actor_id,'createdAt',created_at,'hash',content_hash) order by version) from public.document_events where document_id=p_id),'[]'),
 'receipts',coalesce((select jsonb_agg(to_jsonb(r) order by created_at) from public.purchase_receipts r where document_id=p_id),'[]'),
 'approvals',coalesce((select jsonb_agg(to_jsonb(a)) from public.bal_approvals a where document_id=p_id),'[]'),
 'fullyCheckedLines',(select count(*) from public.document_lines where document_id=p_id and fully_checked),
 'totalLines',(select count(*) from public.document_lines where document_id=p_id));
end;$$;

create function private.apply_bal(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;l public.document_lines;delta numeric;begin
 select * into strict d from public.operational_documents where id=p_id;
 if d.status='approved' then return;end if;
 if private.team_revision(d.care_recipient_id)<>(d.workflow_data->>'referenceRevision')::bigint then raise exception 'inventory conflict: reference changed; recount' using errcode='40001';end if;
 for l in select * from public.document_lines where document_id=p_id order by product_id loop
 delta:=l.quantity-private.stock_quantity(d.care_recipient_id,l.product_id,'CARE_TEAM');
 if delta<>0 then perform private.move_stock(d.care_recipient_id,l.product_id,abs(delta),case when delta<0 then 'CARE_TEAM' end,case when delta>0 then 'CARE_TEAM' end,
 'Reconciliação BAL','bal',d.id);end if;
 update public.document_lines set fully_checked=true,accepted_quantity=quantity where id=l.id;
 end loop;
 update public.operational_documents set status='approved',workflow_data=workflow_data||jsonb_build_object('appliedAt',now()) where id=p_id;
end;$$;

create function public.create_supply_document(p_patient uuid,p_type text,p_payload jsonb,p_key uuid,p_draft boolean default false) returns jsonb
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
 if p_payload->>'source'='FAMILY' and public.recipient_role(p_patient) not in ('admin','family') then perform private.require_cap(p_patient,'stock.family.manage');end if;
 v_recipient:=(p_payload->>'recipientId')::uuid;
 if v_recipient is null or v_recipient=auth.uid() or not exists(select 1 from public.care_recipient_memberships m join public.profiles a on a.id=m.user_id where m.care_recipient_id=p_patient and m.user_id=v_recipient and m.status='active' and a.status='active'
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

create function private.credit_purchase_receipt(p_receipt uuid) returns void language plpgsql security definer set search_path='' as $$
declare r public.purchase_receipts;d public.operational_documents;x jsonb;l public.document_lines;q numeric;begin
 select * into strict r from public.purchase_receipts where id=p_receipt for update;
 if r.state='approved' then return;end if;
 select * into strict d from public.operational_documents where id=r.document_id;
 for x in select value from jsonb_array_elements(r.lines) loop
 select * into strict l from public.document_lines where id=(x->>'lineId')::uuid and document_id=d.id;
 q:=(x->>'quantity')::numeric;
 if q<=0 or l.accepted_quantity+q>l.purchased_quantity then raise exception 'invalid receipt quantity';end if;
 perform private.move_stock(d.care_recipient_id,l.product_id,q,null,'FAMILY','Recebimento COM validado','purchase_receipt',r.id);
 update public.document_lines set accepted_quantity=accepted_quantity+q,fully_checked=accepted_quantity+q=approved_quantity where id=l.id;
 end loop;
 update public.purchase_receipts set state='approved',validated_by=auth.uid(),validated_at=now() where id=r.id;
 update public.operational_documents set status=case when not exists(select 1 from public.document_lines where document_id=d.id and accepted_quantity<approved_quantity) then 'received' else 'partially_received' end where id=d.id;
end;$$;

create function public.supply_document_command(p_id uuid,p_action text,p_body jsonb,p_key uuid,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;e public.document_events;l public.document_lines;x jsonb;q numeric;delta numeric;r_id uuid;v_group text;s jsonb;all_ok boolean;any_ok boolean;cnt integer;v_actor uuid;v_return numeric;v_consumed numeric;
begin
 select * into d from public.operational_documents where id=p_id;
 if not found then raise exception 'document not found';end if;
 perform private.require_cap(d.care_recipient_id,lower(d.type)||'.read');
 perform pg_advisory_xact_lock(hashtextextended('stock:'||d.care_recipient_id,0));
 select * into d from public.operational_documents where id=p_id for update;
 select * into e from public.document_events where actor_id=auth.uid() and idempotency_key=p_key;
 if found then
 if e.document_id<>p_id or e.action<>lower(d.type)||'.'||p_action or e.body->'event'<>p_body then raise exception 'idempotency conflict' using errcode='23505';end if;
 return public.operational_document(p_id);end if;
 if p_key is null or p_version is null or d.version<>p_version then raise exception 'stale document version' using errcode='40001';end if;
 if d.status in ('cancelled','rejected') then raise exception 'document is terminal';end if;
 update public.operational_documents set version=version+1 where id=p_id;
 if p_action='submit' and d.status='draft' then
 perform private.require_cap(d.care_recipient_id,case d.type when 'BAL' then 'bal.count' else lower(d.type)||'.create' end);
 perform private.emit_document(p_id);
 update public.operational_documents set status=case d.type when 'COM' then case when public.recipient_role(d.care_recipient_id)='admin' then 'approved' else 'pending_approval' end when 'ENT' then 'pending_receipt' else 'submitted' end where id=p_id;
 if d.type='ENT' then for l in select * from public.document_lines where document_id=p_id order by product_id loop
 perform private.move_stock(d.care_recipient_id,l.product_id,l.quantity,d.payload->>'source','TRANSIT','Expedição ENT','document',d.id);end loop;end if;
 if d.type='BAL' and d.workflow_data->'reviewPolicy'->>'balReview'='optional' then perform private.apply_bal(d.id);end if;
 elsif d.type='COM' and p_action='approve' then
 perform private.require_cap(d.care_recipient_id,'com.approve');
 if d.status<>'pending_approval' or jsonb_array_length(p_body->'lines')<>(select count(*) from public.document_lines where document_id=p_id) then raise exception 'invalid approval';end if;
 for x in select value from jsonb_array_elements(p_body->'lines') loop
 select * into strict l from public.document_lines where id=(x->>'lineId')::uuid and document_id=p_id;
 q:=(x->>'quantity')::numeric;
 if q is null or q<0 or q>l.quantity or q<>round(q,(select quantity_decimals from public.care_recipient_products where care_recipient_id=d.care_recipient_id and product_id=l.product_id)) then raise exception 'invalid approval quantity';end if;
 if q<>l.quantity and length(trim(coalesce(p_body->>'reason','')))<3 then raise exception 'approval reason required';end if;
 update public.document_lines set approved_quantity=q where id=l.id;
 end loop;
 if (select count(distinct x->>'lineId') from jsonb_array_elements(p_body->'lines') x)<>jsonb_array_length(p_body->'lines') then raise exception 'duplicate lines';end if;
 update public.operational_documents set status=case when not exists(select 1 from public.document_lines where document_id=p_id and approved_quantity>0) then 'rejected' when exists(select 1 from public.document_lines where document_id=p_id and approved_quantity<quantity) then 'partially_approved' else 'approved' end where id=p_id;
 elsif d.type='COM' and p_action='purchase' then
 perform private.require_cap(d.care_recipient_id,'com.purchase');
 if d.status not in ('approved','partially_approved','purchasing','partially_received') then raise exception 'purchase requires approval';end if;
 for x in select value from jsonb_array_elements(p_body->'lines') loop
 select * into strict l from public.document_lines where id=(x->>'lineId')::uuid and document_id=p_id;
 q:=(x->>'quantity')::numeric;
 if q<=0 or q is null or l.purchased_quantity+q>l.approved_quantity then raise exception 'purchase exceeds approved quantity';end if;
 update public.document_lines set purchased_quantity=purchased_quantity+q where id=l.id;
 end loop;
 update public.operational_documents set status=case when exists(select 1 from public.document_lines where document_id=p_id and purchased_quantity<approved_quantity) then 'purchasing' else 'purchased' end where id=p_id;
 elsif d.type='COM' and p_action='receive' then
 perform private.require_cap(d.care_recipient_id,'com.receive');
 if d.status not in ('purchased','purchasing','partially_received') or jsonb_array_length(p_body->'lines')<1 then raise exception 'purchase required';end if;
 if (select count(distinct x->>'lineId') from jsonb_array_elements(p_body->'lines') x)<>jsonb_array_length(p_body->'lines') then raise exception 'duplicate lines';end if;
 for x in select value from jsonb_array_elements(p_body->'lines') loop
 select * into strict l from public.document_lines where id=(x->>'lineId')::uuid and document_id=p_id;
 q:=(x->>'quantity')::numeric;
 select coalesce(sum((z->>'quantity')::numeric),0) into delta from public.purchase_receipts r cross join lateral jsonb_array_elements(r.lines) z where r.document_id=p_id and r.state='pending' and z->>'lineId'=l.id::text;
 if q is null or q<=0 or l.accepted_quantity+delta+q>l.purchased_quantity then raise exception 'receipt exceeds purchased quantity';end if;
 end loop;
 insert into public.purchase_receipts(document_id,submitted_by,state,lines) values(p_id,auth.uid(),'pending',p_body->'lines') returning id into r_id;
 if public.recipient_role(d.care_recipient_id)='admin' then perform private.credit_purchase_receipt(r_id);end if;
 elsif d.type='COM' and p_action in ('validate_receipt','reject_receipt') then
 perform private.require_cap(d.care_recipient_id,'com.validate');
 r_id:=(p_body->>'receiptId')::uuid;
 if not exists(select 1 from public.purchase_receipts where id=r_id and document_id=p_id and state='pending') then raise exception 'receipt not pending';end if;
 if p_action='validate_receipt' then perform private.credit_purchase_receipt(r_id);
 else if length(trim(coalesce(p_body->>'reason','')))<3 then raise exception 'reason required';end if;
 update public.purchase_receipts set state='rejected',reason=p_body->>'reason',validated_by=auth.uid(),validated_at=now() where id=r_id;end if;
 elsif d.type='ENT' and p_action='reassign' then
 if d.status<>'pending_receipt' or exists(select 1 from public.document_lines where document_id=p_id and accepted_quantity>0) or d.created_by<>auth.uid() and not public.can_manage_recipient(d.care_recipient_id) then raise exception 'reassignment not authorized' using errcode='42501';end if;
 v_actor:=(p_body->>'recipientId')::uuid;
 if length(trim(coalesce(p_body->>'reason','')))<3 or v_actor=d.created_by or not exists(select 1 from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id where m.care_recipient_id=d.care_recipient_id and m.user_id=v_actor and m.status='active' and p.status='active' and m.role::text in ('admin',case when d.payload->>'destination'='FAMILY' then 'family' else 'professional' end,case when d.payload->>'destination'='CARE_TEAM' then 'supervisor' else 'family' end)) then raise exception 'invalid recipient';end if;
 update public.operational_documents set recipient_id=v_actor where id=p_id;
 elsif d.type='ENT' and p_action='receive' then
 perform private.require_cap(d.care_recipient_id,'ent.receive');
 if auth.uid()<>d.recipient_id or d.status<>'pending_receipt' then raise exception 'only designated recipient may accept' using errcode='42501';end if;
 if exists(select 1 from jsonb_array_elements(coalesce(p_body->'divergences','[]')) z where not exists(select 1 from public.document_lines where document_id=p_id and id=(z->>'lineId')::uuid)) then raise exception 'invalid divergent line';end if;
 for l in select * from public.document_lines where document_id=p_id order by product_id loop
 select z into x from jsonb_array_elements(coalesce(p_body->'divergences','[]')) z where z->>'lineId'=l.id::text;
 if found then q:=coalesce((x->>'acceptedQuantity')::numeric,0);else q:=l.quantity;end if;
 if q<0 or q>l.quantity then raise exception 'invalid accepted quantity';end if;
 if q>0 then perform private.move_stock(d.care_recipient_id,l.product_id,q,'TRANSIT',d.payload->>'destination','Aceite ENT','document',d.id);end if;
 update public.document_lines set accepted_quantity=q,fully_checked=x is null,metadata=metadata||jsonb_build_object('issueOpen',x is not null,'receipt',coalesce(x,'{}')) where id=l.id;
 end loop;
 update public.operational_documents set status=case when exists(select 1 from public.document_lines where document_id=p_id and not fully_checked) then 'disputed' else 'confirmed' end,workflow_data=workflow_data||jsonb_build_object('acceptedBy',auth.uid(),'acceptedAt',now()) where id=p_id;
 elsif d.type='ENT' and p_action='resolve' then
 if d.status<>'disputed' or auth.uid()<>d.recipient_id and not public.can_manage_recipient(d.care_recipient_id) then raise exception 'resolution not authorized' using errcode='42501';end if;
 select * into strict l from public.document_lines where id=(p_body->>'lineId')::uuid and document_id=p_id;
 q:=coalesce((p_body->>'quantity')::numeric,0);
 if q<0 or q>l.quantity-l.accepted_quantity-l.reconciled_quantity or length(trim(coalesce(p_body->>'reason','')))<3 then raise exception 'invalid reconciliation';end if;
 if p_body->>'resolution'='received' then
 if auth.uid()<>d.recipient_id then raise exception 'only designated recipient may accept' using errcode='42501';end if;
 if q>0 then perform private.move_stock(d.care_recipient_id,l.product_id,q,'TRANSIT',d.payload->>'destination','Recebimento complementar ENT','document',d.id);end if;
 update public.document_lines set accepted_quantity=accepted_quantity+q where id=l.id;
 elsif p_body->>'resolution' in ('missing','returned') then
 if q>0 then perform private.move_stock(d.care_recipient_id,l.product_id,q,'TRANSIT',case when p_body->>'resolution'='returned' then d.payload->>'source' end,p_body->>'reason','document',d.id);end if;
 update public.document_lines set reconciled_quantity=reconciled_quantity+q where id=l.id;
 else raise exception 'invalid resolution';end if;
 update public.document_lines set fully_checked=accepted_quantity=quantity,metadata=metadata||jsonb_build_object('issueOpen',accepted_quantity+reconciled_quantity<quantity) where id=l.id;
 update public.operational_documents set status=case when exists(select 1 from public.document_lines where document_id=p_id and coalesce((metadata->>'issueOpen')::boolean,false)) then 'disputed' else 'confirmed' end where id=p_id;
 elsif d.type='BAL' and p_action='approve' then
 v_group:=p_body->>'group';s:=d.workflow_data->'reviewPolicy';
 if v_group not in ('family','supervisor') or not(s->'balApprovers' ? v_group) then raise exception 'review group not enabled';end if;
 perform private.require_cap(d.care_recipient_id,'bal.approve.'||v_group);
 if d.status not in ('submitted','approved') then raise exception 'BAL not submitted';end if;
 insert into public.bal_approvals(document_id,review_group,actor_id,count_version) values(p_id,v_group,auth.uid(),(d.workflow_data->>'countVersion')::integer);
 select count(*) into cnt from public.bal_approvals where document_id=p_id;
 if d.status<>'approved' and (s->>'balRequirement'='any' and cnt>0 or s->>'balRequirement'='all' and cnt=jsonb_array_length(s->'balApprovers')) then perform private.apply_bal(p_id);end if;
 elsif p_action='cancel' and d.type in ('COM','ENT','BAL') then
 if length(trim(coalesce(p_body->>'reason','')))<3 then raise exception 'reason required';end if;
 if d.type='ENT' then
 if exists(select 1 from public.document_lines where document_id=p_id and accepted_quantity>0) then
 perform private.require_cap(d.care_recipient_id,'ent.cancel');
 update public.operational_documents set status='cancellation_pending',workflow_data=workflow_data||jsonb_build_object('cancellationRequestedBy',auth.uid(),'cancellationReason',p_body->>'reason') where id=p_id;
 else
 if d.created_by<>auth.uid() and not public.can_manage_recipient(d.care_recipient_id) then raise exception 'cancel not authorized' using errcode='42501';end if;
 if d.status<>'draft' then for l in select * from public.document_lines where document_id=p_id order by product_id loop
 q:=l.quantity-l.accepted_quantity-l.reconciled_quantity;
 if q>0 then perform private.move_stock(d.care_recipient_id,l.product_id,q,'TRANSIT',d.payload->>'source','Cancelamento ENT antes do aceite','document',d.id);end if;
 end loop;end if;
 update public.operational_documents set status='cancelled' where id=p_id;
 end if;
 else
 perform private.require_cap(d.care_recipient_id,case d.type when 'COM' then 'com.approve' else 'access.manage' end);
 if exists(select 1 from public.document_lines where document_id=p_id and (accepted_quantity>0 or purchased_quantity>0)) or d.status='approved' and d.type='BAL' then raise exception 'reconciliation required before cancellation';end if;
 update public.operational_documents set status='cancelled' where id=p_id;
 end if;
 elsif d.type='ENT' and p_action='consent_cancel' then
 perform private.require_cap(d.care_recipient_id,'ent.receive');
 if d.status<>'cancellation_pending' or auth.uid()<>d.recipient_id then raise exception 'original recipient consent required' using errcode='42501';end if;
 if jsonb_array_length(p_body->'lines')<>(select count(*) from public.document_lines where document_id=p_id) or length(trim(coalesce(p_body->>'reason','')))<3 then raise exception 'cancellation reconciliation required';end if;
 if (select count(distinct z->>'lineId') from jsonb_array_elements(p_body->'lines') z)<>jsonb_array_length(p_body->'lines') then raise exception 'duplicate lines';end if;
 for l in select * from public.document_lines where document_id=p_id order by product_id loop
 select z into strict x from jsonb_array_elements(p_body->'lines') z where z->>'lineId'=l.id::text;
 v_return:=coalesce((x->>'returnQuantity')::numeric,0);v_consumed:=coalesce((x->>'consumedQuantity')::numeric,0);
 if v_return<0 or v_consumed<0 or v_return+v_consumed<>l.accepted_quantity then raise exception 'account for all accepted material';end if;
 if v_consumed>0 then
 select coalesce(sum(quantity),0) into q from public.stock_movements where care_recipient_id=d.care_recipient_id and product_id=l.product_id and source_location=d.payload->>'destination' and destination_location is null and reference_type='consumption' and created_at>=d.created_at;
 select coalesce(sum((z->>'consumedQuantity')::numeric),0) into delta from public.document_events e cross join lateral jsonb_array_elements(coalesce(e.body->'event'->'lines','[]')) z join public.document_lines dl on dl.id=(z->>'lineId')::uuid where e.care_recipient_id=d.care_recipient_id and e.action='ent.consent_cancel' and dl.product_id=l.product_id;
 if q-delta<v_consumed then raise exception 'record and reconcile actual consumption first';end if;
 end if;
 if v_return>0 then perform private.move_stock(d.care_recipient_id,l.product_id,v_return,d.payload->>'destination',d.payload->>'source','Devolução consentida no cancelamento ENT','document',d.id);end if;
 q:=l.quantity-l.accepted_quantity-l.reconciled_quantity;
 if q>0 then perform private.move_stock(d.care_recipient_id,l.product_id,q,'TRANSIT',d.payload->>'source','Regularização de trânsito no cancelamento ENT','document',d.id);end if;
 end loop;
 update public.operational_documents set status='cancelled' where id=p_id;
 else raise exception 'invalid operation for document state';
 end if;
 perform private.record_document_event(p_id,lower(d.type)||'.'||p_action,p_body,p_key);
 return public.operational_document(p_id);
end;$$;

create function public.family_stock_movement(p_patient uuid,p_product text,p_quantity numeric,p_action text,p_reason text,p_key uuid,p_reference uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v public.stock_movements;v_id uuid;h text;begin
 perform private.require_cap(p_patient,'stock.family.manage');
 if p_quantity<=0 or p_quantity is null or p_quantity>1000000000 or p_action not in ('inbound','outbound','correction_in','correction_out') or length(trim(coalesce(p_reason,''))) not between 3 and 1000 or p_key is null then raise exception 'invalid family movement';end if;
 h:=encode(extensions.digest(jsonb_build_array(p_patient,p_product,p_quantity,p_action,trim(p_reason),p_reference)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
 select * into v from public.stock_movements where performed_by=auth.uid() and idempotency_key=p_key;
 if found then if v.payload_hash<>h then raise exception 'idempotency conflict' using errcode='23505';end if;return v.id;end if;
 if p_reference is not null and not exists(select 1 from public.stock_movements where id=p_reference and care_recipient_id=p_patient and product_id=p_product and reference_type='family_manual') then raise exception 'invalid compensation reference';end if;
 v_id:=private.move_stock(p_patient,p_product,p_quantity,case when p_action in ('outbound','correction_out') then 'FAMILY' end,case when p_action in ('inbound','correction_in') then 'FAMILY' end,trim(p_reason),'family_manual',p_reference);
 update public.stock_movements set idempotency_key=p_key,payload_hash=h where id=v_id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'stock.family.'||p_action,'stock_movement',v_id,jsonb_build_object('care_recipient_id',p_patient));
 return v_id;
end;$$;

create function public.requisition_fulfillment(p_requisition uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p uuid;begin
 select care_recipient_id into p from public.requisitions where id=p_requisition;
 if not private.can(p,'req.read') then raise exception 'required permission' using errcode='42501';end if;
 return (select jsonb_build_object('total',count(*),'fulfilled',count(*) filter(where attended),'lines',coalesce(jsonb_agg(jsonb_build_object('id',i.id,'productId',i.product_id,'attended',attended,'deliveries',deliveries)),'[]'))
 from (select i.*,exists(select 1 from public.document_request_links x join public.document_lines l on l.id=x.document_line_id join public.operational_documents d on d.id=l.document_id where x.requisition_item_id=i.id and d.type='ENT' and d.status<>'cancelled' and l.accepted_quantity>0) attended,
 coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'code',d.code,'acceptedQuantity',l.accepted_quantity::text,'status',d.status)) from public.document_request_links x join public.document_lines l on l.id=x.document_line_id join public.operational_documents d on d.id=l.document_id where x.requisition_item_id=i.id and d.type='ENT'),'[]') deliveries
 from public.requisition_items i where i.requisition_id=p_requisition) i);
end;$$;

create function public.requisition_item_context(p_patient uuid,p_products text[]) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not private.can(p_patient,'req.read') or cardinality(p_products)>1000 then raise exception 'required permission' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('productId',c.product_id,'familyStock',case when private.can(p_patient,'req.family_stock') then private.stock_quantity(p_patient,c.product_id,'FAMILY')::text else null end,
 'pending',coalesce((select jsonb_agg(jsonb_build_object('requisitionId',r.id,'lineId',i.id,'code',coalesce(d.code,r.protocol),'createdAt',r.created_at,'status',r.status)) from public.requisition_items i join public.requisitions r on r.id=i.requisition_id left join public.operational_documents d on d.id=r.id where i.care_recipient_id=p_patient and i.product_id=c.product_id and r.status<>'cancelled' and not exists(select 1 from public.document_request_links k join public.document_lines dl on dl.id=k.document_line_id join public.operational_documents od on od.id=dl.document_id where k.requisition_item_id=i.id and od.type='ENT' and od.status<>'cancelled' and dl.accepted_quantity>0)),'[]')))
 from public.care_recipient_products c where c.care_recipient_id=p_patient and c.product_id=any(p_products)),'[]');
end;$$;

grant execute on function public.create_supply_document(uuid,text,jsonb,uuid,boolean),public.supply_document_command(uuid,text,jsonb,uuid,integer),public.operational_document(uuid),public.family_stock_movement(uuid,text,numeric,text,text,uuid,uuid),public.requisition_fulfillment(uuid),public.requisition_item_context(uuid,text[]) to authenticated;
