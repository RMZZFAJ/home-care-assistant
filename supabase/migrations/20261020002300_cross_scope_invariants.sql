-- Defense in depth for privileged import paths and concurrent administration.
create or replace function public.guard_patient_product_owner() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_owner uuid;
begin
  select owner_care_recipient_id into v_owner from public.products where id=new.product_id;
  if v_owner is not null and v_owner<>new.care_recipient_id then raise exception 'exclusive product belongs to another patient' using errcode='23514';end if;
  return new;
end; $$;
create trigger guard_patient_product_owner before insert or update on public.care_recipient_products
for each row execute function public.guard_patient_product_owner();

create or replace function public.admin_upsert_membership(p_care_recipient_id uuid,p_user_id uuid,p_role public.profile_role,p_can_manage_stock boolean,p_can_count_stock boolean)
returns public.care_recipient_memberships language plpgsql security definer set search_path=public as $$
declare v public.care_recipient_memberships;
begin
  if not public.can_manage_recipient(p_care_recipient_id) then raise exception 'admin authorization required' using errcode='42501';end if;
  -- A local administrator can edit their established memberships. Adding an identity
  -- requires authenticated invitation acceptance, rather than account enumeration.
  if not public.is_global_administrator() and not exists(select 1 from public.care_recipient_memberships where care_recipient_id=p_care_recipient_id and user_id=p_user_id) then raise exception 'invitation acceptance required' using errcode='42501';end if;
  if p_role is null or not exists(select 1 from public.profiles where id=p_user_id and status='active') then raise exception 'invalid membership';end if;
  insert into public.care_recipient_memberships(care_recipient_id,user_id,role,can_manage_stock,can_count_stock)
  values(p_care_recipient_id,p_user_id,p_role,p_role<>'reader' and p_can_manage_stock,p_role<>'reader' and p_can_count_stock)
  on conflict(care_recipient_id,user_id) do update set role=excluded.role,can_manage_stock=excluded.can_manage_stock,can_count_stock=excluded.can_count_stock,status='active' returning * into v;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'membership.updated','care_recipient_membership',v.id,jsonb_build_object('care_recipient_id',p_care_recipient_id,'user_id',p_user_id,'role',p_role));return v;
end; $$;

create or replace function public.invalidate_revoked_membership_invitations() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.status='revoked' then
    update public.care_recipient_invitations set status='revoked'
    where care_recipient_id=new.care_recipient_id and status='pending'
      and email=(select lower(email) from auth.users where id=new.user_id);
  end if;
  return new;
end; $$;
create trigger invalidate_revoked_membership_invitations after update of status on public.care_recipient_memberships
for each row execute function public.invalidate_revoked_membership_invitations();

create or replace function public.accept_invitation(p_token_hash text) returns public.care_recipient_memberships
language plpgsql security definer set search_path=public as $$
declare i public.care_recipient_invitations;v public.care_recipient_memberships;v_email text;v_name text;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501';end if;
  select lower(email),coalesce(nullif(raw_user_meta_data->>'full_name',''),split_part(email,'@',1)) into v_email,v_name from auth.users where id=auth.uid() and email_confirmed_at is not null;
  select * into i from public.care_recipient_invitations where token_hash=p_token_hash for update;
  if not found or v_email is null or i.email<>v_email or not exists(select 1 from public.care_recipients where id=i.care_recipient_id and is_active) then raise exception 'invalid or expired invitation' using errcode='42501';end if;
  if exists(select 1 from public.profiles where id=auth.uid() and status='revoked') then raise exception 'account revoked' using errcode='42501';end if;
  if i.status='accepted' and i.accepted_by=auth.uid() then
    select * into v from public.care_recipient_memberships where care_recipient_id=i.care_recipient_id and user_id=auth.uid() and status='active';
    if found then return v;end if;
    raise exception 'membership revoked' using errcode='42501';
  end if;
  if i.status<>'pending' or i.expires_at<=now() or not exists(
    select 1 from public.profiles p where p.id=i.invited_by and p.status='active' and
      (p.role='admin' and p.global_scope or exists(select 1 from public.care_recipient_memberships m where m.user_id=p.id and m.care_recipient_id=i.care_recipient_id and m.role='admin' and m.status='active')))
  then raise exception 'invalid or expired invitation' using errcode='42501';end if;
  -- Serialize acceptance with updates of an established membership. Revocation
  -- invalidates pending invitations; an explicit new invitation can restore access.
  perform 1 from public.care_recipient_memberships where care_recipient_id=i.care_recipient_id and user_id=auth.uid() for update;
  select status into v.status from public.care_recipient_invitations where id=i.id;
  if v.status<>'pending' then raise exception 'invitation revoked' using errcode='42501';end if;
  insert into public.profiles(id,full_name,role,status,global_scope) values(auth.uid(),left(case when length(v_name)<2 then 'Usuário' else v_name end,160),'professional','active',false) on conflict(id) do nothing;
  insert into public.care_recipient_memberships(care_recipient_id,user_id,role,can_manage_stock,can_count_stock)
  values(i.care_recipient_id,auth.uid(),i.role,i.role<>'reader' and i.can_manage_stock,i.role<>'reader' and i.can_count_stock)
  on conflict(care_recipient_id,user_id) do update set role=excluded.role,can_manage_stock=excluded.can_manage_stock,can_count_stock=excluded.can_count_stock,status='active' returning * into v;
  update public.care_recipient_invitations set status='accepted',accepted_by=auth.uid(),accepted_at=now() where id=i.id;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'invitation.accepted','invitation',i.id,jsonb_build_object('care_recipient_id',i.care_recipient_id));return v;
end; $$;

-- A signed provider event can reconcile a timeout that occurred before the send
-- response was received. A reference already bound to a different job cannot move.
drop function public.notification_webhook(text,text);
create or replace function public.notification_webhook(p_provider_reference text,p_state text,p_notification_id uuid default null) returns void
language plpgsql security definer set search_path=public as $$begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'service authorization required' using errcode='42501';end if;
  if p_provider_reference is null or p_state is null or p_state not in ('accepted','delivered','read','failed') then raise exception 'invalid provider event';end if;
  update public.requisition_notifications set state=p_state,provider_reference=coalesce(provider_reference,p_provider_reference),
    delivered_at=case when p_state in ('delivered','read') then coalesce(delivered_at,now()) else delivered_at end,
    read_at=case when p_state='read' then coalesce(read_at,now()) else read_at end,
    leased_by=null,lease_expires_at=null
  where (provider_reference=p_provider_reference or id=p_notification_id and provider_reference is null)
    and state in ('processing','accepted','uncertain','delivered','read')
    and (p_state='read' or p_state='delivered' and state<>'read' or p_state in ('accepted','failed') and state in ('processing','accepted','uncertain'));
end;$$;
revoke all on function public.notification_webhook(text,text,uuid) from public,anon,authenticated;
grant execute on function public.notification_webhook(text,text,uuid) to service_role;
