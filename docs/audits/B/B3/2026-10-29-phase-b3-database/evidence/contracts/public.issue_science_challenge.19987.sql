CREATE OR REPLACE FUNCTION public.issue_science_challenge(p_notification uuid, p_worker uuid, p_hash text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n public.requisition_notifications;s public.requisition_lifecycle;d public.operational_documents;phone text;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' or not public.validate_notification_job(p_notification,p_worker) then raise exception 'verified worker required' using errcode='42501';end if;
 select * into n from public.requisition_notifications where id=p_notification;
 select * into d from public.operational_documents where id=n.document_id;
 select * into s from public.requisition_lifecycle where requisition_id=d.id;
 if d.type<>'REQ' or d.status='cancelled' or n.event_key<>'req.issued' or not(n.recipient_user_id=any(s.eligible_users))
 or not coalesce((s.policy->>'scienceWhatsApp')::boolean,false)
 or not coalesce((select (notification_preferences->>'scienceWhatsApp')::boolean from public.profiles where id=n.recipient_user_id),false)
 or not private.member_can(d.care_recipient_id,n.recipient_user_id,'req.science')
 or not exists(select 1 from public.document_events where id=n.document_event_id and version=d.version)
 or not exists(select 1 from public.meta_template_versions where name='hca_req_ciencia_simplificada_v4' and approval='APPROVED') then return false;end if;
 select v.phone into phone from public.verified_phones v join auth.users u on u.id=v.user_id where v.user_id=n.recipient_user_id and u.phone_confirmed_at is not null and '+'||ltrim(u.phone,'+')=v.phone and ltrim(v.phone,'+')=ltrim(n.destination,'+');
 if phone is null then return false;end if;
 insert into public.science_challenges(notification_id,document_id,recipient_id,token_hash,phone,document_version,expires_at) values(n.id,d.id,n.recipient_user_id,p_hash,phone,d.version,now()+interval '10 minutes');return true;
end;$function$
