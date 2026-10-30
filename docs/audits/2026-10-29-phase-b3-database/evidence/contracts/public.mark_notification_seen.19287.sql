CREATE OR REPLACE FUNCTION public.mark_notification_seen(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 update public.requisition_notifications set seen_at=coalesce(seen_at,now()) where id=p_id and recipient_user_id=auth.uid() and public.can_access_recipient(care_recipient_id);
 if not found then raise exception 'notification not found' using errcode='42501';end if;
end;$function$
