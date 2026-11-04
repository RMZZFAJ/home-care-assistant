CREATE OR REPLACE FUNCTION private.schedule_visible(p_patient uuid, p_worker uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select private.can(p_patient,'schedule.read.team') or p_worker=auth.uid() and private.can(p_patient,'schedule.read.own');
$function$
