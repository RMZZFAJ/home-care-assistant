CREATE OR REPLACE FUNCTION public.update_my_profile(p_name text, p_registration text, p_state text, p_category text, p_preferences jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if auth.uid() is null or length(trim(p_name)) not between 2 and 160 or length(coalesce(p_registration,''))>30 or p_state is not null and p_state!~'^[A-Z]{2}$' or length(coalesce(p_category,''))>80 or jsonb_typeof(p_preferences)<>'object' then raise exception 'invalid profile';end if;
 update public.profiles set full_name=trim(p_name),professional_registration=nullif(trim(p_registration),''),professional_state=p_state,professional_category=p_category,notification_preferences=p_preferences where id=auth.uid() and status='active';
 if not found then raise exception 'profile unavailable' using errcode='42501';end if;
end;$function$
