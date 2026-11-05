CREATE OR REPLACE FUNCTION public.admin_set_profile(p_user_id uuid, p_full_name text, p_role profile_role, p_status text, p_global_scope boolean)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_profile public.profiles;
begin
  if not public.is_global_administrator() then raise exception 'admin authorization required'; end if;
  if p_status not in ('active', 'revoked') or length(trim(p_full_name)) not between 2 and 160 then
    raise exception 'invalid profile';
  end if;
  update public.profiles
  set full_name = trim(p_full_name), role = p_role, status = p_status,
      global_scope = case when p_role in ('admin', 'supervisor') then p_global_scope else false end
  where id = p_user_id
  returning * into v_profile;
  if not found then raise exception 'profile not found'; end if;
  insert into public.audit_events(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'profile.updated', 'profile', p_user_id,
    jsonb_build_object('role', p_role, 'status', p_status, 'global_scope', p_global_scope));
  return v_profile;
end;
$function$
