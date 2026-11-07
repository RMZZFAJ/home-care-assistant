begin;

create table private.web_push_devices (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id),
 session_id uuid references auth.sessions(id) on delete set null,
 endpoint text not null check(length(endpoint) between 16 and 4096),
 fingerprint text not null unique check(fingerprint ~ '^[a-f0-9]{64}$'),
 p256dh text not null check(p256dh ~ '^B[A-Za-z0-9_-]{86}$'),
 auth_key text not null check(auth_key ~ '^[A-Za-z0-9_-]{22}$'),
 key_version text not null check(key_version ~ '^[A-Za-z0-9_.-]{1,80}$'),
 label text not null check(length(btrim(label)) between 1 and 80),
 state text not null default 'active' check(state in ('active','revoked','expired')),
 enabled boolean not null default true, muted_until timestamptz,
 expires_at timestamptz, consent_at timestamptz not null default clock_timestamp(),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(), accepted_at timestamptz
);
create index web_push_devices_owner on private.web_push_devices(user_id,created_at,id);
create table private.web_push_device_events (
 id uuid primary key default gen_random_uuid(),
 device_id uuid not null references private.web_push_devices(id),
 user_id uuid not null references public.profiles(id),
 event text not null check(event in ('consent','reassigned','revoke','pause','resume','session_revoked','expired')),
 created_at timestamptz not null default clock_timestamp()
);
create table private.web_push_deliveries (
 id uuid primary key default gen_random_uuid(),
 notice_id uuid not null references public.requisition_notifications(id),
 device_id uuid not null references private.web_push_devices(id),
 recipient_user_id uuid not null references public.profiles(id),
 state text not null default 'pending' check(state in ('pending','processing','accepted','expired','cancelled','uncertain','failed')),
 attempts integer not null default 0 check(attempts between 0 and 5),
 next_attempt_at timestamptz not null default clock_timestamp(),
 leased_by uuid, lease_token uuid, lease_expires_at timestamptz, dispatch_started_at timestamptz,
 last_error text, accepted_at timestamptz,
 created_at timestamptz not null default clock_timestamp(),
 unique(notice_id,device_id),
 check(state<>'processing' or (leased_by is not null and lease_token is not null and lease_expires_at is not null))
);
create index web_push_delivery_queue on private.web_push_deliveries(next_attempt_at,created_at,id) where state='pending';
create index web_push_delivery_lease on private.web_push_deliveries(lease_expires_at) where state='processing';
create index web_push_delivery_device on private.web_push_deliveries(device_id,state);
create table private.web_push_attempts (
 id uuid primary key default gen_random_uuid(),
 delivery_id uuid not null references private.web_push_deliveries(id),
 ordinal integer not null check(ordinal between 1 and 5), lease_token uuid not null unique, worker_id uuid not null,
 started_at timestamptz not null default clock_timestamp(), completed_at timestamptz,
 outcome text not null default 'processing' check(outcome in ('processing','accepted','pending','expired','failed','uncertain','cancelled')),
 error_code text, unique(delivery_id,ordinal)
);
alter table private.web_push_devices enable row level security;
alter table private.web_push_device_events enable row level security;
alter table private.web_push_deliveries enable row level security;
alter table private.web_push_attempts enable row level security;
revoke all on private.web_push_devices,private.web_push_device_events,private.web_push_deliveries,private.web_push_attempts from public,anon,authenticated,service_role;

create function private.cancel_web_push(p_device uuid,p_code text) returns void
language sql security definer set search_path='' as $$
 with cancelled as (
  update private.web_push_deliveries set state='cancelled',last_error=p_code,leased_by=null,lease_token=null,lease_expires_at=null
  where device_id=p_device and state in ('pending','processing') returning id
 ) update private.web_push_attempts a set outcome='uncertain',error_code=p_code,completed_at=clock_timestamp()
 from cancelled where a.delivery_id=cancelled.id and a.outcome='processing';
$$;

create function private.require_push_session() returns uuid
language plpgsql security definer set search_path='' as $$
declare sid uuid:=private.auth_session(); begin
 if sid is null then raise exception 'active push session required' using errcode='42501';end if;
 return sid;
