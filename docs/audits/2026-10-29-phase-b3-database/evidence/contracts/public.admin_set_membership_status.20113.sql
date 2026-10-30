CREATE OR REPLACE FUNCTION public.admin_set_membership_status(p_care_recipient_id uuid, p_user_id uuid, p_status text)
 RETURNS care_recipient_memberships
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if not public.can_manage_recipient(p_care_recipient_id) then raise exception 'local administrator required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_care_recipient_id,0));
 return public.v4_admin_set_membership_status(p_care_recipient_id,p_user_id,p_status);
end;$function$
