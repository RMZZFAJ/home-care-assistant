CREATE OR REPLACE FUNCTION public.patient_capability_definitions(p_patient uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if not private.can(p_patient,'access.manage') then raise exception 'patient administration authorization required' using errcode='42501';end if;
 return private.capability_definition_rows(p_patient);
end;$function$
