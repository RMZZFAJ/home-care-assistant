CREATE OR REPLACE FUNCTION private.whatsapp_event_supported(p_event text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 select coalesce(p_event=any(array['stock.alert','occurrence.received','bal.reminder','shift.reminder','req.issued','req.registered_author','req.fulfillment_updated','req.science_satisfied','req.completed','req.reminder','com.issued','com.submit','com.receive','com.validate_receipt','ent.issued','ent.submit','ent.receive','ent.resolve','ent.reminder','ent.cancel','bal.issued','bal.approve','com.revised','ent.revised','bal.recount']),false);
$function$
