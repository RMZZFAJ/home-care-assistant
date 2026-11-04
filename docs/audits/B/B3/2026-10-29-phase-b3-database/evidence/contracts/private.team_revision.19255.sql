CREATE OR REPLACE FUNCTION private.team_revision(p_patient uuid)
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select coalesce(max(movement_revision),0) from public.stock_movements where care_recipient_id=p_patient and
 (source_location in ('CARE_TEAM','TRANSIT') or destination_location in ('CARE_TEAM','TRANSIT'));
$function$
