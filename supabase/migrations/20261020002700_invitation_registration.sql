-- A high-entropy invitation authorizes registration, never a global role.
create or replace function public.invitation_registration_allowed(p_token_hash text,p_email text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.care_recipient_invitations i
    join public.care_recipients r on r.id=i.care_recipient_id and r.is_active
    join public.profiles p on p.id=i.invited_by and p.status='active'
    where i.token_hash=p_token_hash and i.email=lower(trim(p_email))
      and i.status='pending' and i.expires_at>now()
      and (p.role='admin' and p.global_scope or exists(
        select 1 from public.care_recipient_memberships m where m.care_recipient_id=i.care_recipient_id
          and m.user_id=i.invited_by and m.role='admin' and m.status='active')));
$$;
revoke all on function public.invitation_registration_allowed(text,text) from public,anon,authenticated;
grant execute on function public.invitation_registration_allowed(text,text) to anon,authenticated;
