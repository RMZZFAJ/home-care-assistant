CREATE OR REPLACE FUNCTION public.run_operational_schedule()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
