CREATE OR REPLACE FUNCTION public.scheduler_health()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
 return coalesce((select to_jsonb(h) from private.scheduler_health h),'{}');end;$function$
