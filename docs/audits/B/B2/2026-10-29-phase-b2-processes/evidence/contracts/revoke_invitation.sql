CREATE OR REPLACE FUNCTION public.revoke_invitation(p_invitation_id uuid)
 RETURNS care_recipient_invitations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.care_recipient_invitations;
begin
  select * into v from public.care_recipient_invitations where id=p_invitation_id for update;
  if not found or not public.can_manage_recipient(v.care_recipient_id) then raise exception 'invitation not authorized' using errcode='42501';end if;
  if v.status='accepted' then raise exception 'accepted invitation cannot be revoked; revoke the membership';end if;
  update public.care_recipient_invitations set status='revoked' where id=v.id returning * into v;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'invitation.revoked','invitation',v.id,jsonb_build_object('care_recipient_id',v.care_recipient_id));return v;
end; $function$
