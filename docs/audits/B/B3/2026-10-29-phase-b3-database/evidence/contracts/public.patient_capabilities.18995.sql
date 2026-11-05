CREATE OR REPLACE FUNCTION public.patient_capabilities(p_patient uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select coalesce(jsonb_object_agg(code,private.can(p_patient,code)),'{}') from public.capability_definitions
 where public.can_access_recipient(p_patient);
$function$
