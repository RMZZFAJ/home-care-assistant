begin;
set local timezone='UTC';
-- Every fixture and scheduler side effect is rolled back. Existing patients
-- are temporarily outside this transaction's test batch, never reset/deleted.
update public.bal_regimes set enabled=false where enabled;
create temporary table bal_scheduler_fixture (id uuid primary key, shift_type_id uuid not null, enabled boolean not null) on commit drop;
insert into bal_scheduler_fixture
select gen_random_uuid(),gen_random_uuid(),number<=101 from generate_series(1,102) as number;

do $test$
declare v_owner uuid; v_count integer; v_disabled uuid;
begin
  select p.id into strict v_owner from public.profiles p join auth.users u on u.id=p.id where p.status='active' order by p.id limit 1;
  insert into public.care_recipients(id,display_name,is_development)
    select id,'Homologação fictícia do lote BAL',true from pg_temp.bal_scheduler_fixture;
  insert into public.shift_types(id,care_recipient_id,name,starts_local,duration_minutes,created_by)
    select shift_type_id,id,'Plantão fictício do lote','00:00',1440,v_owner from pg_temp.bal_scheduler_fixture;
  insert into public.bal_regimes(care_recipient_id,enabled,timezone,weekday,shift_type_id,starts_on,activated_at,updated_by)
    select id,enabled,'UTC',extract(dow from current_date)::integer,shift_type_id,current_date,now(),v_owner from pg_temp.bal_scheduler_fixture;
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  perform public.run_operational_schedule();
  select count(*) into v_count from public.bal_obligations o join pg_temp.bal_scheduler_fixture f on f.id=o.care_recipient_id;
  if v_count<>100 then raise exception 'The first BAL scheduler batch must stay bounded at 100: %',v_count;end if;
  perform public.run_operational_schedule();
  select count(distinct o.care_recipient_id) into v_count from public.bal_obligations o join pg_temp.bal_scheduler_fixture f on f.id=o.care_recipient_id;
  if v_count<>101 then raise exception 'The second BAL scheduler batch must reach patient 101: %',v_count;end if;
  select id into strict v_disabled from pg_temp.bal_scheduler_fixture where not enabled;
  if exists(select 1 from public.bal_obligations where care_recipient_id=v_disabled) then raise exception 'Disabled BAL regime was processed';end if;
  update public.bal_regimes set enabled=true where care_recipient_id=v_disabled;
  perform public.run_operational_schedule();
  perform public.run_operational_schedule();
  select count(*) into v_count from public.bal_obligations o join pg_temp.bal_scheduler_fixture f on f.id=o.care_recipient_id;
  if v_count<>102 then raise exception 'Rotation must pick newly enabled regimes without duplicating weeks: %',v_count;end if;
  if exists(select 1 from public.bal_obligations o join pg_temp.bal_scheduler_fixture f on f.id=o.care_recipient_id where o.state<>'pending' or o.actual_count_at is not null) then raise exception 'Scheduler must not invent a physical count';end if;
end;
$test$;

do $security$
declare v_role text;
begin
  if not (select relrowsecurity from pg_catalog.pg_class where oid='private.bal_scheduler_progress'::regclass) then raise exception 'BAL cursor must have RLS';end if;
  foreach v_role in array array['anon','authenticated','service_role'] loop
    if has_table_privilege(v_role,'private.bal_scheduler_progress','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then raise exception 'Direct scheduler cursor authority: %',v_role;end if;
  end loop;
  if has_function_privilege('anon','public.run_operational_schedule()','EXECUTE') or has_function_privilege('authenticated','public.run_operational_schedule()','EXECUTE') or not has_function_privilege('service_role','public.run_operational_schedule()','EXECUTE') then raise exception 'Unexpected scheduler RPC grants';end if;
end;
$security$;
select 'passed: BAL scheduler bounded rotation, opt-in, idempotence and private cursor';
rollback;
