CREATE OR REPLACE FUNCTION public.decline_invitation(p_token_hash text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare i public.care_recipient_invitations;begin
 if private.auth_session() is null then raise exception 'active Auth session required' using errcode='42501';end if;
 select * into i from public.care_recipient_invitations where token_hash=p_token_hash;
 if not found then raise exception 'invalid invitation' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||i.care_recipient_id,0));
 select * into strict i from public.care_recipient_invitations where id=i.id for update;
 if i.status<>'pending' or i.expires_at<=now() or not exists(select 1 from auth.users where id=auth.uid() and lower(email)=i.email and email_confirmed_at is not null) then raise exception 'invalid invitation' using errcode='42501';end if;
 update public.care_recipient_invitations set status='revoked' where id=i.id;
 update public.access_change_requests set status='rejected',resolution=resolution||jsonb_build_object('declinedAt',now()) where status='awaiting_acceptance' and resolution->>'invitationId'=i.id::text;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'invitation.declined','invitation',i.id,jsonb_build_object('care_recipient_id',i.care_recipient_id));return true;
end;$function$
