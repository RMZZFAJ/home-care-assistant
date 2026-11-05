CREATE OR REPLACE FUNCTION public.fluent_pre_shift_scheduler()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare result jsonb;n integer;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'worker authorization required' using errcode='42501';end if;
 result:=public.v4_lifecycle_schedule();n:=private.enqueue_scheduled_reminders();return result||jsonb_build_object('scheduledReminders',n);
end;$function$
