-- Tacit SCI may wait for the patient stock lock inside an AFTER trigger.
-- Recheck the original requester's live authority after every nested effect;
-- failure rolls the entire REQ/SCI/outbox transaction back together.
do $migration$
declare definition text;anchor text;
begin
 definition:=pg_get_functiondef('public.submit_requisition(uuid,uuid,text,jsonb,jsonb,jsonb)'::regprocedure);
 anchor:='perform private.record_document_event(d.id,''req.issued'',intent,p_idempotency_key);';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'requisition post-trigger authority anchor mismatch';end if;
 execute replace(definition,anchor,anchor||E'\n perform private.require_cap(p_care_recipient_id,''req.create'');');
end;$migration$;
