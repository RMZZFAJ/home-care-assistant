CREATE OR REPLACE FUNCTION public.protect_requisition_historical_origin()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.is_historical is distinct from old.is_historical then
    raise exception 'requisition historical origin is immutable' using errcode='23514';
  end if;
  return new;
end; $function$
