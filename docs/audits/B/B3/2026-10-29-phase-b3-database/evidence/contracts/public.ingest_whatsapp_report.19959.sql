CREATE OR REPLACE FUNCTION public.ingest_whatsapp_report(p_provider_id text, p_phone text, p_text text, p_lines jsonb, p_kind text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c jsonb;result jsonb;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'webhook worker required' using errcode='42501';end if;
 c:=public.inbound_report_context(p_phone);if c is null then return jsonb_build_object('needsAuthenticatedSelection',true);end if;
 insert into private.worker_authority values(pg_backend_pid(),txid_current(),(c->>'userId')::uuid,(c->>'patientId')::uuid,'pending_whatsapp_report');
 result:=public.v3_ingest_whatsapp_report(p_provider_id,p_phone,p_text,p_lines,p_kind);
 delete from private.worker_authority where backend_pid=pg_backend_pid() and transaction_id=txid_current();return result;
end;$function$
