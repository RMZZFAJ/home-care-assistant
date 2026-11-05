CREATE OR REPLACE FUNCTION public.protect_requisition_identity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ begin
  if (new.protocol,new.protocol_number,new.created_by,new.care_recipient_id,new.idempotency_key,new.request_intent,new.payload_hash)
    is distinct from (old.protocol,old.protocol_number,old.created_by,old.care_recipient_id,old.idempotency_key,old.request_intent,old.payload_hash)
  then raise exception 'requisition identity is immutable'; end if;
  return new;
end; $function$
