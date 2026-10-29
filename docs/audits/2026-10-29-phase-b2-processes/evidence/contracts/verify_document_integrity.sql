CREATE OR REPLACE FUNCTION public.verify_document_integrity(p_id uuid, p_version integer, p_hash text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select coalesce(p_hash~'^[a-f0-9]{64}$' and exists(select 1 from public.document_events where document_id=p_id and version=p_version and content_hash=p_hash),false);
$function$
