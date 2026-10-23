-- Run ONLY against scripts/test-environment.mjs's verified local development PostgreSQL.
-- Requires the synthetic Auth fixtures and all migrations. Every mutation rolls back.
begin;
update public.requisitions set status='cancelled' where id='30000000-0000-4000-8000-000000000001';
create temporary table fixture_users as select replace(full_name,'Teste ','') name,id from public.profiles where full_name like 'Teste %';
grant select on fixture_users to authenticated;
create or replace function pg_temp.assert_ok(p_ok boolean,p_message text) returns void language plpgsql as $$begin
  if not coalesce(p_ok,false) then raise exception 'ASSERTION FAILED: %',p_message;end if;
end;$$;
create or replace function pg_temp.must_fail(p_sql text,p_message text) returns void language plpgsql as $$declare caught boolean:=false;begin
  begin execute p_sql;exception when others then caught:=true;end;
  perform pg_temp.assert_ok(caught,p_message);
end;$$;
create function pg_temp.login(who text) returns void language plpgsql as $$begin perform pg_temp.assume_context(who);end;$$;

grant execute on function pg_temp.assert_ok(boolean,text),pg_temp.must_fail(text,text),pg_temp.login(text) to authenticated;

-- Ignored inserts and no-op upserts must not inflate the administrator guard.
select pg_temp.assert_ok((select active_count from public.global_admin_guard where singleton)=
  (select count(*) from public.profiles where status='active' and role='admin' and global_scope),
  'global administrator guard starts consistent');
insert into public.profiles(id,full_name,role,status,global_scope)
select id,full_name,role,status,global_scope from public.profiles
where status='active' and role='admin' and global_scope on conflict(id) do nothing;
insert into public.profiles(id,full_name,role,status,global_scope)
select id,full_name,role,status,global_scope from public.profiles
where status='active' and role='admin' and global_scope
on conflict(id) do update set full_name=excluded.full_name;
select pg_temp.assert_ok((select active_count from public.global_admin_guard where singleton)=
  (select count(*) from public.profiles where status='active' and role='admin' and global_scope),
  'ignored inserts and no-op upserts preserve the exact guard count');

select pg_temp.assert_ok(not has_table_privilege('anon','public.current_stock_balances','SELECT'),'anon cannot read balances');
select pg_temp.assert_ok(not has_table_privilege('authenticated','public.requisitions','INSERT'),'direct requisition insert denied');
select pg_temp.assert_ok(not has_table_privilege('authenticated','public.audit_events','INSERT'),'audit spoof denied');
select pg_temp.assert_ok(not has_table_privilege('authenticated','public.profiles','UPDATE'),'global identity write denied');
select pg_temp.assert_ok(not has_function_privilege('anon','public.submit_requisition(uuid,uuid,text,jsonb,jsonb,jsonb)','EXECUTE'),'anonymous RPC denied');
select pg_temp.assert_ok(not has_function_privilege('authenticated','public.notification_webhook(text,text,uuid)','EXECUTE'),'webhook service only');
select pg_temp.assert_ok((select reloptions @> array['security_invoker=true'] from pg_class where oid='public.current_stock_balances'::regclass),'balance view invoker security');
select pg_temp.assert_ok(not exists(select 1 from information_schema.columns where table_schema='public' and table_name='requisition_items' and column_name='requested_quantity'),'requested quantity absent');
select pg_temp.assert_ok(not exists(select 1 from public.requisition_items i join public.requisitions r on r.id=i.requisition_id where i.care_recipient_id<>r.care_recipient_id),'parent scope preserved');
select pg_temp.assert_ok(not exists(select 1 from public.requisition_items i left join public.care_recipient_products c using(care_recipient_id,product_id) where i.product_id is not null and c.product_id is null),'catalogue relationships preserved');

