CREATE OR REPLACE FUNCTION public.register_document_render(p_document uuid, p_version integer, p_renderer integer, p_path text, p_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.document_pdf_renders;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'PDF worker required' using errcode='42501';end if;
 if p_path<>p_document::text||'/'||p_version||'/render-'||p_renderer||'.pdf' or not exists(select 1 from public.document_events where document_id=p_document and version=p_version)
 or not exists(select 1 from storage.objects where bucket_id='document-receipts' and name=p_path) then raise exception 'invalid PDF evidence';end if;
 insert into public.document_pdf_renders(document_id,version,renderer,object_path,sha256) values(p_document,p_version,p_renderer,p_path,p_hash) on conflict do nothing;
 select * into strict r from public.document_pdf_renders where document_id=p_document and version=p_version and renderer=p_renderer;
 if r.object_path<>p_path or r.sha256<>p_hash then raise exception 'immutable PDF artifact conflict';end if;
 return to_jsonb(r);
end;$function$
