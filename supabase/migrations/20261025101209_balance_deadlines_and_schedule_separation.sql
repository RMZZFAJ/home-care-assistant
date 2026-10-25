-- Scheduling authority cannot implicitly approve a BAL postponement.
alter table public.bal_obligations add column effective_due timestamptz;
alter table public.bal_deferrals add column target_shift_version integer,add column target_snapshot jsonb;
update public.bal_deferrals d set target_shift_version=s.version,target_snapshot=to_jsonb(s)||jsonb_build_object('professional_name',p.full_name,'type_name',t.name)
from public.scheduled_shifts s join public.profiles p on p.id=s.professional_id join public.shift_types t on t.id=s.shift_type_id where s.id=d.target_shift_id;
alter table public.bal_deferrals alter column target_shift_version set not null,alter column target_snapshot set not null;
update public.bal_obligations o set effective_due=greatest(o.original_due,coalesce((select max((d.target_snapshot->>'ends_at')::timestamptz)
from public.bal_deferrals d where d.cycle_id=o.cycle_id and d.status='approved' and d.decided_at>=o.created_at and d.decided_at<o.original_due),o.original_due));
alter table public.bal_obligations alter column effective_due set not null;
alter table public.bal_deferrals alter column assignment_id drop not null,alter column assignment_version drop not null;
alter table public.bal_deferrals add constraint bal_deferral_source check(assignment_id is not null or status='approved' and decided_by is not null);

create function private.guard_bal_schedule_window() returns trigger language plpgsql security definer set search_path='' as $$begin
 if (new.starts_at<>old.starts_at or new.ends_at<>old.ends_at or new.status<>'published') and exists(
 select 1 from public.bal_assignments a where a.shift_id=old.id and a.status='active' and a.ends_at>now()) then
 raise exception 'balance requires family deferral before schedule period change' using errcode='P0001';end if;
 return new;
end;$$;
create trigger bal_schedule_window before update on public.scheduled_shifts for each row execute function private.guard_bal_schedule_window();
revoke all on function private.guard_bal_schedule_window() from public,anon,authenticated,service_role;

