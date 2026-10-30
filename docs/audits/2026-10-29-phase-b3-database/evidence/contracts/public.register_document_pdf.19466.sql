CREATE OR REPLACE FUNCTION public.register_document_pdf(p_document uuid, p_version integer, p_path text, p_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.document_pdfs;begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'server required' using errcode='42501';end if;
 if p_hash is null or p_hash!~'^[a-f0-9]{64}$' or not exists(select 1 from public.document_events where document_id=p_document and version=p_version) or p_path<>p_document||'/'||p_version||'.pdf' then raise exception 'invalid PDF version';end if;
 insert into public.document_pdfs(document_id,version,object_path,sha256) values(p_document,p_version,p_path,p_hash) on conflict(document_id,version) do nothing;
 select * into strict r from public.document_pdfs where document_id=p_document and version=p_version;
 if r.sha256<>p_hash then raise exception 'PDF immutable';end if;return to_jsonb(r);
end;$function$