set local role authenticated;
select pg_temp.login('adminA');
select pg_temp.assert_ok(public.recipient_role('20000000-0000-4000-8000-000000000001')='admin','local role independent of global profile');
select pg_temp.assert_ok(not public.can_access_recipient('20000000-0000-4000-8000-000000000002'),'A cannot access B');
select pg_temp.assert_ok(not exists(select 1 from public.current_stock_balances where care_recipient_id='20000000-0000-4000-8000-000000000002'),'balance view cannot leak B');
select pg_temp.must_fail($q$select public.admin_set_profile((select id from fixture_users where name='adminA'),'Teste adminA','admin','active',true)$q$,'local admin cannot grant global role');
select pg_temp.must_fail($q$select public.admin_upsert_membership('20000000-0000-4000-8000-000000000002',(select id from fixture_users where name='adminA'),'admin',true,true)$q$,'local admin cannot grant on B');
select pg_temp.must_fail($q$insert into public.audit_events(actor_id,action,entity_type) values(auth.uid(),'spoof','test')$q$,'direct audit insert blocked');
select public.admin_upsert_recipient_product('20000000-0000-4000-8000-000000000001','fralda','Fralda somente A','higiene','unidade',array['Pañal exclusivo A'],true);
select pg_temp.assert_ok((select name='Fralda somente A' from public.care_recipient_products where care_recipient_id='20000000-0000-4000-8000-000000000001' and product_id='fralda'),'patient overrides persisted');
select pg_temp.must_fail($q$select public.admin_upsert_recipient_product('20000000-0000-4000-8000-000000000001','fralda','Fralda somente A','higiene','pacote','{}',true)$q$,'unit with history immutable');
select public.admin_upsert_recipient_product('20000000-0000-4000-8000-000000000001',null,'Exclusivo do paciente A','higiene','unidade','{}',true);
select pg_temp.login('adminB');
select pg_temp.assert_ok((select name='Fralda' from public.care_recipient_products where care_recipient_id='20000000-0000-4000-8000-000000000002' and product_id='fralda'),'B catalogue unchanged');
select pg_temp.assert_ok(not exists(select 1 from public.products where owner_care_recipient_id='20000000-0000-4000-8000-000000000001'),'exclusive A identity hidden from B');
reset role;
select pg_temp.must_fail($q$insert into public.care_recipient_products(care_recipient_id,product_id,name,category,unit) select '20000000-0000-4000-8000-000000000002',id,'Cross patient','higiene','unidade' from public.products where owner_care_recipient_id='20000000-0000-4000-8000-000000000001'$q$,'exclusive ownership enforced even via privileged writes');
set local role authenticated;
select pg_temp.login('professional');
do $$declare a record;b record;v_id uuid;begin
  select * into a from public.submit_requisition('20000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','caller hash ignored','[{"productId":"fralda","productName":"forged","currentStock":2,"urgent":false}]','[]','["Teste transacional"]');
  select * into b from public.submit_requisition('20000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','different caller hash','[{"productId":"fralda","productName":"different forged","currentStock":2,"urgent":false}]','[]','["Teste transacional"]');
  perform pg_temp.assert_ok(a.requisition_id=b.requisition_id,'database canonical retry returns same request');
  perform pg_temp.assert_ok((select product_name_snapshot='Fralda somente A' and snapshot_source='persisted' from public.requisition_items where requisition_id=a.requisition_id),'snapshot canonical patient attrs');
  perform pg_temp.must_fail($q$select public.submit_requisition('20000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','x','[{"productId":"fralda","currentStock":3,"urgent":false}]','[]','["Teste transacional"]')$q$,'changed request conflicts');
