CREATE OR REPLACE FUNCTION public.patient_notification_rules(p_patient uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if not private.can(p_patient,'notifications.manage') and not public.is_global_administrator() then raise exception 'notification administration required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(r) order by event,subject_role) from public.notification_event_rules r where care_recipient_id=p_patient),'[]');
end;$function$
