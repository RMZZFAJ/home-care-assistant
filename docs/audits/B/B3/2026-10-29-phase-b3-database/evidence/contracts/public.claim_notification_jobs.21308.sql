CREATE OR REPLACE FUNCTION public.claim_notification_jobs(p_limit integer, p_worker_id uuid, p_external_enabled boolean DEFAULT false)
 RETURNS SETOF requisition_notifications
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare attempt integer;
begin
 if not public.is_global_administrator() and coalesce(auth.role(),'')<>'service_role' then
  raise exception 'worker authorization required' using errcode='42501';
 end if;
 if p_worker_id is null then raise exception 'worker identity required';end if;
 for attempt in 1..3 loop
  begin
   return query select * from public.fluent_pre_retry_claim_jobs(p_limit,p_worker_id,p_external_enabled);
   return;
  exception when deadlock_detected then
   if attempt=3 then raise;end if;
   perform pg_catalog.pg_sleep(0.01*attempt+pg_catalog.random()*0.02);
  end;
 end loop;
end;
$function$
