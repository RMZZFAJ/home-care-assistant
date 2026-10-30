CREATE OR REPLACE FUNCTION private.reconcile_declined_membership_invitation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if new.status='revoked' and old.status is distinct from new.status then update public.access_change_requests set status='rejected',resolution=resolution||jsonb_build_object('invitationRevokedAt',now()) where status='awaiting_acceptance' and resolution->>'invitationId'=new.id::text;end if;return null;
end;$function$
