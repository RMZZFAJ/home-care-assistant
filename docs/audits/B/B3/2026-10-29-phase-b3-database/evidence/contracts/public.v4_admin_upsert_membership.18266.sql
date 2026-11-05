CREATE OR REPLACE FUNCTION public.v4_admin_upsert_membership(p_care_recipient_id uuid, p_user_id uuid, p_role profile_role, p_can_manage_stock boolean, p_can_count_stock boolean)
 RETURNS care_recipient_memberships
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.care_recipient_memberships;
begin
  if not public.can_manage_recipient(p_care_recipient_id) then raise exception 'admin authorization required' using errcode='42501';end if;
  -- A local administrator can edit their established memberships. Adding an identity
  -- requires authenticated invitation acceptance, rather than account enumeration.
  if not public.is_global_administrator() and not exists(select 1 from public.care_recipient_memberships where care_recipient_id=p_care_recipient_id and user_id=p_user_id) then raise exception 'invitation acceptance required' using errcode='42501';end if;
  if p_role is null or not exists(select 1 from public.profiles where id=p_user_id and status='active') then raise exception 'invalid membership';end if;
  insert into public.care_recipient_memberships(care_recipient_id,user_id,role,can_manage_stock,can_count_stock)
  values(p_care_recipient_id,p_user_id,p_role,p_role<>'reader' and p_can_manage_stock,p_role<>'reader' and p_can_count_stock)
  on conflict(care_recipient_id,user_id) do update set role=excluded.role,can_manage_stock=excluded.can_manage_stock,can_count_stock=excluded.can_count_stock,status='active' returning * into v;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'membership.updated','care_recipient_membership',v.id,jsonb_build_object('care_recipient_id',p_care_recipient_id,'user_id',p_user_id,'role',p_role));return v;
end; $function$
