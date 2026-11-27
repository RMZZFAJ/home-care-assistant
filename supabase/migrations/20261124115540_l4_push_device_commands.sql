begin;

create table private.web_push_device_receipts (
  user_id uuid not null references public.profiles(id),
  session_id uuid references auth.sessions(id) on delete set null,
  request_key uuid not null,
  intent_hash text not null,
  result jsonb not null,
  primary key (user_id, request_key)
);
create index web_push_device_receipts_session on private.web_push_device_receipts(session_id);
alter table private.web_push_device_receipts enable row level security;
revoke all on private.web_push_device_receipts from public, anon, authenticated, service_role;

alter table private.web_push_device_events
  drop constraint web_push_device_events_event_check,
  add constraint web_push_device_events_event_check
    check (event in ('consent','reassigned','revoke','pause','resume','session_revoked','expired','rename'));

create function public.apply_my_web_push_change(p_key uuid, p_action text, p_input jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  sid uuid := private.require_push_session();
  owner_id uuid := auth.uid();
  signature text;
  prior private.web_push_device_receipts;
  device private.web_push_devices;
  result jsonb;
begin
  if p_key is null or p_action is null or p_action not in ('enroll','rename','pause','resume','revoke')
    or jsonb_typeof(p_input) is distinct from 'object' then
    raise exception 'invalid push action' using errcode = '22023';
  end if;
  signature := encode(extensions.digest(jsonb_build_array(p_action, p_input)::text, 'sha256'), 'hex');
  perform pg_advisory_xact_lock(hashtextextended('web-push-receipt:' || owner_id::text || ':' || p_key::text, 0));
  sid := private.require_push_session();
  select * into prior from private.web_push_device_receipts
  where user_id = owner_id and request_key = p_key;
  if found then
    if prior.session_id is distinct from sid or prior.intent_hash <> signature then
      raise exception 'push device attempt differs' using errcode = 'PT409';
    end if;
    return prior.result;
  end if;

  if p_action = 'enroll' then
    if p_input - array['subscription','label','keyVersion'] <> '{}'::jsonb then
      raise exception 'invalid push action' using errcode = '22023';
    end if;
    result := public.subscribe_web_push(p_input->'subscription', p_input->>'label', p_input->>'keyVersion');
    result := jsonb_build_object('id', result->'id', 'action', p_action);
  else
    if p_input - array['id','expectedVersion','label'] <> '{}'::jsonb
      or (p_action <> 'rename' and p_input ? 'label') then
      raise exception 'invalid push action' using errcode = '22023';
    end if;
    select * into device from private.web_push_devices
    where id = (p_input->>'id')::uuid and user_id = owner_id for update;
    if not found then raise exception 'push device unavailable' using errcode = '42501'; end if;
    sid := private.require_push_session();
    if device.updated_at is distinct from (p_input->>'expectedVersion')::timestamptz then
      raise exception 'stale push device version' using errcode = 'PT409';
    end if;
    if p_action = 'rename' then
      if device.session_id is distinct from sid then
        raise exception 'push device unavailable' using errcode = '42501';
      end if;
      if jsonb_typeof(p_input->'label') is distinct from 'string' or length(btrim(p_input->>'label')) not between 1 and 80 then
        raise exception 'invalid push device label' using errcode = '22023';
      end if;
      if device.label <> btrim(p_input->>'label') then
        update private.web_push_devices set label = btrim(p_input->>'label'), updated_at = clock_timestamp()
        where id = device.id;
        insert into private.web_push_device_events(device_id, user_id, event)
        values (device.id, owner_id, 'rename');
      end if;
      result := jsonb_build_object('id', device.id, 'action', p_action);
    else
      result := public.web_push_device_command(device.id, p_action);
    end if;
  end if;
  insert into private.web_push_device_receipts(user_id, session_id, request_key, intent_hash, result)
  values (owner_id, sid, p_key, signature, result);
  return result;
end;
$$;

create function public.my_web_push_device_receipt(p_key uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  sid uuid := private.require_push_session();
  result jsonb;
begin
  select r.result into result from private.web_push_device_receipts r
  where r.user_id = auth.uid() and r.session_id = sid and r.request_key = p_key;
  return result;
end;
$$;

revoke all on function public.apply_my_web_push_change(uuid, text, jsonb),
  public.my_web_push_device_receipt(uuid) from public, anon, authenticated, service_role;
grant execute on function public.apply_my_web_push_change(uuid, text, jsonb),
  public.my_web_push_device_receipt(uuid) to authenticated;

commit;
