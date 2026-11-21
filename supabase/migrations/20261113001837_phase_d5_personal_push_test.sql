begin;

-- Diagnostics are separate from operational notices and never create science or stock acts.
create table private.web_push_tests (
 id uuid primary key default gen_random_uuid(),
 request_key uuid not null,
 user_id uuid not null references public.profiles(id),
 session_id uuid references auth.sessions(id) on delete set null,
 device_id uuid not null references private.web_push_devices(id),
 key_version text not null check(key_version ~ '^[A-Za-z0-9_.-]{1,80}$'),
 state text not null default 'pending' check(state in ('pending','processing','accepted','expired','failed','uncertain')),
 created_at timestamptz not null default clock_timestamp(),
 dispatch_started_at timestamptz, completed_at timestamptz, lease_token uuid,
 error_code text check(error_code is null or error_code ~ '^PUSH_[A-Z_]{1,100}$'),
 unique(user_id,request_key),
 check(state<>'processing' or (lease_token is not null and dispatch_started_at is not null))
);
create index web_push_tests_device_created on private.web_push_tests(device_id,created_at desc);
create index web_push_tests_session on private.web_push_tests(session_id);
alter table private.web_push_tests enable row level security;
revoke all on private.web_push_tests from public,anon,authenticated,service_role;

create function public.request_my_web_push_test(p_device uuid,p_key uuid,p_key_version text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare sid uuid:=private.require_push_session();d private.web_push_devices;t private.web_push_tests;
begin
 if p_device is null or p_key is null or coalesce(p_key_version,'') !~ '^[A-Za-z0-9_.-]{1,80}$' then
  raise exception 'invalid push test';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('web-push-test-owner:'||auth.uid()::text,0));
 select * into d from private.web_push_devices where id=p_device and user_id=auth.uid() and session_id=sid for update;
 if not found then raise exception 'push device unavailable' using errcode='42501';end if;
 sid:=private.require_push_session();
 select * into t from private.web_push_tests where user_id=auth.uid() and request_key=p_key for update;
 if found then
  if t.device_id<>d.id or t.session_id is distinct from sid or t.key_version<>p_key_version then
   raise exception 'push test idempotency differs' using errcode='PT409';
  end if;
  if t.state='processing' and t.dispatch_started_at<clock_timestamp()-interval '30 seconds' then
   update private.web_push_tests set state='uncertain',completed_at=clock_timestamp(),error_code='PUSH_RESULT_UNCONFIRMED' where id=t.id returning * into t;
  end if;
 else
  if d.state<>'active' or not d.enabled or d.muted_until>clock_timestamp() or d.expires_at<=clock_timestamp() or d.key_version<>p_key_version then
   raise exception 'push device requires consent';
  end if;
  if exists(select 1 from private.web_push_tests where device_id=d.id and created_at>clock_timestamp()-interval '1 minute') then
   raise exception 'push test rate limited' using errcode='PT429';
  end if;
  insert into private.web_push_tests(request_key,user_id,session_id,device_id,key_version)
   values(p_key,auth.uid(),sid,d.id,p_key_version) returning * into t;
 end if;
 return jsonb_build_object('id',t.id,'state',t.state,'requestedAt',t.created_at,'code',t.error_code);
end;$$;

create function public.prepare_web_push_test(p_id uuid,p_user uuid,p_token uuid,p_key_version text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t private.web_push_tests;d private.web_push_devices;
begin
 if p_token is null then raise exception 'invalid push test token';end if;
 select * into t from private.web_push_tests where id=p_id and user_id=p_user;
 if not found or t.state<>'pending' then return null;end if;
 select * into d from private.web_push_devices where id=t.device_id for share;
 select * into t from private.web_push_tests where id=p_id and user_id=p_user for update;
 if not found or t.state<>'pending' then return null;end if;
 if d.user_id<>t.user_id or d.session_id is distinct from t.session_id or d.state<>'active' or not d.enabled
  or d.muted_until>clock_timestamp() or d.expires_at<=clock_timestamp() or d.key_version<>p_key_version or t.key_version<>p_key_version
  or not exists(select 1 from auth.sessions s join public.profiles p on p.id=s.user_id
    where s.id=t.session_id and s.user_id=t.user_id and (s.not_after is null or s.not_after>clock_timestamp()) and p.status='active') then
  update private.web_push_tests set state='expired',completed_at=clock_timestamp(),error_code='PUSH_SUBSCRIPTION_EXPIRED' where id=t.id;
  return null;
 end if;
 update private.web_push_tests set state='processing',lease_token=p_token,dispatch_started_at=clock_timestamp() where id=t.id;
 return jsonb_build_object('id',t.id,'subscription',jsonb_build_object('endpoint',d.endpoint,'expirationTime',null,'keys',jsonb_build_object('p256dh',d.p256dh,'auth',d.auth_key)));
end;$$;

create function public.complete_web_push_test(p_id uuid,p_token uuid,p_result text,p_error text default null) returns text
language plpgsql security definer set search_path='' as $$
declare t private.web_push_tests;
begin
 if p_result is null or p_result not in ('accepted','pending','expired','failed','uncertain')
  or (p_error is not null and p_error !~ '^PUSH_[A-Z_]{1,100}$') then raise exception 'invalid push test result';end if;
 select * into t from private.web_push_tests where id=p_id for update;
 if not found then raise exception 'push test unavailable';end if;
 if t.state<>'processing' or t.lease_token is distinct from p_token then return t.state;end if;
 update private.web_push_tests set state=case when p_result='pending' then 'failed' else p_result end,
  completed_at=clock_timestamp(),error_code=p_error where id=t.id returning * into t;
 return t.state;
end;$$;

revoke all on function public.request_my_web_push_test(uuid,uuid,text),public.prepare_web_push_test(uuid,uuid,uuid,text),public.complete_web_push_test(uuid,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.request_my_web_push_test(uuid,uuid,text) to authenticated;
grant execute on function public.prepare_web_push_test(uuid,uuid,uuid,text),public.complete_web_push_test(uuid,uuid,text,text) to service_role;
commit;
