create or replace function public.balance_command(p_patient uuid,p_action text,p_body jsonb,p_key uuid,p_version integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_old private.bal_commands;v_request jsonb;v_result jsonb;v_r public.bal_regimes;v_a public.bal_assignments;v_d public.bal_deferrals;
 v_c public.bal_cycles;v_doc public.operational_documents;v_s public.scheduled_shifts;v_id uuid;v_approve boolean;v_reason text:=trim(coalesce(p_body->>'reason',''));
begin
 perform private.require_cap(p_patient,'bal.read');
 if p_key is null or p_body is null or jsonb_typeof(p_body)<>'object' then raise exception 'invalid balance command';end if;
 if not exists(select 1 from public.care_recipients where id=p_patient and is_active) then raise exception 'inactive patient';end if;
 if p_action='assign_recount' then perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));end if;
 perform pg_advisory_xact_lock(hashtextextended('bal:'||p_patient,0));
 v_request:=jsonb_build_object('action',p_action,'body',p_body,'version',p_version);
 select * into v_old from private.bal_commands where care_recipient_id=p_patient and actor_id=auth.uid() and key=p_key;
 if found then if v_old.request<>v_request then raise exception 'idempotency payload mismatch';end if;return v_old.result;end if;
 if p_action='configure' then
 if not private.bal_family_authority(p_patient,'bal.schedule.manage') then raise exception 'family balance scheduling authorization required' using errcode='42501';end if;
 select * into v_r from public.bal_regimes where care_recipient_id=p_patient for update;
 if v_r.version is distinct from p_version then raise exception 'stale document';end if;
 if length(v_reason)<3 or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_body->>'timezone') then raise exception 'reason and valid timezone required';end if;
 if not exists(select 1 from public.shift_types where care_recipient_id=p_patient and id=(p_body->>'shiftTypeId')::uuid and is_active) then raise exception 'invalid balance shift type';end if;
 if p_body->>'professionalId' is not null and not private.schedule_worker(p_patient,(p_body->>'professionalId')::uuid) then raise exception 'invalid designated professional';end if;
 if (v_r.care_recipient_id is null or not v_r.enabled) and (p_body->>'startsOn')::date<(now() at time zone (p_body->>'timezone'))::date then raise exception 'balance activation cannot be retroactive';end if;
 if v_r.starts_on is not null and (p_body->>'startsOn')::date<v_r.starts_on then raise exception 'balance activation cannot be retroactive';end if;
 insert into public.bal_regimes(care_recipient_id,enabled,timezone,weekday,shift_type_id,designated_professional_id,starts_on,activated_at,updated_by)
 values(p_patient,(p_body->>'enabled')::boolean,p_body->>'timezone',(p_body->>'weekday')::integer,(p_body->>'shiftTypeId')::uuid,(p_body->>'professionalId')::uuid,(p_body->>'startsOn')::date,case when (p_body->>'enabled')::boolean then now() end,auth.uid())
 on conflict(care_recipient_id) do update set enabled=excluded.enabled,timezone=excluded.timezone,weekday=excluded.weekday,shift_type_id=excluded.shift_type_id,
 designated_professional_id=excluded.designated_professional_id,starts_on=excluded.starts_on,activated_at=coalesce(public.bal_regimes.activated_at,excluded.activated_at),version=public.bal_regimes.version+1,updated_by=auth.uid(),updated_at=now() returning * into v_r;
 perform private.bal_event(p_patient,null,null,'bal.cycle.configured',v_reason,to_jsonb(v_r),'config:'||v_r.version);
 perform private.process_bal_patient(p_patient);v_result:=to_jsonb(v_r);
 elsif p_action='refresh' then
 if not(private.can(p_patient,'bal.schedule.manage') or private.can(p_patient,'schedule.manage.team')) then raise exception 'balance scheduling authorization required' using errcode='42501';end if;
 perform private.process_bal_patient(p_patient);v_result:=jsonb_build_object('processed',true);
 elsif p_action in ('request_deferral','defer','decide_deferral') then
 perform private.process_bal_patient(p_patient);
 if length(v_reason)<3 then raise exception 'deferral reason required';end if;
 if p_action='decide_deferral' then
 if not private.bal_family_authority(p_patient,'bal.defer.approve') then raise exception 'family approval required' using errcode='42501';end if;
 select * into v_d from public.bal_deferrals where care_recipient_id=p_patient and id=(p_body->>'id')::uuid for update;
 if not found or v_d.status<>'pending' then raise exception 'stale document';end if;
 select * into v_a from public.bal_assignments where id=v_d.assignment_id for update;
 if v_a.status<>'active' or v_a.version<>v_d.assignment_version or v_a.ends_at<=now() then raise exception 'stale document';end if;
 v_approve:=(p_body->>'approve')::boolean;
 else
 select * into v_a from public.bal_assignments where id=(p_body->>'assignmentId')::uuid and care_recipient_id=p_patient for update;
 if not found or v_a.status<>'active' or v_a.version is distinct from p_version or v_a.ends_at<=now() then raise exception 'stale document';end if;
 if p_action='defer' then
 if not private.bal_family_authority(p_patient,'bal.defer.approve') then raise exception 'family approval required' using errcode='42501';end if;
 else
 if not private.can(p_patient,'bal.defer.request') or (v_a.professional_id<>auth.uid() and not exists(select 1 from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=auth.uid() and status='active' and role='supervisor')) then raise exception 'deferral request authorization required' using errcode='42501';end if;
 end if;
 select * into v_s from public.scheduled_shifts where care_recipient_id=p_patient and id=(p_body->>'targetShiftId')::uuid;
 if not found or v_s.status<>'published' or v_s.starts_at<v_a.ends_at or not private.schedule_worker(p_patient,v_s.professional_id) or not private.member_can(p_patient,v_s.professional_id,'bal.count') then raise exception 'invalid deferral target shift';end if;
 insert into public.bal_deferrals(care_recipient_id,cycle_id,assignment_id,assignment_version,target_shift_id,reason,requested_by)
 values(p_patient,v_a.cycle_id,v_a.id,v_a.version,v_s.id,v_reason,auth.uid()) returning * into v_d;
 v_approve:=p_action='defer';end if;
 if v_approve then
 update public.bal_assignments set status='deferred',version=version+1 where id=v_a.id;
 v_id:=private.bal_assign(p_patient,v_a.cycle_id,v_d.target_shift_id,'deferred');
 update public.bal_deferrals set status='approved',decided_by=auth.uid(),decided_at=now(),decision_reason=v_reason where id=v_d.id returning * into v_d;
 perform private.bal_event(p_patient,v_a.cycle_id,v_id,'bal.cycle.deferred',v_reason,to_jsonb(v_d),'deferral:'||v_d.id||':approved');
 elsif p_action='decide_deferral' then
 update public.bal_deferrals set status='rejected',decided_by=auth.uid(),decided_at=now(),decision_reason=v_reason where id=v_d.id returning * into v_d;
 perform private.bal_event(p_patient,v_a.cycle_id,v_a.id,'bal.cycle.deferral_rejected',v_reason,to_jsonb(v_d),'deferral:'||v_d.id||':rejected');
 else perform private.bal_event(p_patient,v_a.cycle_id,v_a.id,'bal.cycle.deferral_requested',v_reason,to_jsonb(v_d),'deferral:'||v_d.id||':requested');end if;
 v_result:=to_jsonb(v_d);
 elsif p_action='assign_recount' then
 if not(private.can(p_patient,'bal.approve.family') or private.can(p_patient,'bal.approve.supervisor')) then raise exception 'balance review authorization required' using errcode='42501';end if;
 if length(v_reason)<3 then raise exception 'recount reason required';end if;
 select * into v_c from public.bal_cycles where care_recipient_id=p_patient and document_id=(p_body->>'documentId')::uuid and state='counted' for update;
 if not found or not exists(select 1 from public.operational_documents where id=v_c.document_id and type='BAL' and status='submitted') then raise exception 'pending balance review required';end if;
 select * into v_doc from public.operational_documents where id=v_c.document_id for update;
 if v_doc.version is distinct from p_version or v_doc.status<>'submitted' then raise exception 'stale document';end if;
 if exists(select 1 from public.bal_assignments where care_recipient_id=p_patient and status='active') then raise exception 'another balance assignment is active';end if;
 v_id:=private.bal_assign(p_patient,v_c.id,(p_body->>'targetShiftId')::uuid,'recount');
 perform private.bal_event(p_patient,v_c.id,v_id,'bal.cycle.recount_assigned',v_reason,jsonb_build_object('documentId',v_c.document_id),'recount:'||v_id);
 v_result:=jsonb_build_object('assignmentId',v_id);
 else raise exception 'invalid balance action';end if;
 insert into private.bal_commands(care_recipient_id,actor_id,key,request,result) values(p_patient,auth.uid(),p_key,v_request,v_result);
 return v_result;
