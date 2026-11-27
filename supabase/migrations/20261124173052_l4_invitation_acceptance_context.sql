-- A confirmed invited Auth identity may still be waiting for its first profile.
create or replace function private.invitation_identity_session_valid()
returns boolean language sql volatile security definer set search_path = '' as $$
  select exists (select 1 from auth.sessions s
    where s.id = nullif(auth.jwt()->>'session_id', '')::uuid and s.user_id = auth.uid()
      and (s.not_after is null or s.not_after > clock_timestamp()));
$$;
revoke all on function private.invitation_identity_session_valid() from public, anon, authenticated, service_role;

-- Only the intended actor with a confirmed, active membership receives a destination.
create or replace function public.invitation_preview(p_token_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  invitation public.care_recipient_invitations;
  invitation_state text;
  actor_email text;
  residence_name text;
  member_role public.profile_role;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('state', 'invalid');
  end if;
  select * into invitation from public.care_recipient_invitations where token_hash = p_token_hash;
  if not found then return jsonb_build_object('state', 'invalid'); end if;

  select display_name into residence_name from public.care_recipients where id = invitation.care_recipient_id and is_active;
  invitation_state := case
    when invitation.status = 'accepted' then 'accepted'
    when invitation.status <> 'pending' then private.invitation_display_status(invitation.id, invitation.status)
    when invitation.expires_at <= now() then 'expired'
    when residence_name is null or not private.member_can(invitation.care_recipient_id, invitation.invited_by, 'access.manage') then 'revoked'
    else 'ready' end;
  if invitation_state in ('revoked', 'declined', 'expired') then
    return jsonb_build_object('state', invitation_state);
  end if;

  if not private.invitation_identity_session_valid() then return jsonb_build_object('state', 'login_required'); end if;
  select lower(email) into actor_email from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if actor_email is distinct from invitation.email or exists (
    select 1 from public.profiles where id = auth.uid() and status = 'revoked'
  ) then return jsonb_build_object('state', 'wrong_account'); end if;

  if invitation_state = 'accepted' then
    select role into member_role from public.care_recipient_memberships
      where care_recipient_id = invitation.care_recipient_id and user_id = auth.uid() and status = 'active';
    if invitation.accepted_by is distinct from auth.uid() or residence_name is null or member_role is null then
      return jsonb_build_object('state', 'revoked');
    end if;
  end if;

  return jsonb_build_object('state', invitation_state, 'patientName', residence_name,
    'role', coalesce(member_role, invitation.role), 'recipientEmail', invitation.email,
    'inviterName', (select full_name from public.profiles where id = invitation.invited_by),
    'expiresAt', invitation.expires_at, 'canManageStock', invitation.can_manage_stock, 'canCountStock', invitation.can_count_stock)
    || case when invitation_state = 'accepted' then jsonb_build_object('patientId', invitation.care_recipient_id) else '{}'::jsonb end;
end;
$$;

create or replace function public.decline_invitation(p_token_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  invitation public.care_recipient_invitations;
  confirmed_name text;
begin
  if not private.invitation_identity_session_valid() then
    raise exception 'active Auth session required' using errcode = '42501';
  end if;
  select * into invitation from public.care_recipient_invitations where token_hash = p_token_hash;
  if not found then raise exception 'invalid invitation' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('stock:' || invitation.care_recipient_id, 0));
  select * into invitation from public.care_recipient_invitations where id = invitation.id for update;

  if not found or invitation.token_hash is distinct from p_token_hash or invitation.status <> 'pending'
    or invitation.expires_at <= clock_timestamp() or not private.invitation_identity_session_valid()
    or not private.member_can(invitation.care_recipient_id, invitation.invited_by, 'access.manage')
    or not exists (select 1 from public.care_recipients where id = invitation.care_recipient_id and is_active) then
    raise exception 'invalid invitation' using errcode = '42501';
  end if;
  select coalesce(nullif(btrim(raw_user_meta_data->>'full_name'), ''), split_part(email, '@', 1)) into confirmed_name
    from auth.users where id = auth.uid() and lower(email) = invitation.email and email_confirmed_at is not null;
  if not found then raise exception 'invalid invitation' using errcode = '42501'; end if;

  -- The audit actor is a profile. Provision only the confirmed identity, without granting a membership.
  insert into public.profiles(id, full_name, role, status, global_scope)
    values (auth.uid(), left(case when length(confirmed_name) < 2 then 'Usuário' else confirmed_name end, 160), 'professional', 'active', false)
    on conflict (id) do nothing;
  perform 1 from public.profiles where id = auth.uid() and status = 'active' for update;
  if not found then raise exception 'account revoked' using errcode = '42501'; end if;

  update public.care_recipient_invitations set status = 'revoked' where id = invitation.id;
  update public.access_change_requests set status = 'rejected', resolution = resolution || jsonb_build_object('declinedAt', now())
    where status = 'awaiting_acceptance' and resolution->>'invitationId' = invitation.id::text;
  insert into public.audit_events(actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'invitation.declined', 'invitation', invitation.id, jsonb_build_object('care_recipient_id', invitation.care_recipient_id));
  return true;
end;
$$;
