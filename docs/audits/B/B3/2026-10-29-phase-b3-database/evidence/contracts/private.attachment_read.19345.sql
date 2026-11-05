CREATE OR REPLACE FUNCTION private.attachment_read(p_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.attachments a left join public.operational_documents d on d.id=a.document_id where a.id=p_id and
 case when d.id is not null then private.can(a.care_recipient_id,lower(d.type)||'.read') else private.can(a.care_recipient_id,'stock.family.read') end
 and (a.state='ready' or a.uploaded_by=auth.uid()));
$function$
