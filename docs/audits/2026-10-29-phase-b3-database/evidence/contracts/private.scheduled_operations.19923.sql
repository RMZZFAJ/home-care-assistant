CREATE OR REPLACE FUNCTION private.scheduled_operations()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare prior text:=current_setting('request.jwt.claims',true);begin
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 perform public.run_operational_schedule();perform private.deliver_internal_notifications();
 perform set_config('request.jwt.claims',coalesce(prior,''),true);
exception when others then perform set_config('request.jwt.claims',coalesce(prior,''),true);raise;
end;$function$
