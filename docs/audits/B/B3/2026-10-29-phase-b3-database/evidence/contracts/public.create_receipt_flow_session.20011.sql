CREATE OR REPLACE FUNCTION public.create_receipt_flow_session(p_document uuid, p_hash text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d public.operational_documents;phone text;sid uuid;begin
 select * into d from public.operational_documents where id=p_document;
 perform private.require_cap(d.care_recipient_id,'ent.receive');
 if d.type<>'ENT' or d.status<>'pending_receipt' or d.recipient_id<>auth.uid() or not coalesce((select (settings->>'whatsappSimpleAcceptance')::boolean from public.patient_settings where care_recipient_id=d.care_recipient_id),false) then raise exception 'receipt flow authorization required' using errcode='42501';end if;
 select v.phone into phone from public.verified_phones v join auth.users u on u.id=v.user_id where v.user_id=auth.uid() and u.phone_confirmed_at is not null and '+'||ltrim(u.phone,'+')=v.phone;
 if phone is null or p_hash!~'^[a-f0-9]{64}$' then raise exception 'verified phone required' using errcode='42501';end if;
 insert into public.flow_sessions(care_recipient_id,user_id,token_hash,expires_at,purpose,document_id,document_version,verified_phone)
 values(d.care_recipient_id,auth.uid(),p_hash,now()+interval '10 minutes','ent_receipt',d.id,d.version,phone) returning id into sid;return sid;
end;$function$