end;$$;
create function private.web_push_endpoint_allowed(endpoint text) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(length(endpoint)<=4096 and endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/[^[:space:]#\\]+$',false);
$$;
create function private.web_push_notice_allowed(n public.requisition_notifications) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents;r public.consumption_reports;a public.stock_alert_events;m public.operational_reminders;begin
 if n.channel<>'internal' or n.silent or n.state in ('cancelled','failed') or n.recipient_user_id is null then return false;end if;
 if n.document_id is not null then
  select * into d from public.operational_documents where id=n.document_id and care_recipient_id=n.care_recipient_id;
  return found and private.member_can(n.care_recipient_id,n.recipient_user_id,lower(d.type)||'.read');
 elsif n.requisition_id is not null then
  return exists(select 1 from public.requisitions where id=n.requisition_id and care_recipient_id=n.care_recipient_id) and private.member_can(n.care_recipient_id,n.recipient_user_id,'req.read');
 elsif n.alert_event_id is not null then
  select * into a from public.stock_alert_events where id=n.alert_event_id and care_recipient_id=n.care_recipient_id;
  return found and a.state='open' and private.member_can(n.care_recipient_id,n.recipient_user_id,case when a.location='FAMILY' then 'stock.family.read' else 'stock.team.read' end);
 elsif n.consumption_report_id is not null then
  select * into r from public.consumption_reports where id=n.consumption_report_id and care_recipient_id=n.care_recipient_id;
  return found and private.member_can(n.care_recipient_id,n.recipient_user_id,'consumption.report') and (r.reported_by=n.recipient_user_id or private.member_can(n.care_recipient_id,n.recipient_user_id,'consumption.confirm'));
 elsif n.reminder_id is not null then
  select * into m from public.operational_reminders where id=n.reminder_id and care_recipient_id=n.care_recipient_id;
  return found and m.user_id=n.recipient_user_id and m.acknowledged_at is null and private.reminder_recipient_can(m.id,n.recipient_user_id);
 end if;
 return false;
end;$$;
create function private.web_push_due(n public.requisition_notifications) returns timestamptz
language plpgsql stable security definer set search_path='' as $$
declare r public.notification_event_rules;local_now timestamp:=clock_timestamp() at time zone 'America/Sao_Paulo';h integer:=extract(hour from local_now);begin
 select * into r from public.notification_event_rules where care_recipient_id=n.care_recipient_id
 and event=case n.event_key when 'com.submit' then 'com.issued' when 'ent.submit' then 'ent.issued' else n.event_key end
 and subject_role=(select role::text from public.care_recipient_memberships where care_recipient_id=n.care_recipient_id and user_id=n.recipient_user_id);
 if r.quiet_start is not null and r.quiet_end is not null and
 (r.quiet_start<=r.quiet_end and h>=r.quiet_start and h<r.quiet_end or r.quiet_start>r.quiet_end and (h>=r.quiet_start or h<r.quiet_end)) then
  return (date_trunc('day',local_now)+make_interval(hours=>r.quiet_end)+case when r.quiet_start>r.quiet_end and h>=r.quiet_start then interval '1 day' else interval '0' end) at time zone 'America/Sao_Paulo';
 end if;return clock_timestamp();
end;$$;
create function private.enqueue_web_push() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.channel='internal' and not new.silent and new.recipient_user_id is not null then
  insert into private.web_push_deliveries(notice_id,device_id,recipient_user_id,next_attempt_at)
  select new.id,d.id,d.user_id,private.web_push_due(new) from private.web_push_devices d
  join auth.sessions s on s.id=d.session_id and s.user_id=d.user_id
  where d.user_id=new.recipient_user_id and d.state='active' and d.enabled
  and (d.expires_at is null or d.expires_at>clock_timestamp())
  and (s.not_after is null or s.not_after>clock_timestamp())
  and (d.muted_until is null or d.muted_until<=clock_timestamp())
  and d.consent_at<=new.created_at and private.web_push_notice_allowed(new)
  on conflict(notice_id,device_id) do nothing;
 end if;return new;
end;$$;
create trigger notice_web_push_transport after insert on public.requisition_notifications for each row execute function private.enqueue_web_push();

create function public.my_web_push_devices() returns jsonb
language plpgsql security definer set search_path='' as $$
declare sid uuid:=private.require_push_session();result jsonb;begin
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'label',d.label,'fingerprint',d.fingerprint,
 'state',case when d.state='active' and (s.id is null or s.not_after<=clock_timestamp() or d.expires_at<=clock_timestamp() or exists(select 1 from private.web_push_deliveries j where j.device_id=d.id and j.state='expired' and j.created_at>=d.consent_at)) then 'expired' else d.state end,
 'enabled',d.enabled,'currentSession',coalesce(d.session_id=sid,false),'mutedUntil',d.muted_until,'createdAt',d.created_at,'updatedAt',d.updated_at,
 'acceptedAt',(select max(j.accepted_at) from private.web_push_deliveries j where j.device_id=d.id and j.recipient_user_id=d.user_id)) order by d.created_at,d.id),'[]'::jsonb)
 into result from (
  select x.* from private.web_push_devices x left join auth.sessions a on a.id=x.session_id
  where x.user_id=auth.uid()
  order by (x.state='active' and a.id is not null and (a.not_after is null or a.not_after>clock_timestamp()) and (x.expires_at is null or x.expires_at>clock_timestamp())) desc,x.updated_at desc,x.id
  limit 40
 ) d left join auth.sessions s on s.id=d.session_id;
 return result;
