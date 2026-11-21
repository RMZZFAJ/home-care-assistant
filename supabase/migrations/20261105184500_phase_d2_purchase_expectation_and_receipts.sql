-- P14: waive only an unacquired expectation, never physical material.
insert into public.capability_definitions(code,default_roles,critical)
 values('com.close_expectation',array['admin']::text[],true);
alter table public.document_lines add column waived_quantity numeric(18,6) not null default 0
 check(waived_quantity>=0 and (waived_quantity=0 or purchased_quantity+waived_quantity<=approved_quantity));
alter table public.purchase_receipts add column submission_key uuid,
 add column submitted_name text,add column validated_name text;
alter table public.purchase_receipts alter column created_at set default clock_timestamp();
create unique index purchase_receipts_submission_intent on public.purchase_receipts(document_id,submitted_by,submission_key) where submission_key is not null;

create function private.purchase_receipt_identity()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  new.submitted_name:=(select full_name from public.profiles where id=new.submitted_by);
 elsif new.state is distinct from old.state and new.state in ('approved','rejected') then
  new.validated_name:=(select full_name from public.profiles where id=new.validated_by);
 end if;
 return new;
end;$$;
create trigger purchase_receipt_identity before insert or update on public.purchase_receipts
 for each row execute function private.purchase_receipt_identity();

