create table private.administrative_invitation_attempts (
  care_recipient_id uuid not null references public.care_recipients(id) on delete cascade,
  actor_id uuid not null,
  intent_key uuid not null,
  fingerprint text,
  action text check (action in ('create', 'reissue', 'revoke')),
  invitation_id uuid,
  recorded_at timestamptz not null default now(),
  primary key (care_recipient_id, actor_id, intent_key),
  check ((fingerprint is null and action is null and invitation_id is null)
    or (fingerprint is not null and action is not null and invitation_id is not null))
);
revoke all on private.administrative_invitation_attempts from public, anon, authenticated, service_role;

create index invitation_decision_history on public.audit_events(entity_id, created_at desc, id desc)
  where entity_type = 'invitation' and action in ('invitation.declined', 'invitation.revoked', 'invitation.renewed');

create function private.invitation_display_status(p_id uuid, p_status text) returns text
language sql stable set search_path = '' as $$
  select case when p_status = 'revoked' and (
    select action from public.audit_events
      where entity_type = 'invitation' and entity_id = p_id and action in ('invitation.declined', 'invitation.revoked', 'invitation.renewed')
      order by created_at desc, id desc limit 1
  ) = 'invitation.declined' then 'declined' else p_status end;
$$;

create function private.invitation_admin_view(p_invite public.care_recipient_invitations) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('id', p_invite.id, 'care_recipient_id', p_invite.care_recipient_id,
    'email', p_invite.email, 'role', p_invite.role, 'expires_at', p_invite.expires_at, 'created_at', p_invite.created_at,
    'status', private.invitation_display_status(p_invite.id, p_invite.status));
$$;

