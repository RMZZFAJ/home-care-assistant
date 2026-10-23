-- Synthetic users, verified local development database only. No provider calls.
begin;
update public.requisitions set status='cancelled' where id='30000000-0000-4000-8000-000000000001';
create temporary table fixture_users as
  select replace(full_name,'Teste ','') name,id from public.profiles where full_name like 'Teste %';
grant select on fixture_users to authenticated;
create or replace function pg_temp.assert_ok(p_ok boolean,p_message text) returns void
language plpgsql as $$begin
  if not coalesce(p_ok,false) then raise exception 'ASSERTION FAILED: %',p_message;end if;
end;$$;
create or replace function pg_temp.must_fail(p_sql text,p_message text) returns void
language plpgsql as $$declare caught boolean:=false;begin
  begin execute p_sql;exception when others then caught:=true;end;
  perform pg_temp.assert_ok(caught,p_message);
end;$$;
create function pg_temp.login(who text) returns void language plpgsql as $$begin perform pg_temp.assume_context(who);end;$$;
create temporary table alert_test_ids(key text primary key,id uuid);
grant execute on function pg_temp.assert_ok(boolean,text),pg_temp.must_fail(text,text),pg_temp.login(text) to authenticated;
grant select,insert on alert_test_ids to authenticated;
-- This suite controls queue order within its transaction and rolls it back.
update public.requisition_notifications set state='cancelled' where state in ('pending','processing');
set local role authenticated;
select pg_temp.login('reader');
select pg_temp.must_fail($q$select public.configure_recipient_notification(
  '20000000-0000-4000-8000-000000000001',(select id from fixture_users where name='family'),
  'family','internal',null,true,true)$q$,'reader cannot opt a family into team alerts');
select pg_temp.login('adminA');
select public.configure_recipient_notification('20000000-0000-4000-8000-000000000001',
  (select id from fixture_users where name='family'),'family','internal',null,true);
select public.configure_recipient_notification('20000000-0000-4000-8000-000000000001',
  (select id from fixture_users where name='professional'),'care_team','internal',null,true);
select public.configure_recipient_notification('20000000-0000-4000-8000-000000000001',
  (select id from fixture_users where name='supervisor'),'supervision','internal',null,true);
select public.configure_recipient_notification('20000000-0000-4000-8000-000000000001',
  (select id from fixture_users where name='adminA'),'other','internal',null,true);
select public.configure_recipient_notification('20000000-0000-4000-8000-000000000001',
  (select id from fixture_users where name='reader'),'other','internal',null,true);

-- The fixture starts with FAMILY 10 and CARE_TEAM 0 for fralda. A low family
-- alert must not send to the team; a team critical alert must not use family
-- stock as coverage or include family without an explicit opt-in.
select public.configure_stock_alert('20000000-0000-4000-8000-000000000001','fralda','FAMILY',15,5,true);
insert into alert_test_ids select 'family',id from public.stock_alert_events
  where care_recipient_id='20000000-0000-4000-8000-000000000001'
    and product_id='fralda' and location='FAMILY' and state='open';
select pg_temp.assert_ok((select severity='low' from public.stock_alert_events
  where id=(select id from alert_test_ids where key='family')),'family low threshold independent');
select pg_temp.assert_ok((select count(*)=2 from public.requisition_notifications
  where alert_event_id=(select id from alert_test_ids where key='family')),'family alert reaches family and configured administrator only');
select pg_temp.assert_ok(not exists(select 1 from public.requisition_notifications
  where alert_event_id=(select id from alert_test_ids where key='family')
    and recipient_user_id in (select id from fixture_users where name in ('professional','supervisor','reader'))),
  'family alerts do not reach unrelated configured groups');
select public.configure_stock_alert('20000000-0000-4000-8000-000000000001','fralda','CARE_TEAM',5,1,true);
insert into alert_test_ids select 'team',id from public.stock_alert_events
  where care_recipient_id='20000000-0000-4000-8000-000000000001'
    and product_id='fralda' and location='CARE_TEAM' and state='open';
select pg_temp.assert_ok((select severity='critical' from public.stock_alert_events
  where id=(select id from alert_test_ids where key='team')),'family balance cannot mask team shortage');
select pg_temp.assert_ok((select count(*)=4 from public.requisition_notifications
  where alert_event_id=(select id from alert_test_ids where key='team')),'team alert reaches team supervision and administrator');
select pg_temp.assert_ok(not exists(select 1 from public.requisition_notifications
  where alert_event_id=(select id from alert_test_ids where key='team')
    and recipient_user_id in (select id from fixture_users where name in ('family','reader'))),
  'family requires explicit team alert opt-in');
