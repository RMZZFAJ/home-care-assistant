CREATE OR REPLACE FUNCTION public.v4_admin_set_membership_status(p_care_recipient_id uuid, p_user_id uuid, p_status text)
 RETURNS care_recipient_memberships
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.care_recipient_memberships;
begin
  if not public.can_manage_recipient(p_care_recipient_id) then raise exception 'admin authorization required' using errcode='42501'; end if;
  if p_status is null or p_status not in ('active','revoked') then raise exception 'invalid membership status'; end if;
  update public.care_recipient_memberships set status=p_status where care_recipient_id=p_care_recipient_id and user_id=p_user_id returning * into v;
  if not found then raise exception 'membership not found'; end if;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'membership.status.changed','care_recipient_membership',v.id,jsonb_build_object('care_recipient_id',p_care_recipient_id,'user_id',p_user_id,'status',p_status));
  return v;
end; $function$
