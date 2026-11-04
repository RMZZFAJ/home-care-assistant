CREATE OR REPLACE FUNCTION public.verified_legacy_whatsapp_receipt(p_provider_id text, p_phone text, p_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.whatsapp_challenges;d public.operational_documents;claims text;sub text;result jsonb;begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'signed webhook worker required' using errcode='42501';end if;
 if p_provider_id is null or length(p_provider_id)>500 or p_phone!~'^[+]?[1-9][0-9]{7,14}$' or p_hash!~'^[a-f0-9]{64}$' then raise exception 'invalid receipt challenge';end if;
 perform pg_advisory_xact_lock(hashtextextended('inbound:'||p_provider_id,0));
 if exists(select 1 from public.inbound_messages where provider_id=p_provider_id) then return jsonb_build_object('duplicate',true);end if;
 select * into c from public.whatsapp_challenges where token_hash=p_hash;
 if not found then return jsonb_build_object('accepted',false);end if;
 select * into d from public.operational_documents where id=c.document_id;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||d.care_recipient_id,0));
 select * into c from public.whatsapp_challenges where id=c.id for update;
 select * into d from public.operational_documents where id=c.document_id for update;
 if c.used_at is not null or c.expires_at<=now() or c.phone<>'+'||ltrim(p_phone,'+') or d.recipient_id<>c.recipient_id or d.version<>c.document_version or d.status<>'pending_receipt'
 or not private.user_can(d.care_recipient_id,c.recipient_id,'ent.receive') or not exists(select 1 from public.verified_phones v join auth.users u on u.id=v.user_id where v.user_id=c.recipient_id and v.phone=c.phone and '+'||ltrim(u.phone,'+')=c.phone and u.phone_confirmed_at is not null)
 or not coalesce((select (settings->>'whatsappSimpleAcceptance')::boolean from public.patient_settings where care_recipient_id=d.care_recipient_id),false) then
 insert into public.inbound_messages values(p_provider_id,encode(extensions.digest(p_phone,'sha256'),'hex'),'receipt','rejected',now());return jsonb_build_object('accepted',false);end if;
 claims:=current_setting('request.jwt.claims',true);sub:=current_setting('request.jwt.claim.sub',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c.recipient_id,'role','authenticated')::text,true);
 perform set_config('request.jwt.claim.sub',c.recipient_id::text,true);
 result:=public.supply_document_command(d.id,'receive',jsonb_build_object('divergences','[]'::jsonb,'securityLevel','verified_phone_one_time_challenge','providerId',p_provider_id),c.id,d.version);
 perform set_config('request.jwt.claims',coalesce(claims,''),true);perform set_config('request.jwt.claim.sub',coalesce(sub,''),true);
 update public.whatsapp_challenges set used_at=now() where id=c.id;
 insert into public.inbound_messages values(p_provider_id,encode(extensions.digest(p_phone,'sha256'),'hex'),'receipt','processed',now());
 return jsonb_build_object('accepted',true,'documentId',d.id);
end;$function$
