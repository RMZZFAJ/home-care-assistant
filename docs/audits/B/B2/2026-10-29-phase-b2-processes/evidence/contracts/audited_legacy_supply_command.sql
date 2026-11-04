CREATE OR REPLACE FUNCTION public.audited_legacy_supply_command(p_id uuid, p_action text, p_body jsonb, p_key uuid, p_version integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 if p_key is null or p_version is null or d.version<>p_version then raise exception 'stale document version' using errcode='P0001';end if;
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
 select count(*) into cnt from public.bal_approvals where document_id=p_id and count_version=(d.workflow_data->>'countVersion')::integer;
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
end;$function$
