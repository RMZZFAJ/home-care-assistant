CREATE OR REPLACE FUNCTION public.v3_admin_upsert_recipient(p_id uuid, p_display_name text, p_is_active boolean, p_is_development boolean)
 RETURNS care_recipients
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.care_recipients;
begin
  if not public.is_global_administrator() and not (p_id is not null and public.can_manage_recipient(p_id)) then
    raise exception 'admin authorization required' using errcode='42501'; end if;
  if p_display_name is null or length(trim(p_display_name)) not between 2 and 160 then raise exception 'invalid recipient'; end if;
  insert into public.care_recipients(id,display_name,is_active,is_development)
  values(coalesce(p_id,gen_random_uuid()),trim(p_display_name),p_is_active,p_is_development)
  on conflict(id) do update set display_name=excluded.display_name,is_active=excluded.is_active,is_development=excluded.is_development returning * into v;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'recipient.updated','care_recipient',v.id,jsonb_build_object('care_recipient_id',v.id,'is_active',v.is_active));
  return v;
end; $function$
