alter table public.profiles add column notice_preferences_version integer not null default 0;

create function private.advance_notice_preferences_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.notice_preferences_version := old.notice_preferences_version
    + (new.notification_preferences is distinct from old.notification_preferences)::integer;
  return new;
end;
$$;

revoke all on function private.advance_notice_preferences_version() from public, anon, authenticated, service_role;
create trigger notice_preferences_version before update of notification_preferences, notice_preferences_version
  on public.profiles for each row execute function private.advance_notice_preferences_version();

create table private.notice_preference_receipts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  key uuid not null,
  reviewed_version integer not null check (reviewed_version >= 0),
  preferences jsonb not null,
  saved_version integer not null check (saved_version >= reviewed_version),
  recorded_at timestamptz not null default clock_timestamp(),
  primary key (user_id, key)
);
alter table private.notice_preference_receipts enable row level security;
revoke all on private.notice_preference_receipts from public, anon, authenticated, service_role;

create function public.my_notice_preferences(p_key uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare account public.profiles; committed integer;
begin
  select * into account from public.profiles where id = auth.uid() and status = 'active';
  if not found or private.auth_session() is null then raise exception 'active identity required' using errcode = '42501'; end if;
  select saved_version into committed from private.notice_preference_receipts where user_id = account.id and key = p_key;
  return jsonb_build_object('version', account.notice_preferences_version,
    'internal', account.notification_preferences->'internal' is distinct from 'false'::jsonb,
    'email', coalesce(account.notification_preferences->'email' = 'true'::jsonb, false),
    'whatsapp', coalesce(account.notification_preferences->'whatsapp' = 'true'::jsonb, false),
    'attemptId', p_key, 'savedVersion', committed);
end;
$$;

create function public.set_my_notice_preferences(p_internal boolean, p_email boolean, p_whatsapp boolean, p_version integer, p_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare account public.profiles; receipt private.notice_preference_receipts;
  selection jsonb := jsonb_build_object('internal', p_internal, 'email', p_email, 'whatsapp', p_whatsapp);
begin
  if p_internal is null or p_email is null or p_whatsapp is null or p_version is null or p_version < 0 or p_key is null then
    raise exception 'invalid notice preference' using errcode = '22023';
  end if;
  select * into account from public.profiles where id = auth.uid() and status = 'active' for update;
  if not found or private.auth_session() is null then raise exception 'active identity required' using errcode = '42501'; end if;
  select * into receipt from private.notice_preference_receipts where user_id = account.id and key = p_key;
  if found then
    if receipt.preferences is distinct from selection or receipt.reviewed_version is distinct from p_version then
      raise exception 'idempotency conflict' using errcode = '23505';
    end if;
    return public.my_notice_preferences(p_key);
  end if;
  if p_version <> account.notice_preferences_version then raise exception 'stale preference version' using errcode = 'PT409'; end if;
  update public.profiles set notification_preferences = notification_preferences || selection
    where id = account.id returning notice_preferences_version into account.notice_preferences_version;
  insert into private.notice_preference_receipts(user_id, key, reviewed_version, preferences, saved_version)
    values(account.id, p_key, p_version, selection, account.notice_preferences_version);
  return public.my_notice_preferences(p_key);
end;
$$;

-- A stable read ties the science receipt to the current preference under the same snapshot.
create function public.my_science_preference_attempt(p_key uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select public.my_requisition_science_preference() || jsonb_build_object('attemptId', p_key,
    'savedVersion', (select version from public.requisition_science_preferences where user_id = auth.uid() and idempotency_key = p_key));
$$;

-- Personal details can now be edited without replacing independently managed channels.
-- Older callers can still supply the preferences value they already send.
create or replace function public.update_my_profile(p_name text, p_registration text, p_state text, p_category text, p_preferences jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if length(trim(coalesce(p_name, ''))) not between 2 and 160 or length(coalesce(p_registration, '')) > 30
    or p_state is not null and p_state !~ '^[A-Z]{2}$' or length(coalesce(p_category, '')) > 80
    or p_preferences is not null and jsonb_typeof(p_preferences) is distinct from 'object' then
    raise exception 'invalid profile' using errcode = '22023';
  end if;
  perform 1 from public.profiles where id = auth.uid() and status = 'active' for update;
  if not found or private.auth_session() is null then raise exception 'active identity required' using errcode = '42501'; end if;
  update public.profiles set full_name = trim(p_name), professional_registration = nullif(trim(p_registration), ''),
    professional_state = p_state, professional_category = p_category,
    notification_preferences = coalesce(p_preferences, notification_preferences) where id = auth.uid();
end;
$$;

revoke all on function public.my_notice_preferences(uuid), public.set_my_notice_preferences(boolean, boolean, boolean, integer, uuid),
  public.my_science_preference_attempt(uuid) from public, anon, authenticated, service_role;
grant execute on function public.my_notice_preferences(uuid), public.set_my_notice_preferences(boolean, boolean, boolean, integer, uuid),
  public.my_science_preference_attempt(uuid) to authenticated;
