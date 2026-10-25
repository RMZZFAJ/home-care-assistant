begin;
do $$declare t text;f text;begin
 foreach t in array array['shift_types','shift_series','scheduled_shifts','shift_events','shift_change_requests','bal_regimes','bal_cycles','bal_obligations','bal_assignments','bal_deferrals','bal_cycle_events'] loop
 if not (select relrowsecurity from pg_class where oid=('public.'||t)::regclass) then raise exception 'RLS missing: %',t;end if;
 if has_table_privilege('authenticated','public.'||t,'INSERT,UPDATE,DELETE,TRUNCATE') or has_table_privilege('anon','public.'||t,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') or has_table_privilege('service_role','public.'||t,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') then raise exception 'Unexpected direct authority: %',t;end if;
 end loop;
 foreach f in array array['public.schedule_command(uuid,text,jsonb,uuid,integer)','public.schedule_workspace(uuid,date,date)','public.balance_command(uuid,text,jsonb,uuid,integer)','public.balance_workspace(uuid)','public.resolve_balance_assignment(uuid,uuid,uuid,text,uuid)'] loop
 if not has_function_privilege('authenticated',f,'EXECUTE') or has_function_privilege('anon',f,'EXECUTE') or has_function_privilege('service_role',f,'EXECUTE') then raise exception 'Unexpected RPC grant: %',f;end if;
 end loop;
 if has_function_privilege('authenticated','private.guard_bal_schedule_window()','EXECUTE') or has_function_privilege('service_role','public.patient_capability_definitions(uuid)','EXECUTE') or has_function_privilege('anon','public.patient_capability_definitions(uuid)','EXECUTE') then raise exception 'Unexpected schedule or matrix authority';end if;
 foreach f in array array['private.process_bal_patient(uuid,timestamptz)','private.bal_count_context(uuid,uuid,jsonb)','private.finish_bal_count(uuid,jsonb)','public.fluent_pre_shift_create(uuid,text,jsonb,uuid,boolean)','public.fluent_pre_shift_revise(uuid,jsonb,uuid,integer,boolean)','public.fluent_pre_shift_command(uuid,text,jsonb,uuid,integer)','public.fluent_pre_shift_scheduler()'] loop
 if has_function_privilege('authenticated',f,'EXECUTE') or has_function_privilege('anon',f,'EXECUTE') or has_function_privilege('service_role',f,'EXECUTE') then raise exception 'Internal path exposed: %',f;end if;
 end loop;
end;$$;
select 'passed: shift and BAL RLS, explicit grants and internal guards';
rollback;
