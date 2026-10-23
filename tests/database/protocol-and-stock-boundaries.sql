-- Local regression only, with sequence restoration even if an assertion fails.
begin;
update public.requisitions set status='cancelled' where id='30000000-0000-4000-8000-000000000001';
select pg_temp.assume_context('adminA');
select set_config('request.jwt.claim.role','authenticated',true);
do $$
declare v_last bigint;v_called boolean;v_protocol text;v_key uuid:=gen_random_uuid();a uuid;b uuid;
begin
  select last_value,is_called into v_last,v_called from public.requisition_protocol_number_seq;
  begin
    perform setval('public.requisition_protocol_number_seq',999999,true);
    select protocol into v_protocol from public.submit_requisition('20000000-0000-4000-8000-000000000001',gen_random_uuid(),'ignored','[{"productId":"fralda","currentStock":0,"urgent":false}]','[]','[]');
    if (select code from public.operational_documents where protocol=v_protocol) not like 'REQ-%' then raise exception 'patient-scoped protocol required';end if;
  exception when others then
    perform setval('public.requisition_protocol_number_seq',v_last,v_called);
    raise;
  end;
  perform setval('public.requisition_protocol_number_seq',v_last,v_called);
  a:=public.family_stock_movement('20000000-0000-4000-8000-000000000001','fralda',2,'inbound','Mesmo conteúdo e mesma chave',v_key);
  b:=public.family_stock_movement('20000000-0000-4000-8000-000000000001','fralda',2,'inbound','Mesmo conteúdo e mesma chave',v_key);
  if a<>b or (select count(*) from public.stock_movements where idempotency_key=v_key)<>1 then raise exception 'same-content movement retry must return its original row';end if;
end;$$;
select 'protocol and stock boundary regressions passed';
rollback;
