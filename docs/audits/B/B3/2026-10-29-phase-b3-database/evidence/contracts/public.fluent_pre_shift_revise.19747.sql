CREATE OR REPLACE FUNCTION public.fluent_pre_shift_revise(p_id uuid, p_payload jsonb, p_key uuid, p_version integer, p_recount boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin perform private.validate_shared_need(p_payload);return public.v3_revise_supply_document(p_id,p_payload,p_key,p_version,p_recount);end;$function$
