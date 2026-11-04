CREATE OR REPLACE FUNCTION private.require_cap(p_patient uuid, p_cap text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if not private.can(p_patient,p_cap) or not exists(select 1 from public.care_recipients where id=p_patient and is_active) then
 raise exception 'required permission: %',p_cap using errcode='42501';end if;
end;$function$
