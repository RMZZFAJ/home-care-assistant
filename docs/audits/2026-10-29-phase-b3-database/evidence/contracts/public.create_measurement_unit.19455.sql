CREATE OR REPLACE FUNCTION public.create_measurement_unit(p_patient uuid, p_code text, p_name text, p_dimension text, p_decimals integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_id uuid;begin
 if p_patient is null then if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
 else perform private.require_cap(p_patient,'catalog.manage');end if;
 if length(trim(p_code)) not between 1 and 30 or length(trim(p_name)) not between 2 and 80 then raise exception 'invalid unit';end if;
 insert into public.measurement_units(care_recipient_id,code,name,dimension,decimals) values(p_patient,p_code,p_name,p_dimension,p_decimals) returning id into v_id;return v_id;
end;$function$
