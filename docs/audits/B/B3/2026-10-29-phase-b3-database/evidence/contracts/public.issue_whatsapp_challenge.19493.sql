CREATE OR REPLACE FUNCTION public.issue_whatsapp_challenge(p_notification uuid, p_worker uuid, p_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n public.requisition_notifications;d public.operational_documents;p text;begin
 if coalesce(auth.role(),'')<>'service_role' or not public.validate_notification_job(p_notification,p_worker) then raise exception 'verified worker required' using errcode='42501';end if;
 if p_hash is null or p_hash!~'^[a-f0-9]{64}$' then raise exception 'invalid challenge hash';end if;
 select * into n from public.requisition_notifications where id=p_notification;
 select * into d from public.operational_documents where id=n.document_id;
 if d.type<>'ENT' or d.status<>'pending_receipt' or d.recipient_id<>n.recipient_user_id or not private.user_can(d.care_recipient_id,d.recipient_id,'ent.receive')
 or not coalesce((select (settings->>'whatsappSimpleAcceptance')::boolean from public.patient_settings where care_recipient_id=d.care_recipient_id),false)
 or not exists(select 1 from public.document_events where id=n.document_event_id and version=d.version) then return null;end if;
 select v.phone into p from public.verified_phones v join auth.users u on u.id=v.user_id and '+'||ltrim(u.phone,'+')=v.phone and u.phone_confirmed_at is not null where v.user_id=d.recipient_id;
 if p is null or ltrim(p,'+')<>ltrim(n.destination,'+') then return null;end if;
 insert into public.whatsapp_challenges(document_id,recipient_id,token_hash,phone,expires_at,document_version) values(d.id,d.recipient_id,p_hash,p,now()+interval '10 minutes',d.version);
 return jsonb_build_object('enabled',true);
end;$function$
