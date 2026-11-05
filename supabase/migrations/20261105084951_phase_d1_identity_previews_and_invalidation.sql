-- Possession of the link alone reveals state, never a patient's identity.
-- Full preview requires the confirmed intended account and a live Auth session.
create or replace function public.invitation_preview(p_token_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.care_recipient_invitations;v_state text;v_email text;
begin
 if p_token_hash is null or p_token_hash!~'^[a-f0-9]{64}$' then return jsonb_build_object('state','invalid');end if;
 select * into i from public.care_recipient_invitations where token_hash=p_token_hash;
 if not found then return jsonb_build_object('state','invalid');end if;
 v_state:=case when i.status='accepted' then 'accepted'
  when i.status<>'pending' then case when exists(select 1 from public.audit_events where entity_id=i.id and action='invitation.declined') then 'declined' else 'revoked' end
  when i.expires_at<=now() then 'expired'
  when not exists(select 1 from public.care_recipients where id=i.care_recipient_id and is_active)
   or not exists(select 1 from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id where m.care_recipient_id=i.care_recipient_id and m.user_id=i.invited_by and m.role='admin' and m.status='active' and p.status='active') then 'revoked'
  else 'ready' end;
 if v_state in ('revoked','declined','expired') then return jsonb_build_object('state',v_state);end if;
 if not exists(select 1 from auth.sessions where id=nullif(auth.jwt()->>'session_id','')::uuid and user_id=auth.uid() and (not_after is null or not_after>now()))
 then return jsonb_build_object('state','login_required');end if;
 select lower(email) into v_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if v_email is null or v_email<>i.email or exists(select 1 from public.profiles where id=auth.uid() and status='revoked')
 then return jsonb_build_object('state','wrong_account');end if;
 if v_state='accepted' and (i.accepted_by is distinct from auth.uid() or not exists(select 1 from public.care_recipient_memberships where care_recipient_id=i.care_recipient_id and user_id=auth.uid() and status='active'))
 then return jsonb_build_object('state','revoked');end if;
 return jsonb_build_object('state',v_state,'patientName',(select display_name from public.care_recipients where id=i.care_recipient_id),
 'role',i.role,'recipientEmail',i.email,'inviterName',(select full_name from public.profiles where id=i.invited_by),'expiresAt',i.expires_at,
 'canManageStock',i.can_manage_stock,'canCountStock',i.can_count_stock);
end;$$;
revoke all on function public.invitation_preview(text) from public,service_role;
grant execute on function public.invitation_preview(text) to anon,authenticated;

-- Profile rows use id, not user_id. Notify authorized consumers with a revision
-- only; names, roles, emails and proposed changes never enter the broadcast.
create or replace function private.invalidate_workspace()
returns trigger language plpgsql security definer set search_path='' as $$
declare row_data jsonb;pid uuid;profile_id uuid;u uuid;n bigint;
begin
 row_data:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 pid:=(row_data->>'care_recipient_id')::uuid;
 if tg_table_schema='public' and tg_table_name='profiles' then profile_id:=(row_data->>'id')::uuid;end if;
 for u in select distinct affected.user_id from (
  select user_id from public.care_recipient_memberships where care_recipient_id=pid and status='active'
  union select (row_data->>'user_id')::uuid
  union select (row_data->>'proposed_by')::uuid
  union select (row_data->>'approved_by')::uuid
  union select profile_id
  union select peer.user_id from public.care_recipient_memberships owner join public.care_recipient_memberships peer on peer.care_recipient_id=owner.care_recipient_id and peer.status='active' where owner.user_id=profile_id and owner.status='active'
  union select id from public.profiles where profile_id is not null and role='admin' and global_scope and status='active'
 ) affected where affected.user_id is not null order by affected.user_id
 loop
  insert into private.workspace_revisions(user_id,revision) values(u,1)
  on conflict(user_id) do update set revision=private.workspace_revisions.revision+1 returning revision into n;
  perform realtime.send(jsonb_build_object('revision',n),'invalidate','hca:user:'||u::text,true);
 end loop;
 return null;
end;$$;
revoke all on function private.invalidate_workspace() from public,anon,authenticated,service_role;

-- Recheck the confirmed Auth identity after the invitation and membership locks.
do $migration$
declare target regprocedure;definition text;anchor text;item record;
begin
 for item in select * from (values
  ('public.v4_accept_invitation(text)','select * into i from public.care_recipient_invitations where token_hash=p_token_hash for update;'),
  ('public.v3_accept_invitation(text)','perform 1 from public.care_recipient_memberships where care_recipient_id=i.care_recipient_id and user_id=auth.uid() for update;'),
  ('public.decline_invitation(text)','select * into strict i from public.care_recipient_invitations where id=i.id for update;')
 ) as changes(signature,after_text) loop
  target:=to_regprocedure(item.signature);definition:=replace(replace(pg_get_functiondef(target),E'\r\n',E'\n'),E'\r',E'\n');anchor:=item.after_text;
  if target is null or length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'identity authorization anchor mismatch: %',item.signature;end if;
  execute replace(definition,anchor,anchor||E'\n if not exists(select 1 from auth.sessions where id=nullif(auth.jwt()->>''session_id'','''')::uuid and user_id=auth.uid() and (not_after is null or not_after>now())) then raise exception ''active Auth session required'' using errcode=''42501'';end if;');
 end loop;
end;$migration$;
