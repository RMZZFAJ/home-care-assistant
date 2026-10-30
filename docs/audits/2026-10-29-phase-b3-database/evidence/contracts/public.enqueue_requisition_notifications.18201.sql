CREATE OR REPLACE FUNCTION public.enqueue_requisition_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ begin
  if not new.is_historical then perform public.enqueue_patient_event(new.care_recipient_id,new.id,null);end if;return new;
end; $function$
