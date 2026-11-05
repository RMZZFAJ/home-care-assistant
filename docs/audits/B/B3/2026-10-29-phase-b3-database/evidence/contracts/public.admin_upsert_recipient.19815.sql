CREATE OR REPLACE FUNCTION public.admin_upsert_recipient(p_id uuid, p_display_name text, p_is_active boolean, p_is_development boolean)
 RETURNS care_recipients
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if p_id is not null and not public.can_manage_recipient(p_id) then raise exception 'global patient changes require local approval' using errcode='42501';end if;
 return public.v3_admin_upsert_recipient(p_id,p_display_name,p_is_active,p_is_development);
end;$function$
