-- Incremental validation of public RPC contracts and legacy privilege entry points.
create function private.validate_supply_command(d public.operational_documents,p_action text,p_body jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare a jsonb;x jsonb;l public.document_lines;q numeric;precision_limit integer;begin
 if p_action is null or jsonb_typeof(p_body) is distinct from 'object' then raise exception 'invalid command body';end if;
 if p_action in ('purchase','consent_cancel') or d.type='COM' and p_action in ('approve','receive') then
 a:=p_body->'lines';
 if jsonb_typeof(a) is distinct from 'array' or jsonb_array_length(a) not between 1 and 1000 then raise exception 'invalid command lines';end if;
 if (select count(distinct z->>'lineId') from jsonb_array_elements(a) z)<>jsonb_array_length(a) then raise exception 'duplicate command lines';end if;
 elsif d.type='ENT' and p_action='receive' then
 a:=p_body->'divergences';
 if jsonb_typeof(a) is distinct from 'array' or jsonb_array_length(a)>1000 then raise exception 'invalid divergences';end if;
 if (select count(distinct z->>'lineId') from jsonb_array_elements(a) z)<>jsonb_array_length(a) then raise exception 'duplicate divergent lines';end if;
 elsif p_action='resolve' then a:=jsonb_build_array(p_body);
 end if;
 for x in select value from jsonb_array_elements(coalesce(a,'[]')) loop
 if jsonb_typeof(x) is distinct from 'object' or x->>'lineId' is null then raise exception 'invalid line';end if;
 select * into l from public.document_lines where document_id=d.id and id=(x->>'lineId')::uuid;
 if not found then raise exception 'line does not belong to document';end if;
 select quantity_decimals into strict precision_limit from public.care_recipient_products where care_recipient_id=d.care_recipient_id and product_id=l.product_id;
 if p_action='consent_cancel' then
 if not (x ?& array['returnQuantity','consumedQuantity']) or x->>'returnQuantity' is null or x->>'consumedQuantity' is null then raise exception 'cancellation quantities required';end if;
 if exists(select 1 from jsonb_each_text(x) z where z.key in ('returnQuantity','consumedQuantity') and (z.value !~ '^[0-9]+([.][0-9]{1,6})?$' or z.value::numeric<>round(z.value::numeric,precision_limit))) then raise exception 'invalid cancellation quantity';end if;
 else
 q:=case when d.type='ENT' and p_action='receive' then (x->>'acceptedQuantity')::numeric else (x->>'quantity')::numeric end;
 if q is null or q<0 or q>1000000000 or q<>round(q,precision_limit) then raise exception 'invalid product quantity';end if;
 end if;
 end loop;
 if p_action='validate_receipt' or p_action='reject_receipt' then if p_body->>'receiptId' is null then raise exception 'receipt required';end if;end if;
 if p_action='approve' and d.type='BAL' and coalesce(p_body->>'group','') not in ('family','supervisor') then raise exception 'review group required';end if;
 if p_action='resolve' and coalesce(p_body->>'resolution','') not in ('received','missing','returned') then raise exception 'resolution required';end if;
end;$$;

-- Legacy administration cannot bypass a second administrator's approval.
create function private.guard_membership_elevation() returns trigger language plpgsql security definer set search_path='' as $$
declare closed boolean;n integer;old_role text;begin
 if current_user<>'authenticated' and auth.uid() is null then return new;end if;
 if new.status<>'active' then return new;end if;
 old_role:=case when tg_op='UPDATE' and old.status='active' then old.role::text else null end;
 if new.role::text=coalesce(old_role,'') or new.role not in ('admin','supervisor') then return new;end if;
 perform pg_advisory_xact_lock(hashtextextended('membership:'||new.care_recipient_id,0));
 insert into public.patient_settings(care_recipient_id) values(new.care_recipient_id) on conflict do nothing;
 select bootstrap_closed into closed from public.patient_settings where care_recipient_id=new.care_recipient_id for update;
 select count(*) into n from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id where m.care_recipient_id=new.care_recipient_id and m.role='admin' and m.status='active' and p.status='active';
 if new.role='admin' and public.is_global_administrator() and not closed and n<2 then return new;end if;
 if not exists(select 1 from public.access_change_requests c where c.care_recipient_id=new.care_recipient_id and c.kind='membership' and c.status='pending'
 and c.proposed->>'userId'=new.user_id::text and c.proposed->>'role'=new.role::text and c.approved_by=auth.uid() and c.approved_by<>c.proposed_by
 and (select count(*) from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id where m.care_recipient_id=new.care_recipient_id and m.user_id in (c.proposed_by,c.approved_by) and m.role='admin' and m.status='active' and p.status='active')=2)
 then raise exception 'critical role requires distinct administrator approval' using errcode='42501';end if;
 return new;
end;$$;
create trigger membership_elevation before insert or update on public.care_recipient_memberships for each row execute function private.guard_membership_elevation();
create function private.close_admin_bootstrap() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.role='admin' and new.status='active' and (select count(*) from public.care_recipient_memberships where care_recipient_id=new.care_recipient_id and role='admin' and status='active')>=2 then
 insert into public.patient_settings(care_recipient_id,bootstrap_closed) values(new.care_recipient_id,true) on conflict(care_recipient_id) do update set bootstrap_closed=true;end if;return null;
end;$$;
create trigger close_admin_bootstrap after insert or update on public.care_recipient_memberships for each row execute function private.close_admin_bootstrap();
update public.patient_settings s set bootstrap_closed=true where (select count(*) from public.care_recipient_memberships where care_recipient_id=s.care_recipient_id and role='admin' and status='active')>=2;

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
 if p_payload->>'source'='FAMILY' and public.recipient_role(p_patient) not in ('admin','family') then perform private.require_cap(p_patient,'stock.family.manage');end if;
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
create or replace function public.supply_document_command(p_id uuid,p_action text,p_body jsonb,p_key uuid,p_version integer) returns jsonb
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
 perform private.validate_supply_command(d,p_action,p_body);
 update public.operational_documents set version=version+1 where id=p_id;
 if p_action='submit' and d.status='draft' then
 perform private.require_cap(d.care_recipient_id,case d.type when 'BAL' then 'bal.count' else lower(d.type)||'.create' end);
 if d.type='ENT' and (not private.user_can(d.care_recipient_id,d.recipient_id,'ent.receive') or d.recipient_id=d.created_by) then raise exception 'invalid designated recipient' using errcode='42501';end if;
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
 if (select count(distinct entry.value->>'lineId') from jsonb_array_elements(p_body->'lines') entry)<>jsonb_array_length(p_body->'lines') then raise exception 'duplicate lines';end if;
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
 update public.operational_documents set status=case when exists(select 1 from public.document_lines where document_id=p_id and accepted_quantity>0) then 'partially_received' when exists(select 1 from public.document_lines where document_id=p_id and purchased_quantity<approved_quantity) then 'purchasing' else 'purchased' end where id=p_id;
 elsif d.type='COM' and p_action='receive' then
 perform private.require_cap(d.care_recipient_id,'com.receive');
 if d.status not in ('purchased','purchasing','partially_received') or jsonb_array_length(p_body->'lines')<1 then raise exception 'purchase required';end if;
 if (select count(distinct entry.value->>'lineId') from jsonb_array_elements(p_body->'lines') entry)<>jsonb_array_length(p_body->'lines') then raise exception 'duplicate lines';end if;
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
 if length(trim(coalesce(p_body->>'reason','')))<3 or v_actor=d.created_by or not private.user_can(d.care_recipient_id,v_actor,'ent.receive') or not exists(select 1 from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id where m.care_recipient_id=d.care_recipient_id and m.user_id=v_actor and m.status='active' and p.status='active' and m.role::text in ('admin',case when d.payload->>'destination'='FAMILY' then 'family' else 'professional' end,case when d.payload->>'destination'='CARE_TEAM' then 'supervisor' else 'family' end)) then raise exception 'invalid recipient';end if;
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
 perform private.require_cap(d.care_recipient_id,'ent.receive');
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

create function public.stock_overview(p_patient uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare family boolean:=private.can(p_patient,'stock.family.read');team boolean:=private.can(p_patient,'stock.team.read');begin
 if not(family or team) then raise exception 'stock permission required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('productId',c.product_id,'name',c.name,'unit',c.unit,'decimals',c.quantity_decimals,'active',c.is_active,
 'family',case when family then jsonb_build_object('confirmed',private.stock_quantity(p_patient,c.product_id,'FAMILY')::text,
 'incoming',coalesce((select sum(l.quantity-l.accepted_quantity-l.reconciled_quantity) from public.document_lines l join public.operational_documents d on d.id=l.document_id where d.care_recipient_id=p_patient and d.type='ENT' and d.payload->>'destination'='FAMILY' and d.status in ('pending_receipt','disputed','cancellation_pending') and l.product_id=c.product_id),0)::text,
 'purchasePending',coalesce((select sum(l.approved_quantity-l.accepted_quantity) from public.document_lines l join public.operational_documents d on d.id=l.document_id where d.care_recipient_id=p_patient and d.type='COM' and d.status in ('approved','partially_approved','purchasing','purchased','partially_received') and l.product_id=c.product_id),0)::text,
 'minimum',(select low_threshold from public.stock_alert_rules where care_recipient_id=p_patient and product_id=c.product_id and location='FAMILY' and is_enabled)) else null end,
 'team',case when team then jsonb_build_object('confirmed',private.stock_quantity(p_patient,c.product_id,'CARE_TEAM')::text,
 'incoming',coalesce((select sum(l.quantity-l.accepted_quantity-l.reconciled_quantity) from public.document_lines l join public.operational_documents d on d.id=l.document_id where d.care_recipient_id=p_patient and d.type='ENT' and d.payload->>'destination'='CARE_TEAM' and d.status in ('pending_receipt','disputed','cancellation_pending') and l.product_id=c.product_id),0)::text,
 'minimum',(select low_threshold from public.stock_alert_rules where care_recipient_id=p_patient and product_id=c.product_id and location='CARE_TEAM' and is_enabled)) else null end,
 'disputed',coalesce((select sum(l.quantity-l.accepted_quantity-l.reconciled_quantity) from public.document_lines l join public.operational_documents d on d.id=l.document_id where d.care_recipient_id=p_patient and d.type='ENT' and d.status in ('disputed','cancellation_pending') and l.product_id=c.product_id),0)::text) order by c.category,c.sort_order,c.name)
 from public.care_recipient_products c where c.care_recipient_id=p_patient),'[]');
