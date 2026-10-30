CREATE OR REPLACE FUNCTION public.notification_job_state(p_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(auth.role(),'')<>'service_role' and not coalesce(public.is_global_administrator(),false) then
    raise exception 'worker authorization required' using errcode='42501';
  end if;
  return (select state from public.requisition_notifications where id=p_id);
end;$function$
