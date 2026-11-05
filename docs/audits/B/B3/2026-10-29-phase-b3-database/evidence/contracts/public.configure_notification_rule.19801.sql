CREATE OR REPLACE FUNCTION public.configure_notification_rule(p_patient uuid, p_event text, p_role text, p_channels text[], p_pdf boolean, p_cooldown integer, p_quiet_start integer DEFAULT NULL::integer, p_quiet_end integer DEFAULT NULL::integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 perform private.require_cap(p_patient,'notifications.manage');
 insert into public.notification_event_rules(care_recipient_id,event,subject_role,channels,include_pdf,cooldown_minutes,quiet_start,quiet_end)
 values(p_patient,p_event,p_role,p_channels,p_pdf,p_cooldown,p_quiet_start,p_quiet_end)
 on conflict(care_recipient_id,event,subject_role) do update set channels=excluded.channels,include_pdf=excluded.include_pdf,cooldown_minutes=excluded.cooldown_minutes,quiet_start=excluded.quiet_start,quiet_end=excluded.quiet_end;
 insert into public.audit_events(actor_id,action,entity_type,metadata) values(auth.uid(),'notification.rule.changed','notification_rule',jsonb_build_object('care_recipient_id',p_patient,'event',p_event,'role',p_role));
end;$function$
