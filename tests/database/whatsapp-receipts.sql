-- Provider transport is mocked; identities and confirmed phone state come from local Auth.
begin;
-- Isolate this transactional queue fixture from unrelated local browser records.
update public.requisition_notifications set state='cancelled' where state in ('pending','processing');
create temporary table wa_actors as select replace(full_name,'Teste ','') name,id from public.profiles where full_name in ('Teste adminA','Teste adminB','Teste professional');
create temporary table wa_state(key text primary key,value text);
grant all on wa_state to authenticated,service_role;grant select on wa_actors to authenticated,service_role;
create function pg_temp.wa_assert(ok boolean,message text) returns void language plpgsql as $$begin if not coalesce(ok,false) then raise exception 'ASSERTION: %',message;end if;end;$$;
create function pg_temp.wa_login(who text) returns void language plpgsql as $$begin perform pg_temp.assume_context(who,'ad000000-0000-4000-8000-000000000001');end;$$;
grant execute on function pg_temp.wa_assert(boolean,text),pg_temp.wa_login(text) to authenticated,service_role;
insert into public.care_recipients(id,display_name,is_development) values('ad000000-0000-4000-8000-000000000001','Aceite WhatsApp fictício',true);
insert into public.care_recipient_products(care_recipient_id,product_id,name,category,unit,aliases,sort_order) select 'ad000000-0000-4000-8000-000000000001',id,name,category,unit,aliases,0 from public.products where id='fralda';
insert into public.care_recipient_memberships(care_recipient_id,user_id,role)select 'ad000000-0000-4000-8000-000000000001',id,case when name like 'admin%' then 'admin'::public.profile_role else 'professional'::public.profile_role end from wa_actors;
update public.patient_settings set settings=settings||'{"whatsappSimpleAcceptance":true}' where care_recipient_id='ad000000-0000-4000-8000-000000000001';
insert into public.recipient_notification_settings(care_recipient_id,recipient_user_id,recipient_group,channel,destination,is_enabled)values('ad000000-0000-4000-8000-000000000001',(select id from wa_actors where name='professional'),'care_team','whatsapp','+15555550101',true);
update public.profiles set notification_preferences=notification_preferences||'{"whatsapp":true}'::jsonb where id=(select id from wa_actors where name='professional');
set local role authenticated;
do $$declare p uuid:='ad000000-0000-4000-8000-000000000001';d jsonb;e jsonb;begin
 perform pg_temp.wa_login('professional');perform public.register_verified_phone();
 perform pg_temp.wa_login('adminA');perform public.family_stock_movement(p,'fralda',20,'inbound','Estoque para aceite com telefone confirmado',gen_random_uuid());
 d:=public.create_supply_document(p,'ENT',jsonb_build_object('source','FAMILY','destination','CARE_TEAM','recipientId',(select id from wa_actors where name='professional'),'lines',jsonb_build_array(jsonb_build_object('productId','fralda','quantity','2'))),gen_random_uuid(),false);
 e:=public.create_supply_document(p,'ENT',jsonb_build_object('source','FAMILY','destination','CARE_TEAM','recipientId',(select id from wa_actors where name='professional'),'lines',jsonb_build_array(jsonb_build_object('productId','fralda','quantity','2'))),gen_random_uuid(),false);
 insert into wa_state values('first',d->>'id'),('second',e->>'id'),('worker',gen_random_uuid()::text);
end;$$;
reset role;
set local role service_role;set local request.jwt.claim.role='service_role';set local request.jwt.claims='{"role":"service_role"}';set local request.jwt.claim.sub='';
do $$declare w uuid:=(select value::uuid from wa_state where key='worker');n record;r jsonb;begin
 for n in select * from public.claim_notification_jobs(50,w,true) loop
 if n.channel='whatsapp' and n.document_id=(select value::uuid from wa_state where key='first') then
 r:=public.issue_whatsapp_challenge(n.id,w,repeat('b',64));perform pg_temp.wa_assert((r->>'enabled')::boolean,'only verified leased recipient job can issue challenge');insert into wa_state values('firstChallenge','issued');
 elsif n.channel='whatsapp' and n.document_id=(select value::uuid from wa_state where key='second') then
 r:=public.issue_whatsapp_challenge(n.id,w,repeat('c',64));perform pg_temp.wa_assert((r->>'enabled')::boolean,'second exact version challenge issued');
 end if;end loop;
 perform pg_temp.wa_assert(exists(select 1 from wa_state where key='firstChallenge'),'exact leased notification issued a challenge');
 r:=public.accept_whatsapp_receipt('wrong-phone','+15555550102',repeat('b',64));perform pg_temp.wa_assert(not(r->>'accepted')::boolean,'different phone cannot accept');
 r:=public.accept_whatsapp_receipt('verified-receipt','+15555550101',repeat('b',64));perform pg_temp.wa_assert((r->>'accepted')::boolean,'verified one-time challenge accepts exact recipient');
 r:=public.accept_whatsapp_receipt('verified-receipt','+15555550101',repeat('b',64));perform pg_temp.wa_assert((r->>'duplicate')::boolean,'provider replay is idempotent');
 r:=public.accept_whatsapp_receipt('reused-token','+15555550101',repeat('b',64));perform pg_temp.wa_assert(not(r->>'accepted')::boolean,'token is single use');
end;$$;
reset role;set local role authenticated;
do $$declare d jsonb;begin
 perform pg_temp.wa_login('adminA');d:=public.operational_document((select value::uuid from wa_state where key='second'));
 perform public.supply_document_command((d->>'id')::uuid,'reassign',jsonb_build_object('recipientId',(select id from wa_actors where name='adminB'),'reason','Mudança de recebedor invalida desafio anterior'),gen_random_uuid(),(d->>'version')::integer);
 perform pg_temp.wa_assert((select balance=2 from public.current_stock_balances where care_recipient_id='ad000000-0000-4000-8000-000000000001' and location='CARE_TEAM' and product_id='fralda'),'receipt replays never duplicate stock');
 perform pg_temp.wa_assert((select body->'event'->>'securityLevel'='verified_phone_one_time_challenge' from public.document_events where document_id=(select value::uuid from wa_state where key='first') order by version desc limit 1),'document records actual verification level');
end;$$;
reset role;set local role service_role;set local request.jwt.claim.role='service_role';set local request.jwt.claims='{"role":"service_role"}';set local request.jwt.claim.sub='';
do $$declare r jsonb;begin r:=public.accept_whatsapp_receipt('stale-recipient','+15555550101',repeat('c',64));perform pg_temp.wa_assert(not(r->>'accepted')::boolean,'recipient/version changes invalidate prior challenge');end;$$;
reset role;
select 'whatsapp receipts passed';rollback;