create function private.purchase_progress(p_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 with line_facts as (
  select l.*,coalesce((select sum((x->>'quantity')::numeric) from public.purchase_receipts r
   cross join lateral jsonb_array_elements(r.lines) x where r.document_id=p_id and r.state='pending' and x->>'lineId'=l.id::text),0) pending
  from public.document_lines l where l.document_id=p_id
 ), facts as (
  select coalesce(bool_or(approved_quantity>purchased_quantity+waived_quantity),false) expectation_pending,
   coalesce(bool_or(purchased_quantity>accepted_quantity),false) physical_pending,
   coalesce(bool_or(pending>0),false) validation_pending,
   coalesce(jsonb_agg(jsonb_build_object('lineId',id,'name',name_snapshot,'unit',unit_snapshot,'plannedQuantity',quantity,
    'approvedQuantity',approved_quantity,'purchasedQuantity',purchased_quantity,'validatedQuantity',accepted_quantity,
    'pendingValidationQuantity',pending,'unarrivedQuantity',greatest(purchased_quantity-accepted_quantity-pending,0),
    'waivedQuantity',waived_quantity,'waivableQuantity',greatest(approved_quantity-purchased_quantity-waived_quantity,0),
    'remainingExpectation',greatest(approved_quantity-purchased_quantity-waived_quantity,0)) order by category_snapshot,name_snapshot,id),'[]') lines
  from line_facts
 ) select jsonb_build_object('expectationClosed',d.workflow_data ? 'purchaseExpectationClosure',
  'expectationPending',f.expectation_pending,'physicalPending',f.physical_pending,'validationPending',f.validation_pending,
  'state',case when d.status in ('draft','pending_approval','rejected','cancelled') then d.status
   when d.workflow_data ? 'purchaseExpectationClosure' and f.validation_pending then 'closed_pending_validation'
   when d.workflow_data ? 'purchaseExpectationClosure' and f.physical_pending then 'closed_pending_arrival'
   when d.workflow_data ? 'purchaseExpectationClosure' and not f.expectation_pending then 'closed_below_quantity'
   when f.validation_pending then 'pending_validation' else d.status end,
  'closure',d.workflow_data->'purchaseExpectationClosure','lines',f.lines)
 from public.operational_documents d cross join facts f where d.id=p_id and d.type='COM';
$$;

create function private.refresh_purchase_progress(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare progress jsonb;begin
 progress:=private.purchase_progress(p_id);
 if progress is null then raise exception 'purchase not found';end if;
 update public.document_lines set fully_checked=accepted_quantity=purchased_quantity and accepted_quantity+waived_quantity=approved_quantity where document_id=p_id;
 update public.operational_documents set status=case
  when (progress->>'validationPending')::boolean then 'partially_received'
  when not (progress->>'expectationPending')::boolean and not (progress->>'physicalPending')::boolean then 'received'
  when exists(select 1 from public.document_lines where document_id=p_id and accepted_quantity>0) then 'partially_received'
  when not (progress->>'expectationPending')::boolean then 'purchased'
  when exists(select 1 from public.document_lines where document_id=p_id and purchased_quantity>0) then 'purchasing'
  when exists(select 1 from public.document_lines where document_id=p_id and approved_quantity<quantity) then 'partially_approved'
  else 'approved' end where id=p_id;
end;$$;

create or replace function private.credit_purchase_receipt(p_receipt uuid)
returns void language plpgsql security definer set search_path='' as $$
declare r public.purchase_receipts;d public.operational_documents;x jsonb;l public.document_lines;q numeric;precision_limit integer;begin
 select * into strict r from public.purchase_receipts where id=p_receipt for update;
 if r.state='approved' then return;end if;
 if r.state<>'pending' then raise exception 'receipt not pending';end if;
 select * into strict d from public.operational_documents where id=r.document_id;
 for x in select value from jsonb_array_elements(r.lines) loop
  select * into strict l from public.document_lines where id=(x->>'lineId')::uuid and document_id=d.id;
  select quantity_decimals into strict precision_limit from public.care_recipient_products where care_recipient_id=d.care_recipient_id and product_id=l.product_id;
  q:=(x->>'quantity')::numeric;
  if q is null or q<=0 or q>1000000000 or q<>round(q,precision_limit) or l.accepted_quantity+q>l.purchased_quantity then raise exception 'invalid receipt quantity';end if;
  perform private.move_stock(d.care_recipient_id,l.product_id,q,null,'FAMILY','Recebimento COM validado','purchase_receipt',r.id);
  update public.document_lines set accepted_quantity=accepted_quantity+q where id=l.id;
 end loop;
 update public.purchase_receipts set state='approved',validated_by=auth.uid(),validated_at=clock_timestamp() where id=r.id;
 perform private.refresh_purchase_progress(d.id);
end;$$;

create function private.close_purchase_expectation(p_id uuid,p_body jsonb,p_key uuid,p_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;e public.document_events;summary jsonb;closure jsonb;begin
 select * into d from public.operational_documents where id=p_id and type='COM';
 if not found then raise exception 'purchase not found';end if;
 perform private.require_cap(d.care_recipient_id,'com.read');
 perform pg_advisory_xact_lock(hashtextextended('stock:'||d.care_recipient_id::text,0));
 select * into strict d from public.operational_documents where id=p_id for update;
 perform private.require_cap(d.care_recipient_id,'com.read');
 select * into e from public.document_events where actor_id=auth.uid() and idempotency_key=p_key;
 if found then
  if e.document_id is distinct from p_id or e.action is distinct from 'com.close_expectation' or e.body->'event' is distinct from p_body then raise exception 'idempotency conflict' using errcode='23505';end if;
  return public.operational_document(p_id);
 end if;
 perform private.require_cap(d.care_recipient_id,'com.close_expectation');
 if p_key is null or p_version is null or d.version<>p_version then raise exception 'stale document version' using errcode='P0001';end if;
 if d.status not in ('approved','partially_approved','purchasing','purchased','partially_received') then raise exception 'invalid purchase closure state';end if;
 if jsonb_typeof(p_body) is distinct from 'object' or p_body->'confirmed' is distinct from 'true'::jsonb
  or length(btrim(coalesce(p_body->>'reason',''))) not between 3 and 1000
  or exists(select 1 from jsonb_object_keys(p_body) k where k not in ('confirmed','reason')) then raise exception 'explicit purchase closure confirmation required' using errcode='22023';end if;
 summary:=private.purchase_progress(p_id);
 if not (summary->>'expectationPending')::boolean or d.workflow_data ? 'purchaseExpectationClosure' then raise exception 'no purchase expectation remaining' using errcode='22023';end if;
 closure:=jsonb_build_object('actorId',auth.uid(),'actorName',(select full_name from public.profiles where id=auth.uid()),'recordedAt',clock_timestamp(),
  'referenceVersion',p_version,'reason',btrim(p_body->>'reason'),'lines',summary->'lines');
 update public.document_lines set waived_quantity=approved_quantity-purchased_quantity where document_id=p_id and approved_quantity>purchased_quantity+waived_quantity;
 update public.operational_documents set version=version+1,workflow_data=workflow_data||jsonb_build_object('purchaseExpectationClosure',closure) where id=p_id;
 perform private.refresh_purchase_progress(p_id);
 perform private.record_document_event(p_id,'com.close_expectation',p_body,p_key);
 perform private.require_cap(d.care_recipient_id,'com.close_expectation');
 return public.operational_document(p_id);
end;$$;

do $migration$
declare definition text;anchor text;replacement text;
begin
 definition:=pg_get_functiondef('public.supply_document_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
 anchor:='select * into v_d from public.operational_documents where id=p_id;';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'purchase command wrapper anchor mismatch';end if;
 execute replace(definition,anchor,anchor||E'\n if v_d.type=''COM'' and p_action=''close_expectation'' then return private.close_purchase_expectation(p_id,p_body,p_key,p_version);end if;');

 definition:=pg_get_functiondef('public.audited_legacy_supply_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
 anchor:='insert into public.purchase_receipts(document_id,submitted_by,state,lines) values(p_id,auth.uid(),''pending'',p_body->''lines'') returning id into r_id;';
 replacement:='insert into public.purchase_receipts(document_id,submitted_by,state,lines,submission_key) values(p_id,auth.uid(),''pending'',p_body->''lines'',p_key) returning id into r_id;';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'purchase receipt intent anchor mismatch';end if;
 definition:=replace(definition,anchor,replacement);
 anchor:='l.purchased_quantity+q>l.approved_quantity';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'purchase remaining limit anchor mismatch';end if;
 definition:=replace(definition,anchor,'l.purchased_quantity+q>l.approved_quantity-l.waived_quantity');
 anchor:='if public.recipient_role(d.care_recipient_id)=''admin'' then perform private.credit_purchase_receipt(r_id);end if;';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'purchase pending progress anchor mismatch';end if;
 definition:=replace(definition,anchor,'if public.recipient_role(d.care_recipient_id)=''admin'' then perform private.credit_purchase_receipt(r_id);else perform private.refresh_purchase_progress(p_id);end if;');
 anchor:='update public.purchase_receipts set state=''rejected'',reason=p_body->>''reason'',validated_by=auth.uid(),validated_at=now() where id=r_id;';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'purchase rejection progress anchor mismatch';end if;
 definition:=replace(definition,anchor,'update public.purchase_receipts set state=''rejected'',reason=p_body->>''reason'',validated_by=auth.uid(),validated_at=clock_timestamp() where id=r_id;perform private.refresh_purchase_progress(p_id);');
 anchor:='perform private.validate_supply_command(d,p_action,p_body);';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'purchase cancellation preservation anchor mismatch';end if;
 definition:=replace(definition,anchor,anchor||E'\n if d.type=''COM'' and p_action=''cancel'' and (d.workflow_data ? ''purchaseExpectationClosure'' or exists(select 1 from public.document_lines where document_id=p_id and purchased_quantity>0) or exists(select 1 from public.purchase_receipts where document_id=p_id)) then raise exception ''purchase has acquisition or receipt facts'' using errcode=''23514'';end if;');
 execute definition;

 definition:=pg_get_functiondef('private.validate_supply_command(public.operational_documents,text,jsonb)'::regprocedure);
 anchor:='if p_action=''validate_receipt'' or p_action=''reject_receipt'' then if p_body->>''receiptId'' is null then raise exception ''receipt required'';end if;end if;';
 replacement:='if d.type=''COM'' and p_action in (''validate_receipt'',''reject_receipt'') then
 if p_body->>''receiptId'' is null or exists(select 1 from jsonb_object_keys(p_body) k where k not in (''receiptId'',''reason''))
 or p_action=''validate_receipt'' and p_body ? ''reason''
 or p_action=''reject_receipt'' and length(btrim(coalesce(p_body->>''reason'',''''))) not between 3 and 1000 then raise exception ''invalid receipt decision'' using errcode=''22023'';end if;end if;';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'purchase decision body anchor mismatch';end if;
 execute replace(definition,anchor,replacement);

 definition:=pg_get_functiondef('public.operational_document(uuid)'::regprocedure);
 anchor:='return to_jsonb(d)||jsonb_build_object(';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'purchase read model anchor mismatch';end if;
 execute replace(definition,anchor,'return to_jsonb(d)||case when d.type=''COM'' then jsonb_build_object(''purchaseProgress'',private.purchase_progress(p_id)) else ''{}''::jsonb end||jsonb_build_object(');

 definition:=pg_get_functiondef('private.science_snapshot()'::regprocedure);
 anchor:='new.content_hash:=encode(extensions.digest(new.body::text,''sha256''),''hex'');';
 replacement:='if d.type=''COM'' then
 new.body:=new.body||jsonb_build_object(''purchaseProgress'',private.purchase_progress(d.id),''purchaseReceipts'',coalesce((select jsonb_agg(to_jsonb(r) order by created_at,id) from public.purchase_receipts r where r.document_id=d.id),''[]''::jsonb));
 if new.action=''com.receive'' then
 new.body:=new.body||(select jsonb_build_object(''receiptId'',r.id,''purchaseReceipt'',to_jsonb(r)) from public.purchase_receipts r where r.document_id=d.id and r.submitted_by=new.actor_id and r.submission_key=new.idempotency_key);
 elsif new.action in (''com.validate_receipt'',''com.reject_receipt'') then
 new.body:=new.body||(select jsonb_build_object(''receiptId'',r.id,''purchaseReceipt'',to_jsonb(r)) from public.purchase_receipts r where r.document_id=d.id and r.id=(new.body->''event''->>''receiptId'')::uuid);
 end if;
 end if;
 '||anchor;
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'purchase snapshot anchor mismatch';end if;
 execute replace(definition,anchor,replacement);
end;$migration$;

revoke all on function private.purchase_receipt_identity(),private.purchase_progress(uuid),private.refresh_purchase_progress(uuid),private.credit_purchase_receipt(uuid),private.close_purchase_expectation(uuid,jsonb,uuid,integer) from public,anon,authenticated,service_role;