end;$$;
create function public.subscribe_web_push(p_subscription jsonb,p_label text,p_key_version text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare sid uuid:=private.require_push_session();fp text;endpoint text;result private.web_push_devices;old_owner uuid;expiry timestamptz;begin
 if p_subscription is null or jsonb_typeof(p_subscription)<>'object' or (p_subscription-array['endpoint','expirationTime','keys'])<>'{}'::jsonb
 or jsonb_typeof(p_subscription->'keys')<>'object' or ((p_subscription->'keys')-array['p256dh','auth'])<>'{}'::jsonb
 or not private.web_push_endpoint_allowed(p_subscription->>'endpoint')
 or coalesce(p_subscription#>>'{keys,p256dh}','') !~ '^B[A-Za-z0-9_-]{86}$' or coalesce(p_subscription#>>'{keys,auth}','') !~ '^[A-Za-z0-9_-]{22}$'
 or p_label is null or length(btrim(p_label)) not between 1 and 80 or coalesce(p_key_version,'') !~ '^[A-Za-z0-9_.-]{1,80}$' then
 raise exception 'invalid push subscription';end if;
 if p_subscription->'expirationTime' is not null and p_subscription->'expirationTime'<>'null'::jsonb then
  if jsonb_typeof(p_subscription->'expirationTime')<>'number' or (p_subscription->>'expirationTime')::numeric not between 0 and 4102444800000 then raise exception 'invalid push expiration';end if;
  expiry:=to_timestamp((p_subscription->>'expirationTime')::double precision/1000);
  if expiry<=clock_timestamp() then raise exception 'expired push subscription';end if;
 end if;
 endpoint:=p_subscription->>'endpoint';fp:=encode(extensions.digest(endpoint,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('web-push-endpoint:'||fp,0));
 perform pg_advisory_xact_lock(hashtextextended('web-push-owner:'||auth.uid()::text,0));
 sid:=private.require_push_session();
 select * into result from private.web_push_devices where fingerprint=fp for update;old_owner:=result.user_id;
 if found and result.user_id=auth.uid() and result.session_id=sid and result.state='active' and result.enabled
 and result.key_version=p_key_version and result.p256dh=p_subscription#>>'{keys,p256dh}' and result.auth_key=p_subscription#>>'{keys,auth}'
 and result.label=btrim(p_label) and result.expires_at is not distinct from expiry then
  return jsonb_build_object('id',result.id,'fingerprint',result.fingerprint);
 end if;
 if (result.id is null or old_owner<>auth.uid() or result.state<>'active') and
 (select count(*) from private.web_push_devices d join auth.sessions s on s.id=d.session_id where d.user_id=auth.uid() and d.state='active'
  and (s.not_after is null or s.not_after>clock_timestamp()) and (d.expires_at is null or d.expires_at>clock_timestamp()))>=20 then raise exception 'push device limit reached';end if;
 insert into private.web_push_devices(user_id,session_id,endpoint,fingerprint,p256dh,auth_key,key_version,label,expires_at)
 values(auth.uid(),sid,endpoint,fp,p_subscription#>>'{keys,p256dh}',p_subscription#>>'{keys,auth}',p_key_version,btrim(p_label),expiry)
 on conflict(fingerprint) do update set user_id=excluded.user_id,session_id=excluded.session_id,p256dh=excluded.p256dh,auth_key=excluded.auth_key,key_version=excluded.key_version,
 label=excluded.label,expires_at=excluded.expires_at,state='active',enabled=true,muted_until=null,consent_at=clock_timestamp(),updated_at=clock_timestamp()
 returning * into result;
 if old_owner is not null and old_owner<>auth.uid() then
  insert into private.web_push_device_events(device_id,user_id,event) values(result.id,old_owner,'reassigned');
 end if;
 perform private.cancel_web_push(result.id,'DEVICE_RECONFIRMED');
 insert into private.web_push_device_events(device_id,user_id,event) values(result.id,auth.uid(),'consent');
 return jsonb_build_object('id',result.id,'fingerprint',result.fingerprint);
end;$$;
create function public.web_push_device_command(p_id uuid,p_action text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare sid uuid:=private.require_push_session();d private.web_push_devices;begin
 select * into d from private.web_push_devices where id=p_id and user_id=auth.uid() for update;
 if not found then raise exception 'push device unavailable' using errcode='42501';end if;
 perform private.require_push_session();
 if p_action not in ('revoke','pause','resume') or p_action is null then raise exception 'invalid push action';end if;
 if p_action<>'revoke' and (d.state<>'active' or d.session_id is null or d.expires_at<=clock_timestamp() or not exists(select 1 from auth.sessions where id=d.session_id and (not_after is null or not_after>clock_timestamp()))) then raise exception 'push device requires consent';end if;
 update private.web_push_devices set state=case when p_action='revoke' then 'revoked' else state end,
 enabled=p_action<>'revoke',muted_until=case when p_action='pause' then clock_timestamp()+interval '8 hours' else null end,updated_at=clock_timestamp() where id=d.id;
 perform private.cancel_web_push(d.id,'DEVICE_PREFERENCE_CHANGED');
 insert into private.web_push_device_events(device_id,user_id,event) values(d.id,auth.uid(),p_action);
 return jsonb_build_object('id',d.id,'action',p_action);
end;$$;
create function public.revoke_web_push_session() returns void
language plpgsql security definer set search_path='' as $$
declare sid uuid:=private.require_push_session();d record;begin
 for d in update private.web_push_devices set state='revoked',enabled=false,updated_at=clock_timestamp() where user_id=auth.uid() and session_id=sid and state='active' returning id loop
  insert into private.web_push_device_events(device_id,user_id,event) values(d.id,auth.uid(),'session_revoked');
  perform private.cancel_web_push(d.id,'SESSION_REVOKED');
 end loop;
end;$$;

create function public.claim_web_push_deliveries(p_limit integer,p_worker uuid,p_key_version text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;expired_device record;begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'push worker required' using errcode='42501';end if;
 if p_limit is null or p_limit not between 1 and 50 or p_worker is null or coalesce(p_key_version,'') !~ '^[A-Za-z0-9_.-]{1,80}$' then raise exception 'invalid push claim';end if;
 for expired_device in update private.web_push_devices x set state='expired',enabled=false,updated_at=clock_timestamp()
 where x.id in (select a.id from private.web_push_devices a where a.state='active'
 and (a.expires_at<=clock_timestamp() or exists(select 1 from private.web_push_deliveries j where j.device_id=a.id and j.state='expired' and j.created_at>=a.consent_at))
 order by a.id for update skip locked limit 100) returning x.id,x.user_id loop
  insert into private.web_push_device_events(device_id,user_id,event) values(expired_device.id,expired_device.user_id,'expired');
  perform private.cancel_web_push(expired_device.id,'SUBSCRIPTION_EXPIRED');
 end loop;
 update private.web_push_attempts a set outcome='uncertain',error_code='LEASE_EXPIRED',completed_at=clock_timestamp()
 from private.web_push_deliveries j where j.id=a.delivery_id and j.lease_token=a.lease_token and j.state='processing' and j.lease_expires_at<=clock_timestamp() and a.outcome='processing';
 update private.web_push_deliveries set state=case when dispatch_started_at is null then 'pending' else 'uncertain' end,
 last_error='LEASE_EXPIRED',leased_by=null,lease_token=null,lease_expires_at=null where state='processing' and lease_expires_at<=clock_timestamp();
 with unavailable as (
  select j.id from private.web_push_deliveries j join private.web_push_devices d on d.id=j.device_id
  left join auth.sessions s on s.id=d.session_id and s.user_id=d.user_id
  where j.state='pending' and (d.user_id<>j.recipient_user_id or d.state<>'active' or not d.enabled or d.key_version<>p_key_version
  or d.expires_at<=clock_timestamp() or s.id is null or s.not_after<=clock_timestamp())
  order by j.created_at,j.id for update of j skip locked limit 100
 ) update private.web_push_deliveries j set state='cancelled',last_error='DEVICE_OR_SESSION_UNAVAILABLE' from unavailable where j.id=unavailable.id;
 with chosen as (
  select j.id from private.web_push_deliveries j join public.requisition_notifications n on n.id=j.notice_id
  join private.web_push_devices d on d.id=j.device_id join auth.sessions s on s.id=d.session_id and s.user_id=d.user_id
  where j.state='pending' and j.next_attempt_at<=clock_timestamp() and j.attempts<5 and n.state='delivered'
  and d.user_id=j.recipient_user_id and d.state='active' and d.enabled and d.key_version=p_key_version
  and (d.expires_at is null or d.expires_at>clock_timestamp()) and (s.not_after is null or s.not_after>clock_timestamp())
  and (d.muted_until is null or d.muted_until<=clock_timestamp())
  order by j.next_attempt_at,j.created_at,j.id for update of j skip locked limit p_limit
 ), claimed as (
  update private.web_push_deliveries j set state='processing',leased_by=p_worker,lease_token=gen_random_uuid(),lease_expires_at=clock_timestamp()+interval '2 minutes',dispatch_started_at=null
  from chosen where j.id=chosen.id returning j.id,j.lease_token
 ) select coalesce(jsonb_agg(jsonb_build_object('id',id,'leaseToken',lease_token)),'[]'::jsonb) into result from claimed;
 return result;
end;$$;
create function public.prepare_web_push_delivery(p_id uuid,p_worker uuid,p_token uuid,p_key_version text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j private.web_push_deliveries;d private.web_push_devices;n public.requisition_notifications;due timestamptz;begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'push worker required' using errcode='42501';end if;
 select * into j from private.web_push_deliveries where id=p_id and leased_by=p_worker and lease_token=p_token and state='processing' and lease_expires_at>clock_timestamp() for update;
 if not found or j.dispatch_started_at is not null then return null;end if;
 select * into d from private.web_push_devices where id=j.device_id;
 select * into n from public.requisition_notifications where id=j.notice_id;
 if d.user_id<>j.recipient_user_id or d.state<>'active' or not d.enabled or d.key_version is distinct from p_key_version
 or d.expires_at<=clock_timestamp() or d.muted_until>clock_timestamp() or n.state<>'delivered' or not private.web_push_notice_allowed(n)
 or not exists(select 1 from auth.sessions where id=d.session_id and user_id=d.user_id and (not_after is null or not_after>clock_timestamp())) then
  update private.web_push_deliveries set state='cancelled',last_error='RECIPIENT_OR_DEVICE_UNAVAILABLE',leased_by=null,lease_token=null,lease_expires_at=null where id=j.id;return null;
 end if;
 due:=private.web_push_due(n);
 if due>clock_timestamp() then update private.web_push_deliveries set state='pending',next_attempt_at=due,leased_by=null,lease_token=null,lease_expires_at=null where id=j.id;return null;end if;
 update private.web_push_deliveries set attempts=attempts+1,dispatch_started_at=clock_timestamp() where id=j.id returning * into j;
 insert into private.web_push_attempts(delivery_id,ordinal,lease_token,worker_id) values(j.id,j.attempts,j.lease_token,j.leased_by);
 return jsonb_build_object('id',j.id,'subscription',jsonb_build_object('endpoint',d.endpoint,'keys',jsonb_build_object('p256dh',d.p256dh,'auth',d.auth_key)));
end;$$;
create function public.complete_web_push_delivery(p_id uuid,p_worker uuid,p_token uuid,p_result text,p_error text default null) returns text
language plpgsql security definer set search_path='' as $$
declare j private.web_push_deliveries;v_outcome text;begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'push worker required' using errcode='42501';end if;
 if p_result is null or p_result not in ('accepted','pending','expired','failed','uncertain') or p_error is not null and p_error !~ '^[A-Z0-9_]{1,80}$' then raise exception 'invalid push result';end if;
 select * into j from private.web_push_deliveries where id=p_id for update;
 if not found then raise exception 'push delivery unavailable';end if;
 if j.state<>'processing' then
  update private.web_push_attempts set outcome=p_result,error_code=p_error,completed_at=clock_timestamp()
  where delivery_id=j.id and lease_token=p_token and worker_id=p_worker and outcome in ('processing','uncertain');
  return j.state;
 end if;
 if j.leased_by is distinct from p_worker or j.lease_token is distinct from p_token or j.dispatch_started_at is null or j.lease_expires_at<=clock_timestamp() then raise exception 'push lease unavailable' using errcode='42501';end if;
 v_outcome:=case when p_result='pending' and j.attempts>=5 then 'failed' else p_result end;
 update private.web_push_attempts set outcome=v_outcome,error_code=p_error,completed_at=clock_timestamp() where delivery_id=j.id and lease_token=p_token and outcome='processing';
 update private.web_push_deliveries set state=v_outcome,last_error=p_error,
 next_attempt_at=case when v_outcome='pending' then clock_timestamp()+make_interval(secs=>least(3600,30*power(2,j.attempts)::integer)) else next_attempt_at end,
 accepted_at=case when v_outcome='accepted' then clock_timestamp() else accepted_at end,leased_by=null,lease_token=null,lease_expires_at=null where id=j.id;
 return v_outcome;
end;$$;
create function public.resolve_web_push(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare sid uuid:=private.require_push_session();n public.requisition_notifications;begin
 select q.* into n from private.web_push_deliveries d join public.requisition_notifications q on q.id=d.notice_id where d.id=p_id and d.recipient_user_id=auth.uid();
 if not found or not private.web_push_notice_allowed(n) then return jsonb_build_object('state','unavailable');end if;
 return jsonb_build_object('state','available','noticeId',n.id,'careRecipientId',n.care_recipient_id,
 'careRecipientLabel',(select display_name from public.care_recipients where id=n.care_recipient_id),'target',
 jsonb_build_object('care_recipient_id',n.care_recipient_id,'document_id',n.document_id,'requisition_id',n.requisition_id,'alert_event_id',n.alert_event_id,
 'consumption_report_id',n.consumption_report_id,'reminder_id',n.reminder_id,'event_key',n.event_key,'operational_documents',
 (select jsonb_build_object('type',type) from public.operational_documents where id=n.document_id)));
end;$$;

revoke all on function private.cancel_web_push(uuid,text),private.require_push_session(),private.web_push_endpoint_allowed(text),private.web_push_notice_allowed(public.requisition_notifications),private.web_push_due(public.requisition_notifications),private.enqueue_web_push() from public,anon,authenticated,service_role;
revoke all on function public.my_web_push_devices(),public.subscribe_web_push(jsonb,text,text),public.web_push_device_command(uuid,text),public.revoke_web_push_session(),public.resolve_web_push(uuid) from public,anon,authenticated,service_role;
grant execute on function public.my_web_push_devices(),public.subscribe_web_push(jsonb,text,text),public.web_push_device_command(uuid,text),public.revoke_web_push_session(),public.resolve_web_push(uuid) to authenticated;
revoke all on function public.claim_web_push_deliveries(integer,uuid,text),public.prepare_web_push_delivery(uuid,uuid,uuid,text),public.complete_web_push_delivery(uuid,uuid,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.claim_web_push_deliveries(integer,uuid,text),public.prepare_web_push_delivery(uuid,uuid,uuid,text),public.complete_web_push_delivery(uuid,uuid,uuid,text,text) to service_role;
notify pgrst,'reload schema';
commit;
