CREATE OR REPLACE FUNCTION public.notification_safe_failure(p_reference text, p_code text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'verified provider worker required' using errcode='42501';end if;
 if p_code<>'META_COUNTRY_RESTRICTED_130497' then raise exception 'unknown safe provider code';end if;
 update public.requisition_notifications set last_error=p_code where provider_reference=p_reference and state='failed';
end;$function$
