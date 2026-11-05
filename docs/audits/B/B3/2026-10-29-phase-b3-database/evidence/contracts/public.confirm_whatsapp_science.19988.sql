CREATE OR REPLACE FUNCTION public.confirm_whatsapp_science(p_provider_id text, p_phone text, p_hash text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.science_challenges;d public.operational_documents;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'verified webhook required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('inbound:'||p_provider_id,0));
 if exists(select 1 from public.inbound_messages where provider_id=p_provider_id) then return false;end if;
 select * into c from public.science_challenges where token_hash=p_hash for update;
 if not found or c.used_at is not null or c.expires_at<=now() or c.phone<>'+'||ltrim(p_phone,'+') then return false;end if;
 select * into strict d from public.operational_documents where id=c.document_id;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||d.care_recipient_id,0));
 select * into strict d from public.operational_documents where id=c.document_id for update;
 if d.status='cancelled' or d.version<>c.document_version or not exists(select 1 from public.verified_phones v join auth.users u on u.id=v.user_id where v.user_id=c.recipient_id and v.phone=c.phone and '+'||ltrim(u.phone,'+')=v.phone and u.phone_confirmed_at is not null)
 or not coalesce((select (notification_preferences->>'scienceWhatsApp')::boolean from public.profiles where id=c.recipient_id),false) then return false;end if;
 if not private.record_science(d.id,c.recipient_id,'whatsapp_confirm',jsonb_build_object('providerId',p_provider_id,'notificationId',c.notification_id,'documentVersion',c.document_version,'challengeId',c.id)) then return false;end if;
 update public.science_challenges set used_at=now() where id=c.id;
 insert into public.inbound_messages values(p_provider_id,encode(extensions.digest(p_phone,'sha256'),'hex'),'science','processed',now());return true;
end;$function$
