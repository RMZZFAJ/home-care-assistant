-- A bounded scheduler batch must advance across all explicitly enabled regimes.
-- Keep operational progress separate from the user's versioned BAL settings.
create table private.bal_scheduler_progress (
  singleton boolean primary key default true check (singleton),
  last_patient uuid,
  updated_at timestamptz not null default now()
);
alter table private.bal_scheduler_progress enable row level security;
revoke all on table private.bal_scheduler_progress from public, anon, authenticated, service_role;
insert into private.bal_scheduler_progress(singleton) values (true);
create index bal_regimes_enabled_patient on public.bal_regimes(care_recipient_id) where enabled;

create or replace function public.run_operational_schedule() returns jsonb
language plpgsql security definer set search_path='' as $function$
declare
  v_result jsonb;
  v_cursor uuid;
  v_batch uuid[];
  v_patient uuid;
  v_assignments integer := 0;
  v_processed integer := 0;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then
    raise exception 'worker authorization required' using errcode='42501';
  end if;
  v_result := public.fluent_pre_shift_scheduler();
  -- The singleton row serializes overlapping workers. Cursor movement and all
  -- patient processing commit together; a failed transaction advances neither.
  select last_patient into strict v_cursor
    from private.bal_scheduler_progress where singleton for update;
  if v_cursor is null then
    v_batch := array(select care_recipient_id from public.bal_regimes
      where enabled order by care_recipient_id limit 100);
  else
    v_batch := array(select care_recipient_id from public.bal_regimes
      where enabled and care_recipient_id > v_cursor order by care_recipient_id limit 100);
    v_batch := v_batch || array(select care_recipient_id from public.bal_regimes
      where enabled and care_recipient_id <= v_cursor order by care_recipient_id
      limit (100 - cardinality(v_batch)));
  end if;
  foreach v_patient in array v_batch loop
    v_assignments := v_assignments + private.process_bal_patient(v_patient);
    v_processed := v_processed + 1;
  end loop;
  if v_processed > 0 then
    update private.bal_scheduler_progress
      set last_patient=v_patient, updated_at=clock_timestamp() where singleton;
  end if;
  return v_result || jsonb_build_object('balanceAssignments',v_assignments,'balancePatientsProcessed',v_processed);
end;
$function$;
revoke all on function public.run_operational_schedule() from public, anon, authenticated, service_role;
grant execute on function public.run_operational_schedule() to service_role;
