CREATE OR REPLACE FUNCTION private.schedule_event(p_patient uuid, p_series uuid, p_shift uuid, p_worker uuid, p_action text, p_reason text, p_before jsonb, p_after jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare eid uuid;rid uuid;m record;begin
 insert into public.shift_events(care_recipient_id,series_id,shift_id,professional_id,action,reason,before_state,after_state,actor_id)
 values(p_patient,p_series,p_shift,p_worker,p_action,p_reason,p_before,p_after,auth.uid()) returning id into eid;
 for m in select user_id from public.care_recipient_memberships where care_recipient_id=p_patient and status='active'
 and (user_id=p_worker or user_id=nullif(p_before->>'professional_id','')::uuid or role in ('admin','family','supervisor')) loop
 insert into public.operational_reminders(care_recipient_id,user_id,kind,period,expected_at,shift_event_id)
 values(p_patient,m.user_id,'schedule',current_date,now(),eid) returning id into rid;
 perform private.enqueue_notice(p_patient,m.user_id,p_action,p_reminder=>rid);
 end loop;end;$function$
