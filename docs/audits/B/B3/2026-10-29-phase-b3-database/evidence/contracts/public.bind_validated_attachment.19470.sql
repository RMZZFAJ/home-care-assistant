CREATE OR REPLACE FUNCTION public.bind_validated_attachment(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare a public.attachments;d public.operational_documents;begin
 select * into strict a from public.attachments where id=p_id;
 if a.state<>'ready' or a.uploaded_by<>auth.uid() then raise exception 'validated evidence owner required' using errcode='42501';end if;
 if a.document_id is null then return;end if;
 select * into strict d from public.operational_documents where id=a.document_id for update;
 perform private.require_cap(d.care_recipient_id,lower(d.type)||'.read');
 if exists(select 1 from public.document_events where document_id=d.id and action='attachment.bound' and body->'event'->>'attachmentId'=p_id::text) then return;end if;
 update public.operational_documents set version=version+1 where id=d.id;
 perform private.record_document_event(d.id,'attachment.bound',jsonb_build_object('attachmentId',p_id,'sha256',a.sha256),p_id);
end;$function$
