-- Run ONLY against scripts/test-environment.mjs's verified local development PostgreSQL.
-- Requires the synthetic Auth fixtures and all migrations. Every mutation rolls back.
begin;
create temporary table fixture_users as select replace(full_name,'Teste ','') name,id from public.profiles where full_name like 'Teste %';
grant select on fixture_users to authenticated;
create or replace function pg_temp.assert_ok(p_ok boolean,p_message text) returns void language plpgsql as $$begin
  if not coalesce(p_ok,false) then raise exception 'ASSERTION FAILED: %',p_message;end if;
end;$$;
create or replace function pg_temp.must_fail(p_sql text,p_message text) returns void language plpgsql as $$declare caught boolean:=false;begin
  begin execute p_sql;exception when others then caught:=true;end;
  perform pg_temp.assert_ok(caught,p_message);
end;$$;
create or replace function pg_temp.login(p_name text) returns void language plpgsql as $$declare v uuid;begin
  select id into v from fixture_users where name=p_name;
  perform pg_temp.assert_ok(v is not null,'fixture user '||p_name||' exists');
  perform set_config('request.jwt.claim.sub',v::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
end;$$;

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
select pg_temp.login('shared');
select pg_temp.assert_ok(not public.can_access_recipient('20000000-0000-4000-8000-000000000001') and public.can_access_recipient('20000000-0000-4000-8000-000000000002'),'patient revocation preserves other patient access');

select pg_temp.login('global');
select pg_temp.must_fail($q$select public.record_stock_movement('20000000-0000-4000-8000-000000000001','fralda',9999,'outbound','FAMILY',null,'Saída global negada',gen_random_uuid())$q$,'global normal outbound cannot become negative');
select pg_temp.must_fail($q$select public.record_stock_movement('20000000-0000-4000-8000-000000000001','fralda',9999,'outbound','FAMILY','CARE_TEAM','Transferência global negada',gen_random_uuid())$q$,'global transfer cannot become negative');
select pg_temp.must_fail($q$select public.record_stock_movement('20000000-0000-4000-8000-000000000001','fralda',1,'inbound','FAMILY','CARE_TEAM','Formato inválido',gen_random_uuid())$q$,'ambiguous direction invalid');
select public.extraordinary_stock_adjustment('20000000-0000-4000-8000-000000000001','fralda',-20,'FAMILY','Correção extraordinária confirmada',true,'50000000-0000-4000-8000-000000000002');
select pg_temp.assert_ok((select balance=-10 from public.current_stock_balances where care_recipient_id='20000000-0000-4000-8000-000000000001' and product_id='fralda' and location='FAMILY'),'only extraordinary adjustment permits negative');
select pg_temp.must_fail($q$select public.extraordinary_stock_adjustment('20000000-0000-4000-8000-000000000001','fralda',-1,'FAMILY','Sem confirmação',false,gen_random_uuid())$q$,'extraordinary explicit confirmation required');
select public.record_stock_movement('20000000-0000-4000-8000-000000000001','fralda',30,'inbound',null,'FAMILY','Reposição', '50000000-0000-4000-8000-000000000003');
select pg_temp.must_fail($q$select public.record_stock_movement('20000000-0000-4000-8000-000000000001','fralda',31,'inbound',null,'FAMILY','Reposição','50000000-0000-4000-8000-000000000003')$q$,'stock idempotency content conflict');
select pg_temp.login('adminA');
select pg_temp.must_fail($q$select public.extraordinary_stock_adjustment('20000000-0000-4000-8000-000000000001','fralda',-100,'FAMILY','Local proibido',true,gen_random_uuid())$q$,'local admin no extraordinary bypass');

do $$declare i public.stock_inventories;x record;v_count bigint;begin
  i:=public.create_stock_inventory('20000000-0000-4000-8000-000000000001','FAMILY');
  for x in select * from public.stock_inventory_items where inventory_id=i.id loop
    perform public.add_stock_inventory_item(i.id,x.product_id,x.expected_quantity,'Contagem conferida');
  end loop;
  perform public.submit_stock_inventory(i.id);
  perform public.record_stock_movement(i.care_recipient_id,'fralda',1,'inbound',null,'FAMILY','Movimento após referência',gen_random_uuid());
  perform pg_temp.must_fail(format('select public.approve_stock_inventory(%L)',i.id),'movement after reference requires recount');
  i:=public.recount_stock_inventory(i.id);
  for x in select * from public.stock_inventory_items where inventory_id=i.id loop
    perform public.add_stock_inventory_item(i.id,x.product_id,x.expected_quantity+case when x.product_id='fralda' then 1 else 0 end,'Divergência conferida');
  end loop;
  perform public.submit_stock_inventory(i.id);perform public.approve_stock_inventory(i.id);
  select count(*) into v_count from public.stock_movements where reference_type='inventory' and reference_id=i.id;
  perform public.approve_stock_inventory(i.id);
  perform pg_temp.assert_ok(v_count=1 and v_count=(select count(*) from public.stock_movements where reference_type='inventory' and reference_id=i.id),'inventory approval idempotent single adjustment');
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
  perform pg_temp.assert_ok(exists(select 1 from public.requisition_notifications where alert_event_id is not null and state='delivered'),'internal alert delivered persisted');
end;$$;
select public.admin_set_profile((select id from fixture_users where name='global2'),'Teste global2','professional','active',false);
select pg_temp.must_fail($q$select public.admin_set_profile((select id from fixture_users where name='global'),'Teste global','professional','active',false)$q$,'last global admin demotion denied');
select pg_temp.must_fail($q$select public.admin_set_profile((select id from fixture_users where name='global'),'Teste global','admin','revoked',true)$q$,'last global admin revoke denied');
reset role;
select pg_temp.assert_ok((select active_count=1 from public.global_admin_guard),'admin guard count consistent');
select pg_temp.assert_ok((select quantity=3 and care_recipient_id is null and source_location is null and destination_location is null from public.stock_movements where id='40000000-0000-4000-8000-000000000003'),'legacy unknown stock preserved');
select pg_temp.assert_ok((select product_id='fralda' and current_stock=2 and snapshot_source='legacy_reconstructed' from public.requisition_items where id='30000000-0000-4000-8000-000000000002'),'legacy request item preserved');
select 'database transactional regression assertions passed' result;
rollback;
