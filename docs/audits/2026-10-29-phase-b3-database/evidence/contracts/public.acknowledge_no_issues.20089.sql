CREATE OR REPLACE FUNCTION public.acknowledge_no_issues(p_provider_id text, p_phone text, p_hash text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.reminder_challenges;r public.operational_reminders;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'verified webhook required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('inbound:'||p_provider_id,0));
 if exists(select 1 from public.inbound_messages where provider_id=p_provider_id) then return false;end if;
 select * into c from public.reminder_challenges where token_hash=p_hash for update;
 if not found or c.used_at is not null or c.expires_at<=now() or c.phone<>'+'||ltrim(p_phone,'+') then return false;end if;
 select * into strict r from public.operational_reminders where id=c.reminder_id for update;
 if r.acknowledged_at is not null or r.user_id<>c.user_id or not private.member_can(r.care_recipient_id,c.user_id,'consumption.report')
 or not exists(select 1 from public.verified_phones v join auth.users u on u.id=v.user_id where v.user_id=c.user_id and v.phone=c.phone and u.phone_confirmed_at is not null and '+'||ltrim(u.phone,'+')=v.phone) then return false;end if;
 update public.reminder_challenges set used_at=now() where id=c.id;
 update public.operational_reminders set acknowledged_at=now() where id=r.id;
 update public.requisition_notifications set seen_at=coalesce(seen_at,now()) where reminder_id=r.id and recipient_user_id=c.user_id;
 insert into public.inbound_messages values(p_provider_id,encode(extensions.digest(p_phone,'sha256'),'hex'),'no_issues','processed',now());
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(c.user_id,'shift.no_issues','reminder',r.id,jsonb_build_object('care_recipient_id',r.care_recipient_id,'stockChanged',false,'providerId',p_provider_id));return true;
end;$function$