end;$$;
select pg_temp.login('shared');
select pg_temp.assert_ok(public.recipient_can('20000000-0000-4000-8000-000000000001','submit') and not public.recipient_can('20000000-0000-4000-8000-000000000002','submit'),'same identity has different patient powers');
select pg_temp.login('reader');
select pg_temp.must_fail($q$select public.submit_requisition('20000000-0000-4000-8000-000000000001',gen_random_uuid(),'x','[{"productId":"fralda","currentStock":0,"urgent":false}]','[]','[]')$q$,'reader cannot submit');
select pg_temp.must_fail($q$select public.create_stock_inventory('20000000-0000-4000-8000-000000000001','FAMILY')$q$,'reader cannot count');
select pg_temp.login('revoked');
select pg_temp.assert_ok(not public.can_access_recipient('20000000-0000-4000-8000-000000000001'),'globally revoked user denied');
select pg_temp.must_fail($q$select public.create_stock_inventory('20000000-0000-4000-8000-000000000001','FAMILY')$q$,'revoked user inventory denied');
select pg_temp.must_fail($q$select public.transition_requisition_status('30000000-0000-4000-8000-000000000001','under_review','Tentativa')$q$,'revoked user status denied');
select pg_temp.login('unlinked');
select pg_temp.assert_ok(not exists(select 1 from public.current_stock_balances),'unlinked profile sees no balances');
select pg_temp.login('adminA');
select public.admin_set_membership_status('20000000-0000-4000-8000-000000000001',(select id from fixture_users where name='shared'),'revoked');
select pg_temp.assume_context('shared','20000000-0000-4000-8000-000000000002');
select pg_temp.assert_ok(not public.can_access_recipient('20000000-0000-4000-8000-000000000001') and public.can_access_recipient('20000000-0000-4000-8000-000000000002'),'patient revocation preserves other patient access');

select pg_temp.login('global');
select pg_temp.must_fail($q$select public.record_stock_movement('20000000-0000-4000-8000-000000000001','fralda',9999,'outbound','FAMILY',null,'Saída global negada',gen_random_uuid())$q$,'global normal outbound cannot become negative');
select pg_temp.must_fail($q$select public.record_stock_movement('20000000-0000-4000-8000-000000000001','fralda',9999,'outbound','FAMILY','CARE_TEAM','Transferência global negada',gen_random_uuid())$q$,'global transfer cannot become negative');
select pg_temp.must_fail($q$select public.record_stock_movement('20000000-0000-4000-8000-000000000001','fralda',1,'inbound','FAMILY','CARE_TEAM','Formato inválido',gen_random_uuid())$q$,'ambiguous direction invalid');
select pg_temp.must_fail($q$select public.family_stock_movement('20000000-0000-4000-8000-000000000001','fralda',20,'outbound','Saldo insuficiente',gen_random_uuid())$q$,'even global family movement cannot create negative stock');
select pg_temp.login('adminA');
select pg_temp.must_fail($q$select public.family_stock_movement('20000000-0000-4000-8000-000000000001','fralda',20,'outbound','Saldo insuficiente local',gen_random_uuid())$q$,'local withdrawal cannot exceed confirmed family balance');
select pg_temp.assert_ok((select balance=10 from public.current_stock_balances where care_recipient_id='20000000-0000-4000-8000-000000000001' and product_id='fralda' and location='FAMILY'),'failed movement preserves original stock');
select pg_temp.must_fail($q$select public.extraordinary_stock_adjustment('20000000-0000-4000-8000-000000000001','fralda',-1,'FAMILY','Sem confirmação',false,gen_random_uuid())$q$,'extraordinary explicit confirmation required');
select public.family_stock_movement('20000000-0000-4000-8000-000000000001','fralda',30,'inbound','Reposição', '50000000-0000-4000-8000-000000000003');
select pg_temp.must_fail($q$select public.family_stock_movement('20000000-0000-4000-8000-000000000001','fralda',31,'inbound','Reposição','50000000-0000-4000-8000-000000000003')$q$,'stock idempotency content conflict');
select pg_temp.login('adminA');
select pg_temp.must_fail($q$select public.extraordinary_stock_adjustment('20000000-0000-4000-8000-000000000001','fralda',-100,'FAMILY','Local proibido',true,gen_random_uuid())$q$,'local admin no extraordinary bypass');

