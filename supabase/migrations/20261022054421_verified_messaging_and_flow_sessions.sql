-- Only Auth-confirmed phone ownership can enable a simplified receipt.
create function public.register_verified_phone() returns void language plpgsql security definer set search_path='' as $$
declare p text;begin
 if not public.recent_session() then raise exception 'recent authentication required' using errcode='42501';end if;
 select '+'||ltrim(phone,'+') into p from auth.users where id=auth.uid() and phone_confirmed_at is not null and length(phone)>7;
 if p is null then raise exception 'confirm phone with Auth OTP first';end if;
 insert into public.verified_phones(user_id,phone) values(auth.uid(),p) on conflict(user_id) do update set phone=excluded.phone,verified_at=now();
end;$$;
create function public.issue_whatsapp_challenge(p_notification uuid,p_worker uuid,p_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
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
end;$$;
create function public.accept_whatsapp_receipt(p_provider_id text,p_phone text,p_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
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
end;$$;
create table public.flow_sessions(id uuid primary key default gen_random_uuid(),care_recipient_id uuid not null references public.care_recipients(id),user_id uuid not null references public.profiles(id),token_hash text not null unique check(token_hash~'^[a-f0-9]{64}$'),expires_at timestamptz not null,used_at timestamptz,created_at timestamptz not null default now());
create table public.flow_submissions(id uuid primary key default gen_random_uuid(),session_id uuid not null unique references public.flow_sessions(id),care_recipient_id uuid not null references public.care_recipients(id),user_id uuid not null references public.profiles(id),body jsonb not null,status text not null default 'pending_confirmation',created_at timestamptz not null default now());
alter table public.flow_sessions enable row level security;alter table public.flow_submissions enable row level security;
grant select on public.flow_submissions to authenticated;
create policy own_flow_submission on public.flow_submissions for select to authenticated using(user_id=auth.uid() and public.can_access_recipient(care_recipient_id));
create function public.create_flow_session(p_patient uuid,p_hash text) returns uuid language plpgsql security definer set search_path='' as $$declare v uuid;begin
 perform private.require_cap(p_patient,'consumption.report');
 if not public.recent_session() or p_hash is null or p_hash!~'^[a-f0-9]{64}$' then raise exception 'recent session required' using errcode='42501';end if;
 insert into public.flow_sessions(care_recipient_id,user_id,token_hash,expires_at) values(p_patient,auth.uid(),p_hash,now()+interval '20 minutes') returning id into v;return v;
end;$$;
create function public.flow_exchange(p_hash text,p_submit jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.flow_sessions;v uuid;begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'verified flow endpoint required' using errcode='42501';end if;
 select * into s from public.flow_sessions where token_hash=p_hash for update;
 if not found or s.expires_at<=now() or not private.user_can(s.care_recipient_id,s.user_id,'consumption.report') then raise exception 'flow session expired or revoked' using errcode='42501';end if;
 if p_submit is null then
 if s.used_at is not null then raise exception 'flow token used' using errcode='42501';end if;
 return jsonb_build_object('catalog',coalesce((select jsonb_agg(jsonb_build_object('id',product_id,'title',name,'unit',unit)) from public.care_recipient_products where care_recipient_id=s.care_recipient_id and is_active),'[]'));end if;
 if s.used_at is not null then
 if exists(select 1 from public.flow_submissions where session_id=s.id and body=p_submit) then return jsonb_build_object('pendingConfirmation',true);end if;
 raise exception 'flow replay conflict' using errcode='42501';end if;
 if jsonb_typeof(p_submit) is distinct from 'object' or length(p_submit::text)>10000 then raise exception 'invalid flow submission';end if;
 insert into public.flow_submissions(session_id,care_recipient_id,user_id,body) values(s.id,s.care_recipient_id,s.user_id,p_submit) returning id into v;
 update public.flow_sessions set used_at=now() where id=s.id;
 return jsonb_build_object('pendingConfirmation',true,'submissionId',v);
end;$$;
create function public.inbound_report_context(p_phone text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid;p uuid;begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'webhook worker required' using errcode='42501';end if;
 select v.user_id into u from public.verified_phones v join auth.users a on a.id=v.user_id where v.phone='+'||ltrim(p_phone,'+') and '+'||ltrim(a.phone,'+')=v.phone and a.phone_confirmed_at is not null;
 if u is null or (select count(*) from public.care_recipient_memberships where user_id=u and status='active' and private.user_can(care_recipient_id,u,'consumption.report'))<>1 then return null;end if;
 select care_recipient_id into p from public.care_recipient_memberships where user_id=u and status='active' and private.user_can(care_recipient_id,u,'consumption.report');
 return jsonb_build_object('patientId',p,'userId',u,'catalog',coalesce((select jsonb_agg(jsonb_build_object('id',product_id,'name',name,'aliases',aliases,'unit',unit)) from public.care_recipient_products where care_recipient_id=p and is_active),'[]'));
end;$$;
create function public.ingest_whatsapp_report(p_provider_id text,p_phone text,p_text text,p_lines jsonb,p_kind text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c jsonb;claims text;sub text;v uuid;k uuid;begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'webhook worker required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('inbound:'||p_provider_id,0));
 if exists(select 1 from public.inbound_messages where provider_id=p_provider_id) then return jsonb_build_object('duplicate',true);end if;
 c:=public.inbound_report_context(p_phone);if c is null then return jsonb_build_object('needsAuthenticatedSelection',true);end if;
 k:=gen_random_uuid();claims:=current_setting('request.jwt.claims',true);sub:=current_setting('request.jwt.claim.sub',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c->>'userId','role','authenticated')::text,true);perform set_config('request.jwt.claim.sub',c->>'userId',true);
 v:=public.report_extraordinary_consumption((c->>'patientId')::uuid,p_kind,'CARE_TEAM',p_text,p_lines,k);
 perform set_config('request.jwt.claims',coalesce(claims,''),true);perform set_config('request.jwt.claim.sub',coalesce(sub,''),true);
 insert into public.inbound_messages values(p_provider_id,encode(extensions.digest(p_phone,'sha256'),'hex'),'report','pending_confirmation',now());return jsonb_build_object('reportId',v,'pendingConfirmation',true);
end;$$;
grant execute on function public.register_verified_phone(),public.create_flow_session(uuid,text) to authenticated;
grant execute on function public.issue_whatsapp_challenge(uuid,uuid,text),public.accept_whatsapp_receipt(text,text,text),public.flow_exchange(text,jsonb),public.inbound_report_context(text),public.ingest_whatsapp_report(text,text,text,jsonb,text) to service_role;
create function public.notification_safe_failure(p_reference text,p_code text) returns void language plpgsql security definer set search_path='' as $$begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'verified provider worker required' using errcode='42501';end if;
 if p_code<>'META_COUNTRY_RESTRICTED_130497' then raise exception 'unknown safe provider code';end if;
 update public.requisition_notifications set last_error=p_code where provider_reference=p_reference and state='failed';
end;$$;
grant execute on function public.notification_safe_failure(text,text) to service_role;

