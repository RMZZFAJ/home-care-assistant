CREATE OR REPLACE FUNCTION private.immutable_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin raise exception 'confirmed event is immutable' using errcode='42501';end;$function$
