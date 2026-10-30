CREATE OR REPLACE FUNCTION private.bal_event(p_patient uuid, p_cycle uuid, p_assignment uuid, p_action text, p_reason text, p_details jsonb, p_key text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_eid uuid;v_rid uuid;v_m record;v_worker uuid;begin
 insert into public.bal_cycle_events(care_recipient_id,cycle_id,assignment_id,event_key,action,reason,details,actor_id)
 values(p_patient,p_cycle,p_assignment,p_key,p_action,p_reason,p_details,auth.uid()) on conflict do nothing returning id into v_eid;
 if v_eid is null then return;end if;
 select professional_id into v_worker from public.bal_assignments where id=p_assignment;
 for v_m in select user_id,role from public.care_recipient_memberships where care_recipient_id=p_patient and status='active'
 and (user_id=v_worker or role in ('admin','family','supervisor')) loop
 if not private.member_can(p_patient,v_m.user_id,'bal.read') then continue;end if;
 insert into public.operational_reminders(care_recipient_id,user_id,kind,period,expected_at,bal_event_id)
 values(p_patient,v_m.user_id,'bal_cycle',current_date,now(),v_eid) returning id into v_rid;
 perform private.enqueue_notice(p_patient,v_m.user_id,p_action,p_reminder=>v_rid);
 end loop;end;$function$
