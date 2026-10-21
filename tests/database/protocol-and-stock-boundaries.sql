-- Local regression only, with sequence restoration even if an assertion fails.
begin;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where full_name='Teste global'),true);
select set_config('request.jwt.claim.role','authenticated',true);
do $$
declare v_last bigint;v_called boolean;v_protocol text;v_key uuid:=gen_random_uuid();a public.stock_movements;b public.stock_movements;
begin
  select last_value,is_called into v_last,v_called from public.requisition_protocol_number_seq;
  begin
    perform setval('public.requisition_protocol_number_seq',999999,true);
    select protocol into v_protocol from public.submit_requisition('20000000-0000-4000-8000-000000000001',gen_random_uuid(),'ignored','[{"productId":"fralda","currentStock":0,"urgent":false}]','[]','[]');
    if v_protocol<>'HC-1000000' then raise exception 'protocol must grow beyond six digits';end if;
  exception when others then
    perform setval('public.requisition_protocol_number_seq',v_last,v_called);
    raise;
  end;
  perform setval('public.requisition_protocol_number_seq',v_last,v_called);
  a:=public.record_stock_movement('20000000-0000-4000-8000-000000000001','fralda',2,'inbound',null,'FAMILY','Mesmo conteúdo e mesma chave',v_key);
  b:=public.record_stock_movement('20000000-0000-4000-8000-000000000001','fralda',2,'inbound',null,'FAMILY','Mesmo conteúdo e mesma chave',v_key);
  if a.id<>b.id or (select count(*) from public.stock_movements where idempotency_key=v_key)<>1 then raise exception 'same-content movement retry must return its original row';end if;
end;$$;
select 'protocol and stock boundary regressions passed';
rollback;
