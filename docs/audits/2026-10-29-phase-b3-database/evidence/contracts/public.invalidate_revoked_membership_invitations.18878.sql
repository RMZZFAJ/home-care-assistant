CREATE OR REPLACE FUNCTION public.invalidate_revoked_membership_invitations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.status='revoked' then
    update public.care_recipient_invitations set status='revoked' where care_recipient_id=new.care_recipient_id and status='pending' and email=(select lower(email) from auth.users where id=new.user_id);
    update public.requisition_notifications set state=case when state='processing' then 'uncertain' else 'cancelled' end,
      last_error='recipient patient membership revoked',leased_by=null,lease_expires_at=null
    where care_recipient_id=new.care_recipient_id and recipient_user_id=new.user_id and state in ('pending','processing');
  end if;return new;
end;$function$
