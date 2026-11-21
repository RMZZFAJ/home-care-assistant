-- These PDF-only projections previously consulted the interactive document API.
-- A system attachment uses its narrowly validated job scope; peer details and
-- stock still use normal capabilities and remain masked without a human context.
do $l1$
declare signature text;definition text;anchor text:='perform public.operational_document(p_id);';
begin
 foreach signature in array array['private.document_pdf_presentation(uuid,integer,jsonb)','private.document_pdf_lifecycle(uuid,integer)'] loop
  definition:=pg_get_functiondef(signature::regprocedure);
  if position(anchor in definition)=0 then raise exception 'PDF source scope drift';end if;
  execute replace(definition,anchor,'if private.has_pdf_notification_authority(p_id) then perform private.require_pdf_document(p_id);else '||anchor||'end if;');
 end loop;
end;$l1$;
