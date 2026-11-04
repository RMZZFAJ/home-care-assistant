CREATE OR REPLACE FUNCTION public.admin_create_invitation(p_care_recipient_id uuid, p_email text, p_role profile_role, p_can_manage_stock boolean, p_can_count_stock boolean, p_token_hash text, p_expires_at timestamp with time zone)
 RETURNS care_recipient_invitations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.care_recipient_invitations;
begin
  if not public.recipient_can(p_care_recipient_id,'admin') then raise exception 'invitation admin authorization required' using errcode='42501';end if;
  if p_email is null or length(p_email)>254 or p_email!~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or p_role is null or p_token_hash is null or p_token_hash!~'^[a-f0-9]{64}$' or p_expires_at is null or p_expires_at<=now() or p_expires_at>now()+interval '30 days' then raise exception 'invalid invitation';end if;
  insert into public.care_recipient_invitations(care_recipient_id,email,role,can_manage_stock,can_count_stock,token_hash,expires_at,invited_by)
  values(p_care_recipient_id,lower(trim(p_email)),p_role,p_role<>'reader' and p_can_manage_stock,p_role<>'reader' and p_can_count_stock,p_token_hash,p_expires_at,auth.uid()) returning * into v;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'invitation.created','invitation',v.id,jsonb_build_object('care_recipient_id',p_care_recipient_id,'role',p_role));return v;
end; $function$
