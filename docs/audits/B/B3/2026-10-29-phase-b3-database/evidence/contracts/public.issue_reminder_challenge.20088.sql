CREATE OR REPLACE FUNCTION public.issue_reminder_challenge(p_notification uuid, p_worker uuid, p_hash text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n public.requisition_notifications;phone text;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' or not public.validate_notification_job(p_notification,p_worker) then raise exception 'verified worker required' using errcode='42501';end if;
 select * into n from public.requisition_notifications where id=p_notification;
 if n.event_key<>'shift.reminder' or not exists(select 1 from public.operational_reminders where id=n.reminder_id and user_id=n.recipient_user_id and kind='shift' and acknowledged_at is null) then return false;end if;
 select v.phone into phone from public.verified_phones v join auth.users u on u.id=v.user_id where v.user_id=n.recipient_user_id and u.phone_confirmed_at is not null and '+'||ltrim(u.phone,'+')=v.phone and ltrim(v.phone,'+')=ltrim(n.destination,'+');
 if phone is null then return false;end if;
 insert into public.reminder_challenges(reminder_id,user_id,phone,token_hash,expires_at) values(n.reminder_id,n.recipient_user_id,phone,p_hash,now()+interval '20 minutes');return true;
end;$function$
