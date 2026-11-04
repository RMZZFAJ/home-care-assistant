CREATE OR REPLACE FUNCTION public.fluent_pre_shift_create(p_patient uuid, p_type text, p_payload jsonb, p_key uuid, p_draft boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin perform private.validate_shared_need(p_payload);return public.v3_create_supply_document(p_patient,p_type,p_payload,p_key,p_draft);end;$function$
