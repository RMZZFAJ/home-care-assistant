begin;

alter table private.web_push_tests add column retry_at timestamptz;

create function public.my_web_push_test(p_device uuid, p_key uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  sid uuid := private.require_push_session();
  receipt jsonb;
begin
  select jsonb_build_object(
    'id', t.id, 'state', t.state, 'requestedAt', t.created_at, 'code', t.error_code,
    'retryAt', greatest(t.created_at + interval '1 minute', t.retry_at)
  ) into receipt
  from private.web_push_tests t
  where t.user_id = auth.uid() and t.session_id = sid
    and t.request_key = p_key and t.device_id = p_device;
  return receipt;
end;
$$;

create or replace function public.request_my_web_push_test(p_device uuid, p_key uuid, p_key_version text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  sid uuid := private.require_push_session();
  d private.web_push_devices;
  t private.web_push_tests;
  next_test_at timestamptz;
begin
  if p_device is null or p_key is null or coalesce(p_key_version, '') !~ '^[A-Za-z0-9_.-]{1,80}$' then
    raise exception 'invalid push test';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('web-push-test-owner:' || auth.uid()::text, 0));
  select * into d from private.web_push_devices
  where id = p_device and user_id = auth.uid() and session_id = sid for update;
  if not found then raise exception 'push device unavailable' using errcode = '42501'; end if;
  sid := private.require_push_session();
  select * into t from private.web_push_tests where user_id = auth.uid() and request_key = p_key;
  if found then
    if t.device_id <> d.id or t.session_id is distinct from sid or t.key_version <> p_key_version then
      raise exception 'push test idempotency differs' using errcode = 'PT409';
    end if;
  else
    if d.state <> 'active' or not d.enabled or d.muted_until > clock_timestamp()
      or d.expires_at <= clock_timestamp() or d.key_version <> p_key_version then
      raise exception 'push device requires consent';
    end if;
    select max(greatest(created_at + interval '1 minute', retry_at))
    into next_test_at from private.web_push_tests where device_id = d.id
      and (created_at > clock_timestamp() - interval '1 minute' or retry_at > clock_timestamp());
    if next_test_at > clock_timestamp() then
      raise exception 'push test rate limited' using errcode = 'PT429', detail = next_test_at::text;
    end if;
    insert into private.web_push_tests(request_key, user_id, session_id, device_id, key_version)
    values (p_key, auth.uid(), sid, d.id, p_key_version) returning * into t;
  end if;
  -- Retain the existing four-field response for callers deployed before the lookup.
  return jsonb_build_object('id', t.id, 'state', t.state, 'requestedAt', t.created_at, 'code', t.error_code);
end;
$$;

create function public.complete_web_push_test(
  p_id uuid, p_token uuid, p_result text, p_error text, p_retry_at timestamptz
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  result text;
  attempt private.web_push_tests;
  expired_device private.web_push_devices;
  eligible boolean;
begin
  if p_result = 'expired' and p_error = 'PUSH_SUBSCRIPTION_EXPIRED' then
    -- Follow the dispatch lock order so other reservations can still complete.
    perform 1 from private.web_push_devices d join private.web_push_tests t on t.device_id = d.id
    where t.id = p_id for update of d;
  end if;
  select * into attempt from private.web_push_tests where id = p_id for update;
  eligible := attempt.state = 'processing' and attempt.lease_token is not distinct from p_token;
  result := public.complete_web_push_test(p_id, p_token, p_result, p_error);
  if eligible and result = 'failed' and p_retry_at > clock_timestamp() then
    update private.web_push_tests set retry_at = p_retry_at where id = p_id;
  end if;
  if eligible and result = 'expired' and p_error = 'PUSH_SUBSCRIPTION_EXPIRED' then
    update private.web_push_devices d set state = 'expired', enabled = false, updated_at = clock_timestamp()
    where d.id = attempt.device_id and d.user_id = attempt.user_id and d.session_id = attempt.session_id
      and d.key_version = attempt.key_version and d.state = 'active' and d.consent_at <= attempt.dispatch_started_at
    returning d.* into expired_device;
    if found then
      insert into private.web_push_device_events(device_id, user_id, event)
      values (expired_device.id, expired_device.user_id, 'expired');
      perform private.cancel_web_push(expired_device.id, 'SUBSCRIPTION_EXPIRED');
    end if;
  end if;
  return result;
end;
$$;

revoke all on function public.my_web_push_test(uuid, uuid),
  public.complete_web_push_test(uuid, uuid, text, text, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.my_web_push_test(uuid, uuid) to authenticated;
grant execute on function public.complete_web_push_test(uuid, uuid, text, text, timestamptz) to service_role;

commit;
