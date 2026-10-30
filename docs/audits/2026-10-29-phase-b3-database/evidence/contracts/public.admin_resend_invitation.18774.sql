CREATE OR REPLACE FUNCTION public.admin_resend_invitation(p_invitation_id uuid, p_token_hash text, p_expires_at timestamp with time zone)
 RETURNS care_recipient_invitations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.care_recipient_invitations;
begin
  select * into v from public.care_recipient_invitations where id=p_invitation_id for update;
  if not found or not public.recipient_can(v.care_recipient_id,'admin') then raise exception 'invitation not authorized' using errcode='42501';end if;
  if v.status='accepted' or p_token_hash is null or p_token_hash!~'^[a-f0-9]{64}$' or p_expires_at is null or p_expires_at<=now() or p_expires_at>now()+interval '30 days' then raise exception 'invalid invitation renewal';end if;
  update public.care_recipient_invitations set token_hash=p_token_hash,expires_at=p_expires_at,status='pending',invited_by=auth.uid() where id=v.id returning * into v;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'invitation.renewed','invitation',v.id,jsonb_build_object('care_recipient_id',v.care_recipient_id));return v;
end; $function$
