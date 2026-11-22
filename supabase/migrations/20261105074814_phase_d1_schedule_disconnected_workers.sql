begin;

-- Follow-up to the already exercised local schedule migration: assignment
-- eligibility is checked again when a proposal becomes published. Cancelling
-- an existing future assignment does not require reactivating its worker.
do $$declare definition text;anchor text;begin
 definition:=replace(pg_get_functiondef('public.schedule_command(uuid,text,jsonb,uuid,integer)'::regprocedure),E'\r\n',E'\n');
 anchor:='perform private.require_schedule_management(p_patient,ser.professional_id);';
 if strpos(definition,anchor)=0 then raise exception 'unexpected series publication guard';end if;
 definition:=replace(definition,anchor,anchor||E'\n if p_action=''approve'' and not private.schedule_worker(p_patient,ser.professional_id) then raise exception ''stale document scheduled professional no longer eligible'';end if;');
 anchor:=E'perform private.require_schedule_management(p_patient,s.professional_id);\n if not private.schedule_worker(p_patient,worker)';
 if strpos(definition,anchor)=0 then raise exception 'unexpected cancelled worker guard';end if;
 definition:=replace(definition,anchor,E'perform private.require_schedule_management(p_patient,s.professional_id);\n if p_action<>''cancel'' and not private.schedule_worker(p_patient,worker)');
 execute definition;

 definition:=replace(pg_get_functiondef('public.schedule_workspace(uuid,date,date)'::regprocedure),E'\r\n',E'\n');
 anchor:=E'''series'',coalesce((select jsonb_agg(to_jsonb(s)||jsonb_build_object(\n';
 if strpos(definition,anchor)=0 then raise exception 'unexpected series read model';end if;
 definition:=replace(definition,anchor,anchor||E'   ''publication_blocked'',s.ended_on is not null or not private.schedule_worker(p_patient,s.professional_id),\n');
 execute definition;
end;$$;

-- This helper also serves current calendar queries, not only persisted
-- proposal snapshots. Its provenance must not claim a historical proposal.
create or replace function private.schedule_shift_snapshot(p_shift public.scheduled_shifts) returns jsonb
language sql stable security definer set search_path='' as $$
 select to_jsonb(p_shift)||jsonb_build_object('professional_name',(select full_name from public.profiles where id=p_shift.professional_id),
 'type_name',(select name from public.shift_types where id=p_shift.shift_type_id),'snapshot_source','database_row')
$$;
revoke all on function private.schedule_shift_snapshot(public.scheduled_shifts) from public,anon,authenticated,service_role;
notify pgrst,'reload schema';
commit;
