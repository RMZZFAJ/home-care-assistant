CREATE OR REPLACE FUNCTION private.reject_resolution_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin raise exception 'confirmed item resolution is immutable' using errcode='23514';end;$function$
