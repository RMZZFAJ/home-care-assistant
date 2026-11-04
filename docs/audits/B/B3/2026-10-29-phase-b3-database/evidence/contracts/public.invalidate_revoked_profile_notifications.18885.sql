CREATE OR REPLACE FUNCTION public.invalidate_revoked_profile_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$begin
  if new.status='revoked' then
    update public.requisition_notifications set state=case when state='processing' then 'uncertain' else 'cancelled' end,
      last_error='recipient global account revoked',leased_by=null,lease_expires_at=null
    where recipient_user_id=new.id and state in ('pending','processing');
  end if;return new;
end;$function$
