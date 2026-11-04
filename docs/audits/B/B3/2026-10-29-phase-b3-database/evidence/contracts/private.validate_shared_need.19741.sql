CREATE OR REPLACE FUNCTION private.validate_shared_need(p_payload jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare x jsonb;begin
 for x in select value from jsonb_array_elements(coalesce(p_payload->'lines','[]')) loop
 if jsonb_array_length(coalesce(x->'requisitionItemIds','[]'))>1 and length(trim(coalesce(x->'metadata'->>'sharedNeedReason',''))) not between 3 and 500 then raise exception 'shared need justification required';end if;
 end loop;
end;$function$
