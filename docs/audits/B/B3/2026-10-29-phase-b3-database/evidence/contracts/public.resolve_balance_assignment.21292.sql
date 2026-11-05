CREATE OR REPLACE FUNCTION public.resolve_balance_assignment(p_patient uuid, p_cycle uuid, p_shift uuid, p_reason text, p_key uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end;$function$
