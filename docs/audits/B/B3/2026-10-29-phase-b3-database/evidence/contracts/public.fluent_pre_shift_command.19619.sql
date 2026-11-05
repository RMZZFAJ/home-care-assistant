CREATE OR REPLACE FUNCTION public.fluent_pre_shift_command(p_id uuid, p_action text, p_body jsonb, p_key uuid, p_version integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare provider text:=nullif(current_setting('hca.verified_whatsapp_provider',true),'');begin
 if p_action='receive' and exists(select 1 from public.operational_documents where id=p_id and type='ENT') then
 p_body:=(p_body-'securityLevel'-'providerId')||case when provider is null then jsonb_build_object('securityLevel','authenticated_session')
 else jsonb_build_object('securityLevel','verified_phone_one_time_challenge','providerId',provider) end;
 end if;
 return public.audited_legacy_supply_command(p_id,p_action,p_body,p_key,p_version);
end;$function$
