CREATE OR REPLACE FUNCTION public.accept_invitation(p_token_hash text)
 RETURNS care_recipient_memberships
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result public.care_recipient_memberships;invitation uuid;begin
 result:=public.v4_accept_invitation(p_token_hash);
 select id into invitation from public.care_recipient_invitations where token_hash=p_token_hash and status='accepted';
 update public.access_change_requests set status='applied',resolution=resolution||jsonb_build_object('acceptedAt',now()) where status='awaiting_acceptance' and resolution->>'invitationId'=invitation::text;
 return result;
end;$function$
