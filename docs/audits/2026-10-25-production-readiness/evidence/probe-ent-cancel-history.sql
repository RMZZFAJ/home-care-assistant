-- Historical synthetic fixture, then current commands through authenticated RPCs.
-- No trigger disabled and no persistent data changed; final ROLLBACK.
begin;
-- INCLUDE_AUTH_HELPER
create temporary table audit_results(k text,v text);
grant all on audit_results to authenticated;
insert into public.care_recipients(id,display_name,is_development) values('db000000-0000-4000-8000-000000000001','Auditoria cancelamento cumulativo',true);
insert into public.care_recipient_products(care_recipient_id,product_id,name,category,unit,aliases,sort_order)
select 'db000000-0000-4000-8000-000000000001',id,name,category,unit,aliases,0 from public.products where id='fralda';
insert into public.care_recipient_memberships(care_recipient_id,user_id,role)
select 'db000000-0000-4000-8000-000000000001',id,case when full_name='Teste adminA' then 'admin'::public.profile_role else 'professional'::public.profile_role end from public.profiles where full_name in ('Teste adminA','Teste professional');
-- Preceding day's legitimate cancellation allocation: one delivered and consumed unit.
insert into public.operational_documents(id,care_recipient_id,type,status,created_by,recipient_id,payload,idempotency_key,created_at)
select 'db000000-0000-4000-8000-000000000002','db000000-0000-4000-8000-000000000001','ENT','cancelled',id,id,'{"source":"FAMILY","destination":"CARE_TEAM"}',gen_random_uuid(),now()-interval '2 days' from public.profiles where full_name='Teste professional';
insert into public.document_lines(id,document_id,care_recipient_id,product_id,name_snapshot,unit_snapshot,category_snapshot,quantity,accepted_quantity)
values('db000000-0000-4000-8000-000000000003','db000000-0000-4000-8000-000000000002','db000000-0000-4000-8000-000000000001','fralda','Fralda','unidade','supply',1,1);
insert into public.stock_movements(care_recipient_id,product_id,quantity,movement_type,performed_by,destination_location,justification,reference_type,reference_id,created_at)
select 'db000000-0000-4000-8000-000000000001','fralda',1,'inbound',id,'CARE_TEAM','Fixture histórico recebido','document','db000000-0000-4000-8000-000000000002',now()-interval '2 days' from public.profiles where full_name='Teste adminA';
insert into public.stock_movements(care_recipient_id,product_id,quantity,movement_type,performed_by,source_location,justification,reference_type,created_at)
select 'db000000-0000-4000-8000-000000000001','fralda',1,'outbound',id,'CARE_TEAM','Fixture histórico consumido','consumption',now()-interval '1 day' from public.profiles where full_name='Teste adminA';
select private.record_document_event('db000000-0000-4000-8000-000000000002','ent.consent_cancel','{"reason":"Cancelamento antigo conciliado","lines":[{"lineId":"db000000-0000-4000-8000-000000000003","returnQuantity":"0","consumedQuantity":"1"}]}',gen_random_uuid());
set local role authenticated;
do $$declare p uuid:='db000000-0000-4000-8000-000000000001';d jsonb;r uuid;worker uuid;begin
 perform pg_temp.assume_context('adminA',p);
 select user_id into worker from public.care_recipient_memberships where care_recipient_id=p and role='professional';
 perform public.family_stock_movement(p,'fralda',1,'inbound','Nova compra teste audit',gen_random_uuid());
 d:=public.create_supply_document(p,'ENT',jsonb_build_object('source','FAMILY','destination','CARE_TEAM','recipientId',worker,'lines',jsonb_build_array(jsonb_build_object('productId','fralda','quantity','1'))),gen_random_uuid());
 perform pg_temp.assume_context('professional',p);
 d:=public.supply_document_command((d->>'id')::uuid,'receive','{"divergences":[]}',gen_random_uuid(),(d->>'version')::integer);
 r:=public.report_extraordinary_consumption(p,'consumption','CARE_TEAM','Nova unidade consumida','[{"productId":"fralda","quantity":"1"}]',gen_random_uuid());
 perform pg_temp.assume_context('adminA',p);
 perform public.confirm_extraordinary_consumption(r,true);
 d:=public.supply_document_command((d->>'id')::uuid,'cancel','{"reason":"Cancelar após consumo confirmado"}',gen_random_uuid(),(d->>'version')::integer);
 perform pg_temp.assume_context('professional',p);
 begin
  perform public.supply_document_command((d->>'id')::uuid,'consent_cancel',jsonb_build_object('reason','Consumo atual já confirmado','lines',jsonb_build_array(jsonb_build_object('lineId',d->'lines'->0->>'id','returnQuantity','0','consumedQuantity','1'))),gen_random_uuid(),(d->>'version')::integer);
  insert into audit_results values('result','UNEXPECTED_SUCCESS');
 exception when others then
  insert into audit_results values('result',sqlerrm),('sqlstate',sqlstate);
 end;
 insert into audit_results values('new_document',d->>'id');
end;$$;
reset role;
select k||'='||coalesce(v,'NULL') from audit_results;
select 'current_consumption_verified='||sum(quantity) from public.stock_movements where care_recipient_id='db000000-0000-4000-8000-000000000001' and reference_type='consumption' and created_at>=now();
select 'previous_allocations='||sum((z->>'consumedQuantity')::numeric) from public.document_events e cross join lateral jsonb_array_elements(e.body->'event'->'lines') z where e.care_recipient_id='db000000-0000-4000-8000-000000000001' and action='ent.consent_cancel';
rollback;
