CREATE OR REPLACE FUNCTION public.import_historical_requisitions(p_source_hash text, p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;r record;begin
 result:=public.legacy_import_historical_requisitions(p_source_hash,p_rows);
 for r in select q.id from public.requisitions q join jsonb_array_elements(p_rows) z on q.protocol='HC-'||lpad(z->>'physicalProtocol',6,'0') and q.care_recipient_id=(z->>'careRecipientId')::uuid loop perform private.register_legacy_requisition(r.id);end loop;return result;
end;$function$