create function public.administrative_invitations(p_patient uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_manage_recipient(p_patient) then
    raise exception 'invitation administration required' using errcode = '42501';
  end if;
  return (select coalesce(jsonb_agg(private.invitation_admin_view(i) order by i.created_at desc, i.id), '[]'::jsonb)
    from public.care_recipient_invitations i where i.care_recipient_id = p_patient);
end;
$$;

create function public.administrative_invitation_command(
  p_patient uuid, p_key uuid, p_intent jsonb default null,
  p_token_hash text default null, p_expires_at timestamptz default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  verb text := p_intent->>'action';
  attempt private.administrative_invitation_attempts;
  invite public.care_recipient_invitations;
  signature text;
  role public.profile_role;
  executed boolean := false;
begin
  if p_key is null or actor is null or not public.can_manage_recipient(p_patient) then
    raise exception 'invitation administration required' using errcode = '42501';
  end if;
  -- The recovery and the first submission arbitrate the same official key.
  perform pg_advisory_xact_lock(hashtextextended('invitation-attempt:' || p_patient || ':' || actor || ':' || p_key, 0));
  if not public.can_manage_recipient(p_patient) then
    raise exception 'invitation administration required' using errcode = '42501';
  end if;
  select * into attempt from private.administrative_invitation_attempts
    where care_recipient_id = p_patient and actor_id = actor and intent_key = p_key;
  if p_intent is not null then
    if jsonb_typeof(p_intent) <> 'object' or verb is null or verb not in ('create', 'reissue', 'revoke') then
      raise exception 'invalid administrative invitation intent' using errcode = '22023';
    end if;
    signature := encode(extensions.digest(p_intent::text, 'sha256'), 'hex');
  end if;
  if attempt.intent_key is not null then
    if attempt.invitation_id is null then return jsonb_build_object('state', 'closed'); end if;
    if signature is not null and signature is distinct from attempt.fingerprint then
      raise exception 'administrative invitation intent differs' using errcode = 'PT409';
    end if;
    select * into strict invite from public.care_recipient_invitations
      where id = attempt.invitation_id and care_recipient_id = p_patient;
    verb := attempt.action;
  elsif p_intent is null then
    insert into private.administrative_invitation_attempts(care_recipient_id, actor_id, intent_key)
      values(p_patient, actor, p_key);
    return jsonb_build_object('state', 'closed');
  else
    if verb = 'create' then
      role := (p_intent->>'role')::public.profile_role;
      invite := public.admin_create_invitation(p_patient, p_intent->>'email', role,
        role = 'admin', false, p_token_hash, p_expires_at);
    else
      select * into invite from public.care_recipient_invitations
        where id = (p_intent->>'id')::uuid and care_recipient_id = p_patient for update;
      if not found or not public.can_manage_recipient(p_patient) then
        raise exception 'invitation unavailable' using errcode = '42501';
      end if;
      if private.invitation_display_status(invite.id, invite.status) is distinct from p_intent->>'status'
        or invite.expires_at is distinct from (p_intent->>'expiresAt')::timestamptz then
        raise exception 'stale invitation reference' using errcode = 'PT409';
      end if;
      if verb = 'reissue' then
        invite := public.admin_resend_invitation(invite.id, p_token_hash,
          greatest(p_expires_at, invite.expires_at + interval '1 microsecond'));
      else
        if invite.status <> 'pending' then
          raise exception 'stale invitation reference' using errcode = 'PT409';
        end if;
        invite := public.revoke_invitation(invite.id);
      end if;
    end if;
    if not public.can_manage_recipient(p_patient) then
      raise exception 'invitation administration required' using errcode = '42501';
    end if;
    insert into private.administrative_invitation_attempts(care_recipient_id, actor_id, intent_key, fingerprint, action, invitation_id)
      values(p_patient, actor, p_key, signature, verb, invite.id);
    executed := true;
  end if;
  return jsonb_build_object('state', 'recorded', 'action', verb, 'executed', executed,
    'invitation', private.invitation_admin_view(invite));
end;
$$;

revoke all on function private.invitation_display_status(uuid, text), private.invitation_admin_view(public.care_recipient_invitations),
  public.administrative_invitations(uuid), public.administrative_invitation_command(uuid, uuid, jsonb, text, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.administrative_invitations(uuid),
  public.administrative_invitation_command(uuid, uuid, jsonb, text, timestamptz) to authenticated;

-- An active local access.manage exception applies through the recipient flow.
-- An administrator denied that capacity can no longer authorize a pending link.
create or replace function public.invitation_registration_allowed(p_token_hash text, p_email text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.care_recipient_invitations i
    join public.care_recipients r on r.id = i.care_recipient_id and r.is_active
    where i.token_hash = p_token_hash and i.email = lower(trim(p_email))
      and i.status = 'pending' and i.expires_at > now()
      and private.member_can(i.care_recipient_id, i.invited_by, 'access.manage'));
$$;

do $$
declare
  patch record;
  original text;
begin
  for patch in select * from (values
    ('public.invitation_preview(text)',
      $old$not exists(select 1 from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id where m.care_recipient_id=i.care_recipient_id and m.user_id=i.invited_by and m.role='admin' and m.status='active' and p.status='active')$old$,
      $new$not private.member_can(i.care_recipient_id, i.invited_by, 'access.manage')$new$),
    ('public.invitation_preview(text)',
      $old$case when exists(select 1 from public.audit_events where entity_id=i.id and action='invitation.declined') then 'declined' else 'revoked' end$old$,
      $new$private.invitation_display_status(i.id, i.status)$new$),
    ('public.v4_accept_invitation(text)',
      $old$not exists(select 1 from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id where m.care_recipient_id=i.care_recipient_id and m.user_id=i.invited_by and m.status='active' and m.role='admin' and p.status='active')$old$,
      $new$not private.member_can(i.care_recipient_id, i.invited_by, 'access.manage')$new$),
    ('public.v3_accept_invitation(text)',
      $old$not exists(
    select 1 from public.profiles p where p.id=i.invited_by and p.status='active' and
      (p.role='admin' and p.global_scope or exists(select 1 from public.care_recipient_memberships m where m.user_id=p.id and m.care_recipient_id=i.care_recipient_id and m.role='admin' and m.status='active')))$old$,
      $new$not private.member_can(i.care_recipient_id, i.invited_by, 'access.manage')$new$),
    ('public.decline_invitation(text)',
      $old$if i.status<>'pending' or i.expires_at<=now() or not exists(select 1 from auth.users$old$,
      $new$if i.token_hash is distinct from p_token_hash or i.status<>'pending' or i.expires_at<=now()
  or not private.member_can(i.care_recipient_id, i.invited_by, 'access.manage')
  or not exists(select 1 from public.care_recipients where id=i.care_recipient_id and is_active)
  or not exists(select 1 from auth.users$new$)
  ) changes(reference, previous, replacement) loop
    original := pg_get_functiondef(patch.reference::regprocedure);
    if strpos(original, patch.previous) = 0 then
      raise exception 'Unexpected invitation contract in %', patch.reference;
    end if;
    execute replace(original, patch.previous, patch.replacement);
  end loop;
end;
$$;