do $$declare v_def text;v_old text;begin
 v_def:=pg_get_functiondef('public.balance_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
 v_old:='v_approve:=(p_body->>''approve'')::boolean;';
 if strpos(v_def,v_old)=0 then raise exception 'unexpected deferral decision';end if;
 v_def:=replace(v_def,v_old,'select * into v_s from public.scheduled_shifts where id=v_d.target_shift_id for share;
 if not found or v_s.status<>''published'' or v_s.version<>v_d.target_shift_version then raise exception ''stale document target shift'';end if;'||v_old);
 v_old:='select * into v_s from public.scheduled_shifts where care_recipient_id=p_patient and id=(p_body->>''targetShiftId'')::uuid;';
 if strpos(v_def,v_old)=0 then raise exception 'unexpected target selection';end if;
 v_def:=replace(v_def,v_old,replace(v_old,'::uuid;','::uuid for share;'));
 v_def:=replace(v_def,'target_shift_id,reason,requested_by)','target_shift_id,target_shift_version,target_snapshot,reason,requested_by)');
 v_def:=replace(v_def,'v_s.id,v_reason,auth.uid())','v_s.id,v_s.version,to_jsonb(v_s)||jsonb_build_object(''professional_name'',(select full_name from public.profiles where id=v_s.professional_id),''type_name'',(select name from public.shift_types where id=v_s.shift_type_id)),v_reason,auth.uid())');
 v_old:='v_id:=private.bal_assign(p_patient,v_a.cycle_id,v_d.target_shift_id,''deferred'');';
 if strpos(v_def,v_old)=0 then raise exception 'unexpected approved deferral';end if;
 v_def:=replace(v_def,v_old,v_old||' update public.bal_obligations set effective_due=greatest(effective_due,(v_d.target_snapshot->>''ends_at'')::timestamptz) where cycle_id=v_a.cycle_id and state=''pending'';');
 execute v_def;

 v_def:=pg_get_functiondef('private.process_bal_patient(uuid,timestamptz)'::regprocedure);
 v_def:=replace(v_def,'v_cycles integer:=0;','v_late record;v_cycles integer:=0;');
 v_def:=replace(v_def,'original_start,original_due,regime_snapshot)','original_start,original_due,effective_due,regime_snapshot)');
 v_def:=replace(v_def,'values(p_patient,v_c.id,v_week,v_start,v_due,to_jsonb(v_r))','values(p_patient,v_c.id,v_week,v_start,v_due,v_due,to_jsonb(v_r))');
 v_def:=replace(v_def,'missed_at=coalesce(missed_at,original_due)','missed_at=coalesce(missed_at,effective_due)');
 v_def:=replace(v_def,'original_due<=p_now','effective_due<=p_now');
 v_def:=replace(v_def,'min(original_due)','min(effective_due)');
 v_old:='and not exists(select 1 from public.bal_assignments a where a.cycle_id=v_c.id and a.shift_id=s.id)';
 if strpos(v_def,v_old)=0 then raise exception 'unexpected assignment exclusion';end if;
 v_def:=replace(v_def,v_old,'and not exists(select 1 from public.bal_assignments a where a.cycle_id=v_c.id and a.shift_id=s.id and (a.status<>''invalidated'' or a.shift_version=s.version))');
 v_old:='and not exists(select 1 from public.bal_assignments a where a.id=d.assignment_id and a.status=''active'' and a.version=d.assignment_version);';
 if strpos(v_def,v_old)=0 then raise exception 'unexpected stale deferral guard';end if;
 v_def:=replace(v_def,v_old,'and (not exists(select 1 from public.bal_assignments a where a.id=d.assignment_id and a.status=''active'' and a.version=d.assignment_version) or not exists(select 1 from public.scheduled_shifts s where s.id=d.target_shift_id and s.status=''published'' and s.version=d.target_shift_version));');
 v_old:='if v_matches<>1 then
 update public.bal_obligations set missed_at=coalesce(missed_at,effective_due) where cycle_id=v_c.id and state=''pending'' and effective_due<=p_now;';
 if strpos(v_def,v_old)=0 then raise exception 'unexpected unassigned deadline';end if;
 v_def:=replace(v_def,v_old,'if v_matches<>1 then');
 v_def:=replace(v_def,'case when v_was_missed then ''transfer'' else ''scheduled'' end','case when v_was_missed or exists(select 1 from public.bal_assignments where cycle_id=v_c.id) then ''transfer'' else ''scheduled'' end');
 v_old:='return v_cycles;';
 v_def:=replace(v_def,v_old,'for v_late in update public.bal_obligations set missed_at=effective_due where care_recipient_id=p_patient and state=''pending'' and missed_at is null and effective_due<=p_now returning * loop
 perform private.bal_event(p_patient,v_late.cycle_id,null,''bal.cycle.overdue'',''Prazo do balanço ultrapassado; obrigação preservada'',jsonb_build_object(''originalDue'',v_late.original_due,''effectiveDue'',v_late.effective_due),''overdue:''||v_late.id);end loop;'||v_old);
 execute v_def;
end;$$;

create or replace function public.resolve_balance_assignment(p_patient uuid,p_cycle uuid,p_shift uuid,p_reason text,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_old private.bal_commands;v_request jsonb;v_id uuid;v_result jsonb;v_c public.bal_cycles;v_s public.scheduled_shifts;
 v_previous public.bal_assignments;v_due timestamptz;v_defer boolean;v_deferral public.bal_deferrals;
begin
 if not private.bal_family_authority(p_patient,'bal.schedule.manage') then raise exception 'family balance scheduling authorization required' using errcode='42501';end if;
 if p_key is null or length(trim(coalesce(p_reason,''))) not between 3 and 1000 then raise exception 'assignment reason required';end if;
 if not exists(select 1 from public.care_recipients where id=p_patient and is_active) then raise exception 'inactive patient';end if;
 perform pg_advisory_xact_lock(hashtextextended('bal:'||p_patient,0));
 v_request:=jsonb_build_object('action','assign','cycleId',p_cycle,'shiftId',p_shift,'reason',p_reason);
 select * into v_old from private.bal_commands where care_recipient_id=p_patient and actor_id=auth.uid() and key=p_key;
 if found then if v_old.request<>v_request then raise exception 'idempotency payload mismatch';end if;return v_old.result;end if;
 select * into v_c from public.bal_cycles where id=p_cycle and care_recipient_id=p_patient and state='open' for update;
 if not found or exists(select 1 from public.bal_assignments where care_recipient_id=p_patient and status='active') then raise exception 'stale balance assignment';end if;
 select * into v_s from public.scheduled_shifts where id=p_shift and care_recipient_id=p_patient for share;
 if not found or v_s.starts_at<(select min(original_start) from public.bal_obligations where cycle_id=p_cycle) then raise exception 'invalid balance target shift';end if;
 select min(effective_due) into v_due from public.bal_obligations where cycle_id=p_cycle and state='pending' and effective_due>now();
 v_defer:=coalesce(v_s.ends_at>v_due,false);
 if v_defer and not private.bal_family_authority(p_patient,'bal.defer.approve') then raise exception 'family deferral approval required' using errcode='42501';end if;
 v_id:=private.bal_assign(p_patient,p_cycle,p_shift,case when v_defer then 'deferred' else 'transfer' end);
 if v_defer then
 select * into v_previous from public.bal_assignments where cycle_id=p_cycle and id<>v_id order by created_at desc limit 1;
 insert into public.bal_deferrals(care_recipient_id,cycle_id,assignment_id,assignment_version,target_shift_id,target_shift_version,target_snapshot,reason,requested_by,status,decided_by,decision_reason,decided_at)
 values(p_patient,p_cycle,v_previous.id,v_previous.version,v_s.id,v_s.version,to_jsonb(v_s)||jsonb_build_object('professional_name',(select full_name from public.profiles where id=v_s.professional_id),'type_name',(select name from public.shift_types where id=v_s.shift_type_id)),p_reason,auth.uid(),'approved',auth.uid(),p_reason,now()) returning * into v_deferral;
 update public.bal_obligations set effective_due=greatest(effective_due,v_s.ends_at) where cycle_id=p_cycle and state='pending';
 perform private.bal_event(p_patient,p_cycle,v_id,'bal.cycle.deferred',p_reason,to_jsonb(v_deferral),'deferral:'||v_deferral.id||':approved');
 end if;
 perform private.bal_event(p_patient,p_cycle,v_id,'bal.cycle.assignment_resolved',p_reason,jsonb_build_object('shiftId',p_shift,'authorizedDeferral',v_defer),'resolve:'||v_id);
 v_result:=jsonb_build_object('assignmentId',v_id);
 insert into private.bal_commands(care_recipient_id,actor_id,key,request,result) values(p_patient,auth.uid(),p_key,v_request,v_result);
 return v_result;
end;$$;

-- Handoffs retain the original creator and record the actual counter separately.
-- Review must remain distinct from that actual counter, including after handoff.
do $$declare v_def text;v_old text;begin
 v_def:=pg_get_functiondef('public.supply_document_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
 v_old:='if v_d.type=''BAL'' and p_action=''approve'' and p_body->>''group''=''family''';
 if strpos(v_def,v_old)=0 then raise exception 'unexpected BAL review guard';end if;
 execute replace(v_def,v_old,'if v_d.type=''BAL'' and p_action=''approve'' and v_d.payload->''balanceContext''->>''professionalId''=auth.uid()::text then raise exception ''distinct balance reviewer required'' using errcode=''42501'';end if;
 '||v_old);
end;$$;