select public.configure_stock_alert('20000000-0000-4000-8000-000000000001','fralda','CARE_TEAM',5,1,true);
select pg_temp.assert_ok((select count(*)=1 from public.stock_alert_events
  where care_recipient_id='20000000-0000-4000-8000-000000000001'
    and product_id='fralda' and location='CARE_TEAM' and state='open'),'unchanged condition does not duplicate event');
select pg_temp.assert_ok((select count(*)=4 from public.requisition_notifications
  where alert_event_id=(select id from alert_test_ids where key='team')),'unchanged condition does not duplicate recipients');

reset role;
update public.requisition_notifications set next_attempt_at=now()-interval '1 hour'
  where alert_event_id=(select id from alert_test_ids where key='family');
set local role authenticated;
select pg_temp.login('global');
do $$declare n public.requisition_notifications;w uuid:=gen_random_uuid();begin
  select * into n from public.claim_notification_jobs(1,w,false);
  perform pg_temp.assert_ok(n.alert_event_id=(select id from alert_test_ids where key='team'),
    'newer critical alert is claimed before older low alert');
  perform public.complete_notification_job(n.id,w,'delivered','internal');
end;$$;
select pg_temp.login('adminA');
do $$declare d jsonb;begin
 d:=public.create_supply_document('20000000-0000-4000-8000-000000000001','ENT',jsonb_build_object('source','FAMILY','destination','CARE_TEAM','recipientId',(select id from fixture_users where name='professional'),'lines',jsonb_build_array(jsonb_build_object('productId','fralda','quantity','10'))),gen_random_uuid(),false);
 perform pg_temp.login('professional');
 perform public.supply_document_command((d->>'id')::uuid,'receive','{"divergences":[]}',gen_random_uuid(),(d->>'version')::integer);
 perform pg_temp.login('adminA');
end;$$;
select pg_temp.assert_ok((select state='resolved' and resolved_at is not null
  from public.stock_alert_events where id=(select id from alert_test_ids where key='team')),
  'replenishment resolves team alert');
select public.configure_recipient_notification('20000000-0000-4000-8000-000000000001',
  (select id from fixture_users where name='family'),'family','internal',null,true,true);
do $$declare v uuid;begin
 v:=public.report_extraordinary_consumption('20000000-0000-4000-8000-000000000001','consumption','CARE_TEAM','Consumo fictício após reposição','[{"productId":"fralda","quantity":"10"}]',gen_random_uuid());
 perform public.confirm_extraordinary_consumption(v,true);
end;$$;
insert into alert_test_ids select 'teamOptIn',id from public.stock_alert_events
  where care_recipient_id='20000000-0000-4000-8000-000000000001'
    and product_id='fralda' and location='CARE_TEAM' and state='open';
select pg_temp.assert_ok((select count(*)=5 from public.requisition_notifications
  where alert_event_id=(select id from alert_test_ids where key='teamOptIn')),
  'explicit family opt-in adds one recipient to next team event');
select pg_temp.assert_ok(exists(select 1 from public.requisition_notifications
  where alert_event_id=(select id from alert_test_ids where key='teamOptIn')
    and recipient_user_id=(select id from fixture_users where name='family')),'family opt-in respected');
select pg_temp.login('global');
select public.claim_notification_jobs(1,gen_random_uuid(),false);
select pg_temp.login('adminA');
select pg_temp.assert_ok(not exists(select 1 from public.requisition_notifications
  where alert_event_id=(select id from alert_test_ids where key='team') and state='pending'),
  'unclaimed resolved warnings are cancelled before send');
select pg_temp.assert_ok((select count(*)=1 from public.requisition_notifications
  where alert_event_id=(select id from alert_test_ids where key='team') and state='delivered'),
  'resolved event preserves prior delivery evidence');

-- The new routing must not reduce configured recipients for requisitions.
select pg_temp.login('professional');
insert into alert_test_ids select 'request',requisition_id from public.submit_requisition(
  '20000000-0000-4000-8000-000000000001',gen_random_uuid(),'ignored',
  '[{"productId":"fralda","currentStock":0,"urgent":false}]','[]','[]');
select pg_temp.login('adminA');
select pg_temp.assert_ok((select count(distinct recipient_user_id)>=5 from public.requisition_notifications
  where coalesce(document_id,requisition_id)=(select id from alert_test_ids where key='request')),
  'ordinary requisition retains all configured recipients');
select 'custody alert routing priority and replenishment assertions passed' result;
rollback;