do $$declare b jsonb;c jsonb;payload jsonb;k uuid:=gen_random_uuid();v_count bigint;begin
 select jsonb_build_object('lines',jsonb_agg(jsonb_build_object('productId',product_id,'quantity','0'))) into payload from public.care_recipient_products where care_recipient_id='20000000-0000-4000-8000-000000000001' and is_active;
 b:=public.create_supply_document('20000000-0000-4000-8000-000000000001','BAL',payload,gen_random_uuid(),true);
 c:=public.create_supply_document('20000000-0000-4000-8000-000000000001','ENT',jsonb_build_object('source','FAMILY','destination','CARE_TEAM','recipientId',(select id from fixture_users where name='professional'),'lines',jsonb_build_array(jsonb_build_object('productId','fralda','quantity','1'))),gen_random_uuid(),false);
 perform pg_temp.must_fail(format('select public.supply_document_command(%L,''submit'',''{}'',gen_random_uuid(),%s)',b->>'id',b->>'version'),'movement after reference requires recount');
 select jsonb_build_object('lines',jsonb_agg(jsonb_build_object('productId',product_id,'quantity',case when product_id='fralda' then '1' else '0' end))) into payload from public.care_recipient_products where care_recipient_id='20000000-0000-4000-8000-000000000001' and is_active;
 b:=public.revise_supply_document((b->>'id')::uuid,payload,gen_random_uuid(),(b->>'version')::integer,true);
 b:=public.supply_document_command((b->>'id')::uuid,'submit','{}',k,(b->>'version')::integer);
 select count(*) into v_count from public.stock_movements where reference_type='bal' and reference_id=(b->>'id')::uuid;
 perform public.supply_document_command((b->>'id')::uuid,'submit','{}',k,1);
 perform pg_temp.assert_ok(v_count=1 and v_count=(select count(*) from public.stock_movements where reference_type='bal' and reference_id=(b->>'id')::uuid),'BAL application is idempotent single adjustment');
end;$$;

select public.configure_recipient_notification('20000000-0000-4000-8000-000000000001',(select id from fixture_users where name='professional'),'care_team','internal',null,true);
select public.configure_recipient_notification('20000000-0000-4000-8000-000000000001',(select id from fixture_users where name='family'),'family','internal',null,true);
select public.configure_stock_alert('20000000-0000-4000-8000-000000000001','fralda','FAMILY',100,5,true);
select pg_temp.assert_ok((select count(*)=1 from public.stock_alert_events where care_recipient_id='20000000-0000-4000-8000-000000000001' and product_id='fralda' and state='open'),'low alert opened once');
select public.configure_stock_alert('20000000-0000-4000-8000-000000000001','fralda','FAMILY',100,5,true);
select pg_temp.assert_ok((select count(*)=1 from public.stock_alert_events where care_recipient_id='20000000-0000-4000-8000-000000000001' and product_id='fralda' and state='open'),'alert deduplicated');
select pg_temp.login('global');
do $$declare n public.requisition_notifications;v_worker uuid:=gen_random_uuid();begin
  for n in select * from public.claim_notification_jobs(100,v_worker) loop
    perform pg_temp.must_fail(format('select public.complete_notification_job(%L,%L,''delivered'')',n.id,gen_random_uuid()),'other worker cannot complete lease');
    perform public.complete_notification_job(n.id,v_worker,'delivered','internal');
  end loop;
  perform pg_temp.login('adminA');
  perform pg_temp.assert_ok(exists(select 1 from public.requisition_notifications where alert_event_id is not null and state='delivered'),'internal alert delivered persisted');
end;$$;
select pg_temp.login('global');
select public.admin_set_profile((select id from fixture_users where name='global2'),'Teste global2','professional','active',false);
select pg_temp.must_fail($q$select public.admin_set_profile((select id from fixture_users where name='global'),'Teste global','professional','active',false)$q$,'last global admin demotion denied');
select pg_temp.must_fail($q$select public.admin_set_profile((select id from fixture_users where name='global'),'Teste global','admin','revoked',true)$q$,'last global admin revoke denied');
reset role;
select pg_temp.assert_ok((select active_count=1 from public.global_admin_guard),'admin guard count consistent');
select pg_temp.assert_ok((select quantity=3 and care_recipient_id is null and source_location is null and destination_location is null from public.stock_movements where id='40000000-0000-4000-8000-000000000003'),'legacy unknown stock preserved');
select pg_temp.assert_ok((select product_id='fralda' and current_stock=2 and snapshot_source='legacy_reconstructed' from public.requisition_items where id='30000000-0000-4000-8000-000000000002'),'legacy request item preserved');
select 'database transactional regression assertions passed' result;
rollback;