end;$$;

create function public.resolve_balance_assignment(p_patient uuid,p_cycle uuid,p_shift uuid,p_reason text,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$declare v_old private.bal_commands;v_request jsonb;v_id uuid;v_result jsonb;v_c public.bal_cycles;begin
 if not private.bal_family_authority(p_patient,'bal.schedule.manage') then raise exception 'family balance scheduling authorization required' using errcode='42501';end if;
 if p_key is null or length(trim(coalesce(p_reason,''))) not between 3 and 1000 then raise exception 'assignment reason required';end if;
 if not exists(select 1 from public.care_recipients where id=p_patient and is_active) then raise exception 'inactive patient';end if;
 perform pg_advisory_xact_lock(hashtextextended('bal:'||p_patient,0));
 v_request:=jsonb_build_object('action','assign','cycleId',p_cycle,'shiftId',p_shift,'reason',p_reason);
 select * into v_old from private.bal_commands where care_recipient_id=p_patient and actor_id=auth.uid() and key=p_key;
 if found then if v_old.request<>v_request then raise exception 'idempotency payload mismatch';end if;return v_old.result;end if;
 select * into v_c from public.bal_cycles where id=p_cycle and care_recipient_id=p_patient and state='open' for update;
 if not found or exists(select 1 from public.bal_assignments where care_recipient_id=p_patient and status='active') then raise exception 'stale balance assignment';end if;
 if not exists(select 1 from public.scheduled_shifts s where s.id=p_shift and s.care_recipient_id=p_patient and s.starts_at>=(select min(original_start) from public.bal_obligations where cycle_id=p_cycle)) then raise exception 'invalid balance target shift';end if;
 v_id:=private.bal_assign(p_patient,p_cycle,p_shift,'transfer');
 perform private.bal_event(p_patient,p_cycle,v_id,'bal.cycle.assignment_resolved',p_reason,jsonb_build_object('shiftId',p_shift),'resolve:'||v_id);
 v_result:=jsonb_build_object('assignmentId',v_id);
 insert into private.bal_commands(care_recipient_id,actor_id,key,request,result) values(p_patient,auth.uid(),p_key,v_request,v_result);
 return v_result;
end;$$;
revoke all on function public.resolve_balance_assignment(uuid,uuid,uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.resolve_balance_assignment(uuid,uuid,uuid,text,uuid) to authenticated;

