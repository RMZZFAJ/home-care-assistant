CREATE OR REPLACE FUNCTION public.v3_accept_invitation(p_token_hash text)
 RETURNS care_recipient_memberships
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end; $function$