end;$$;
create function public.document_delivery_status(p_document uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents;begin
 select * into d from public.operational_documents where id=p_document;
 if not found or not private.can(d.care_recipient_id,lower(d.type)||'.read') then raise exception 'document permission required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'requisition_id',requisition_id,'recipient_group',recipient_group,'recipient_label',recipient_label,'channel',channel,'state',state,'attempts',attempts,'attempted_at',attempted_at,'error_code',last_error,'seen_at',seen_at)) from public.requisition_notifications where coalesce(document_id,requisition_id)=p_document and (recipient_user_id=auth.uid() or public.can_manage_recipient(d.care_recipient_id))),'[]');
end;$$;
create function public.register_document_pdf(p_document uuid,p_version integer,p_path text,p_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.document_pdfs;begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'server required' using errcode='42501';end if;
 if p_hash is null or p_hash!~'^[a-f0-9]{64}$' or not exists(select 1 from public.document_events where document_id=p_document and version=p_version) or p_path<>p_document||'/'||p_version||'.pdf' then raise exception 'invalid PDF version';end if;
 insert into public.document_pdfs(document_id,version,object_path,sha256) values(p_document,p_version,p_path,p_hash) on conflict(document_id,version) do nothing;
 select * into strict r from public.document_pdfs where document_id=p_document and version=p_version;
 if r.sha256<>p_hash then raise exception 'PDF immutable';end if;return to_jsonb(r);
end;$$;
grant execute on function public.stock_overview(uuid),public.document_delivery_status(uuid) to authenticated;
grant execute on function public.register_document_pdf(uuid,integer,text,text) to service_role;
-- Alert information obeys the same custody privacy as stock balances.
do $$declare p record;begin
 for p in select tablename,policyname from pg_policies where schemaname='public' and tablename in ('stock_alert_rules','stock_alert_events') loop execute format('drop policy %I on public.%I',p.policyname,p.tablename);end loop;
end;$$;
create policy alert_rule_custody_read on public.stock_alert_rules for select to authenticated using(case when location='FAMILY' then private.can(care_recipient_id,'stock.family.read') else private.can(care_recipient_id,'stock.team.read') end);
create policy alert_event_custody_read on public.stock_alert_events for select to authenticated using(case when location='FAMILY' then private.can(care_recipient_id,'stock.family.read') else private.can(care_recipient_id,'stock.team.read') end);

