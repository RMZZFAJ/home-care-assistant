-- Real Auth identities, client role and transactional rollback.
create temporary table supply_test_state(k text primary key,v uuid);
insert into supply_test_state values
 ('global',(select id from public.profiles where global_scope and status='active' order by id limit 1)),
 ('family',(select user_id from public.care_recipient_memberships where role='family' and status='active' order by user_id limit 1)),
 ('professional',(select user_id from public.care_recipient_memberships where role='professional' and status='active' order by user_id limit 1));
insert into public.care_recipients(id,display_name,is_development) values('aa000000-0000-4000-8000-000000000001','Paciente fictício — fornecimento',true);
insert into public.care_recipient_products(care_recipient_id,product_id,name,category,unit,aliases,sort_order)
select 'aa000000-0000-4000-8000-000000000001',id,name,category,unit,aliases,0 from public.products where id='fralda';
insert into public.care_recipient_memberships(care_recipient_id,user_id,role,status)
select 'aa000000-0000-4000-8000-000000000001',v,case k when 'global' then 'admin'::public.profile_role when 'family' then 'family'::public.profile_role else 'professional'::public.profile_role end,'active' from supply_test_state;
grant all on supply_test_state to authenticated;
set local role authenticated;
do $$
declare p uuid:='aa000000-0000-4000-8000-000000000001';g uuid;f uuid;t uuid;req record;c jsonb;d jsonb;b jsonb;k uuid;line_id uuid;
begin
 select v into g from supply_test_state s where s.k='global';
 select v into f from supply_test_state s where s.k='family';
 select v into t from supply_test_state s where s.k='professional';
 perform set_config('request.jwt.claim.sub',t::text,true);
 select * into req from public.submit_requisition(p,gen_random_uuid(),'untrusted','[{"productId":"fralda","currentStock":0,"urgent":true}]','[]','[]');
 if req.protocol not like 'REQ-%' then raise exception 'new protocol missing';end if;
 select id into line_id from public.requisition_items where requisition_id=req.requisition_id;
 begin perform public.submit_requisition(p,gen_random_uuid(),'untrusted','[{"productId":"fralda","currentStock":0,"urgent":true}]','[]','[]');raise exception 'unjustified duplicate accepted';
 exception when raise_exception then if sqlerrm<>'duplicate review required' then raise;end if;end;
 begin perform public.family_stock_movement(p,'fralda',1,'inbound','proibido',gen_random_uuid());raise exception 'professional changed family stock';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',f::text,true);
 c:=public.create_supply_document(p,'COM','{"origin":"purchase","lines":[{"productId":"fralda","quantity":"10"}]}',gen_random_uuid());
 if c->>'status'<>'pending_approval' then raise exception 'family purchase auto-approved';end if;
 perform set_config('request.jwt.claim.sub',g::text,true);
 c:=public.supply_document_command((c->>'id')::uuid,'approve',jsonb_build_object('reason','Quantidade revisada','lines',jsonb_build_array(jsonb_build_object('lineId',c->'lines'->0->>'id','quantity','8'))),gen_random_uuid(),(c->>'version')::integer);
 if c->>'status'<>'partially_approved' then raise exception 'partial purchase approval missing';end if;
 perform set_config('request.jwt.claim.sub',f::text,true);
 c:=public.supply_document_command((c->>'id')::uuid,'purchase',jsonb_build_object('lines',jsonb_build_array(jsonb_build_object('lineId',c->'lines'->0->>'id','quantity','8'))),gen_random_uuid(),(c->>'version')::integer);
 c:=public.supply_document_command((c->>'id')::uuid,'receive',jsonb_build_object('lines',jsonb_build_array(jsonb_build_object('lineId',c->'lines'->0->>'id','quantity','6'))),gen_random_uuid(),(c->>'version')::integer);
 if (select coalesce(sum(balance),0) from public.current_stock_balances where care_recipient_id=p and location='FAMILY')<>0 then raise exception 'unapproved receipt changed official stock';end if;
 perform set_config('request.jwt.claim.sub',g::text,true);
 k:=gen_random_uuid();b:=jsonb_build_object('receiptId',c->'receipts'->0->>'id');
 c:=public.supply_document_command((c->>'id')::uuid,'validate_receipt',b,k,(c->>'version')::integer);
 perform public.supply_document_command((c->>'id')::uuid,'validate_receipt',b,k,1);
 if (select balance from public.current_stock_balances where care_recipient_id=p and location='FAMILY')<>6 then raise exception 'receipt credit/idempotency incorrect';end if;
 perform set_config('request.jwt.claim.sub',f::text,true);
 d:=public.create_supply_document(p,'ENT',jsonb_build_object('source','FAMILY','destination','CARE_TEAM','recipientId',t,'lines',jsonb_build_array(jsonb_build_object('productId','fralda','quantity','5','requisitionItemIds',jsonb_build_array(line_id)))),gen_random_uuid());
 if d->>'status'<>'pending_receipt' or (select balance from public.current_stock_balances where care_recipient_id=p and location='FAMILY')<>1 or (select balance from public.current_stock_balances where care_recipient_id=p and location='TRANSIT')<>5 then raise exception 'dispatch custody incorrect';end if;
 begin perform public.supply_document_command((d->>'id')::uuid,'receive','{}',gen_random_uuid(),(d->>'version')::integer);raise exception 'issuer accepted delivery';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',t::text,true);
 if exists(select 1 from public.operational_documents where type='COM' and care_recipient_id=p) then raise exception 'COM leaked to team';end if;
 if exists(select 1 from public.current_stock_balances where care_recipient_id=p and location='FAMILY') then raise exception 'family balance leaked';end if;
 d:=public.supply_document_command((d->>'id')::uuid,'receive',jsonb_build_object('divergences',jsonb_build_array(jsonb_build_object('lineId',d->'lines'->0->>'id','acceptedQuantity','3','problem','Faltaram duas unidades'))),gen_random_uuid(),(d->>'version')::integer);
 if d->>'status'<>'disputed' or (d->>'fullyCheckedLines')::integer<>0 or (select balance from public.current_stock_balances where care_recipient_id=p and location='CARE_TEAM')<>3 then raise exception 'partial receipt incorrect';end if;
 if (public.requisition_fulfillment(req.requisition_id)->>'fulfilled')::integer<>1 then raise exception 'positive acceptance did not fulfill REQ';end if;
 perform set_config('request.jwt.claim.sub',g::text,true);
 d:=public.supply_document_command((d->>'id')::uuid,'resolve',jsonb_build_object('lineId',d->'lines'->0->>'id','quantity','2','resolution','missing','reason','Falta reconhecida definitivamente'),gen_random_uuid(),(d->>'version')::integer);
 if d->>'status'<>'confirmed' or (d->>'fullyCheckedLines')::integer<>0 then raise exception 'resolution overwrote partial acceptance';end if;
 c:=public.create_supply_document(p,'BAL','{"lines":[{"productId":"fralda","quantity":"2"}]}',gen_random_uuid());
 if c->>'status'<>'approved' or (select balance from public.current_stock_balances where care_recipient_id=p and location='CARE_TEAM')<>2 then raise exception 'optional BAL not applied';end if;
 begin perform public.family_stock_movement(p,'fralda',2,'outbound','Teste saldo insuficiente',gen_random_uuid());raise exception 'family overdraft allowed';exception when check_violation then null;end;
end;$$;
reset role;
select 'supply workflows passed';
