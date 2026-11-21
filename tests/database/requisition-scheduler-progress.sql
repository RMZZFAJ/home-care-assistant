begin;
set local timezone='UTC';
create temporary table req_scheduler_fixture(patient uuid primary key,request_id uuid,terminal boolean not null);

do $$
declare owner_id uuid;patient_id uuid;request record;i integer;j integer;valid_ids uuid[]:='{}';bad_id uuid;result jsonb;before_movements bigint;cursor_before jsonb;
begin
  select p.id into strict owner_id from public.profiles p join auth.users u on u.id=p.id where p.full_name='Teste global' and p.status='active';
  select count(*) into before_movements from public.stock_movements;
  -- Exactly 25 terminal patients previously filled the patient batch forever.
  for i in 1..28 loop
    perform set_config('request.jwt.claim.sub','',true);
    perform set_config('request.jwt.claim.role','',true);
    perform set_config('request.jwt.claims','{}',true);
    patient_id:=('00000000-0000-4000-9000-'||lpad(i::text,12,'0'))::uuid;
    insert into public.care_recipients(id,display_name,is_development) values(patient_id,'Paciente fictício do scheduler REQ',true);
    insert into public.care_recipient_products(care_recipient_id,product_id,name,category,unit)
      select patient_id,id,name,category,unit from public.products where id='fralda';
    insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values(patient_id,owner_id,'admin');
    perform pg_temp.assume_context('global',patient_id);
    select * into request from public.submit_requisition(patient_id,gen_random_uuid(),'ignored','[{"productId":"fralda","currentStock":0,"urgent":false}]','[]','[]');
    if i<=25 then
      update public.requisitions set status='cancelled' where id=request.requisition_id;
      update public.operational_documents set status='cancelled' where id=request.requisition_id;
    else valid_ids:=array_append(valid_ids,request.requisition_id);end if;
    update public.requisition_lifecycle set next_reminder_at=case when i<=25 then '1800-01-01'::timestamptz else '1900-01-01'::timestamptz end where requisition_id=request.requisition_id;
    insert into req_scheduler_fixture values(patient_id,request.requisition_id,i<=25);
  end loop;
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  for i in 1..3 loop perform public.run_operational_schedule();end loop;
  if exists(select 1 from public.requisition_lifecycle where requisition_id=any(valid_ids) and reminders<>1) then raise exception 'terminal patients starve valid REQ targets';end if;
  if exists(select 1 from public.document_events e join req_scheduler_fixture f on f.request_id=e.document_id where f.terminal and e.action='req.reminder') then raise exception 'cancelled REQ received a reminder';end if;

  -- The same starvation existed within one patient's 100-row request batch.
  select patient into patient_id from req_scheduler_fixture where request_id=valid_ids[3];
  for j in 1..100 loop
    perform pg_temp.assume_context('global',patient_id);
    select * into request from public.submit_requisition(patient_id,gen_random_uuid(),'ignored','[{"productId":"fralda","currentStock":0,"urgent":false,"repeatReason":"Controle de regressão de candidaturas terminais"}]','[]','[]');
    update public.requisitions set status='cancelled' where id=request.requisition_id;
    update public.operational_documents set status='cancelled' where id=request.requisition_id;
    update public.requisition_lifecycle set next_reminder_at='1800-01-01' where requisition_id=request.requisition_id;
  end loop;
  update public.requisition_lifecycle set next_reminder_at='1900-01-01' where requisition_id=valid_ids[3];
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  for i in 1..3 loop perform public.run_operational_schedule();end loop;
  perform pg_temp.assert_quantity((select reminders from public.requisition_lifecycle where requisition_id=valid_ids[3]),2,'100 terminals do not starve the active request');

  -- More eligible patients than the patient bound prove rotation separately
  -- from terminal filtering. Every round retains the 25/100 limits.
  for i in 29..54 loop
    perform set_config('request.jwt.claim.sub','',true);
    perform set_config('request.jwt.claim.role','',true);
    perform set_config('request.jwt.claims','{}',true);
    patient_id:=('00000000-0000-4000-9000-'||lpad(i::text,12,'0'))::uuid;
    insert into public.care_recipients(id,display_name,is_development) values(patient_id,'Paciente fictício da rotação REQ',true);
    insert into public.care_recipient_products(care_recipient_id,product_id,name,category,unit) select patient_id,id,name,category,unit from public.products where id='fralda';
    insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values(patient_id,owner_id,'admin');
    perform pg_temp.assume_context('global',patient_id);
    select * into request from public.submit_requisition(patient_id,gen_random_uuid(),'ignored','[{"productId":"fralda","currentStock":0,"urgent":false}]','[]','[]');
    update public.requisition_lifecycle set next_reminder_at='1900-01-01' where requisition_id=request.requisition_id;
    valid_ids:=array_append(valid_ids,request.requisition_id);
  end loop;
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  for i in 1..3 loop
    result:=public.run_operational_schedule();
    if (result->>'lifecyclePatients')::integer>25 or (result->>'lifecycleCandidates')::integer>100 then raise exception 'lifecycle batch exceeded its bounds';end if;
  end loop;
  if exists(select 1 from public.requisition_lifecycle where requisition_id=any(valid_ids[4:29]) and reminders<>1) then raise exception 'eligible patient rotation starved a target';end if;

  -- A malformed candidate is isolated, visible in health, and immediately
  -- reconsidered after a legitimate repair changes its policy fingerprint.
  bad_id:=valid_ids[1];
  update public.requisition_lifecycle set policy=policy||'{"reminderRepeatHours":"invalid"}',next_reminder_at='1800-01-01' where requisition_id=bad_id;
  update public.requisition_lifecycle set next_reminder_at='1900-01-01' where requisition_id=valid_ids[2];
  for i in 1..3 loop result:=public.run_operational_schedule();end loop;
  if not exists(select 1 from private.operational_scheduler_failures where document_id=bad_id and sqlstate='22023' and attempts=1 and resolved_at is null and next_retry_at>now()) then raise exception 'invalid candidate was silent or repeatedly retried';end if;
  perform pg_temp.assert_quantity((select reminders from public.requisition_lifecycle where requisition_id=valid_ids[2]),2,'malformed policy does not block healthy target');
  if not exists(select 1 from private.scheduler_health where unresolved_candidates>=1) then raise exception 'scheduler falsely reports healthy state';end if;
  update public.requisition_lifecycle set policy=policy||'{"reminderRepeatHours":24}' where requisition_id=bad_id;
  for i in 1..3 loop perform public.run_operational_schedule();end loop;
  if not exists(select 1 from private.operational_scheduler_failures where document_id=bad_id and resolved_at is not null and attempts=1) then raise exception 'repaired candidate did not recover immediately';end if;
  perform pg_temp.assert_quantity((select reminders from public.requisition_lifecycle where requisition_id=bad_id),2,'repaired request reminded exactly once');
  perform public.run_operational_schedule();
  perform pg_temp.assert_quantity((select reminders from public.requisition_lifecycle where requisition_id=bad_id),2,'retry cannot duplicate reminders');
  update public.requisition_lifecycle set next_reminder_at='1900-01-01' where requisition_id=bad_id;
  select to_jsonb(progress) into cursor_before from private.requisition_scheduler_progress progress where singleton;
  begin
    perform public.run_operational_schedule();
    raise exception 'deliberate scheduler transaction rollback';
  exception when raise_exception then
    if sqlerrm<>'deliberate scheduler transaction rollback' then raise;end if;
  end;
  if (select to_jsonb(progress) from private.requisition_scheduler_progress progress where singleton) is distinct from cursor_before then raise exception 'rollback lost scheduler cursor position';end if;
  perform pg_temp.assert_quantity((select reminders from public.requisition_lifecycle where requisition_id=bad_id),2,'rollback preserves reminder progress');
  perform pg_temp.assert_quantity((select count(*) from public.stock_movements),before_movements,'scheduler never invents stock');
end;$$;

do $$declare role_name text;relation_name text;
begin
  foreach role_name in array array['anon','authenticated','service_role'] loop
    foreach relation_name in array array['private.requisition_scheduler_progress','private.operational_scheduler_failures','private.operational_scheduler_candidates'] loop
      if has_table_privilege(role_name,relation_name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then raise exception 'direct scheduler state privilege for %: %',role_name,relation_name;end if;
    end loop;
  end loop;
end;$$;
select 'passed: REQ terminal filtering, bounded progress, invalid candidate isolation, recovery and no duplicate effects';
rollback;
