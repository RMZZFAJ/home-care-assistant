create table public.care_recipient_invitations (
  id uuid primary key default gen_random_uuid(),care_recipient_id uuid not null references public.care_recipients(id),
  email text not null,role public.profile_role not null,can_manage_stock boolean not null default false,can_count_stock boolean not null default false,
  token_hash text not null unique check(token_hash~'^[a-f0-9]{64}$'),expires_at timestamptz not null,
  status text not null default 'pending' check(status in ('pending','accepted','revoked')),
  invited_by uuid not null references public.profiles(id),accepted_by uuid references public.profiles(id),accepted_at timestamptz,created_at timestamptz not null default now()
);
alter table public.care_recipient_invitations enable row level security;
create policy "patient administrators read invitations" on public.care_recipient_invitations for select using(public.can_manage_recipient(care_recipient_id));
create or replace function public.admin_create_invitation(p_care_recipient_id uuid,p_email text,p_role public.profile_role,p_can_manage_stock boolean,p_can_count_stock boolean,p_token_hash text,p_expires_at timestamptz)
returns public.care_recipient_invitations language plpgsql security definer set search_path=public as $$
declare v public.care_recipient_invitations;
begin
  if not public.recipient_can(p_care_recipient_id,'admin') then raise exception 'invitation admin authorization required' using errcode='42501';end if;
  if p_email is null or length(p_email)>254 or p_email!~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or p_role is null or p_token_hash is null or p_token_hash!~'^[a-f0-9]{64}$' or p_expires_at is null or p_expires_at<=now() or p_expires_at>now()+interval '30 days' then raise exception 'invalid invitation';end if;
  insert into public.care_recipient_invitations(care_recipient_id,email,role,can_manage_stock,can_count_stock,token_hash,expires_at,invited_by)
  values(p_care_recipient_id,lower(trim(p_email)),p_role,p_role<>'reader' and p_can_manage_stock,p_role<>'reader' and p_can_count_stock,p_token_hash,p_expires_at,auth.uid()) returning * into v;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'invitation.created','invitation',v.id,jsonb_build_object('care_recipient_id',p_care_recipient_id,'role',p_role));return v;
end; $$;
create or replace function public.admin_resend_invitation(p_invitation_id uuid,p_token_hash text,p_expires_at timestamptz)
returns public.care_recipient_invitations language plpgsql security definer set search_path=public as $$
declare v public.care_recipient_invitations;
begin
  select * into v from public.care_recipient_invitations where id=p_invitation_id for update;
  if not found or not public.recipient_can(v.care_recipient_id,'admin') then raise exception 'invitation not authorized' using errcode='42501';end if;
  if v.status='accepted' or p_token_hash is null or p_token_hash!~'^[a-f0-9]{64}$' or p_expires_at is null or p_expires_at<=now() or p_expires_at>now()+interval '30 days' then raise exception 'invalid invitation renewal';end if;
  update public.care_recipient_invitations set token_hash=p_token_hash,expires_at=p_expires_at,status='pending',invited_by=auth.uid() where id=v.id returning * into v;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'invitation.renewed','invitation',v.id,jsonb_build_object('care_recipient_id',v.care_recipient_id));return v;
end; $$;
create or replace function public.revoke_invitation(p_invitation_id uuid) returns public.care_recipient_invitations
language plpgsql security definer set search_path=public as $$
declare v public.care_recipient_invitations;
begin
  select * into v from public.care_recipient_invitations where id=p_invitation_id for update;
  if not found or not public.can_manage_recipient(v.care_recipient_id) then raise exception 'invitation not authorized' using errcode='42501';end if;
  if v.status='accepted' then raise exception 'accepted invitation cannot be revoked; revoke the membership';end if;
  update public.care_recipient_invitations set status='revoked' where id=v.id returning * into v;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'invitation.revoked','invitation',v.id,jsonb_build_object('care_recipient_id',v.care_recipient_id));return v;
end; $$;
create or replace function public.accept_invitation(p_token_hash text) returns public.care_recipient_memberships
language plpgsql security definer set search_path=public as $$
declare i public.care_recipient_invitations;v public.care_recipient_memberships;v_email text;v_name text;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501';end if;
  select lower(email),coalesce(nullif(raw_user_meta_data->>'full_name',''),split_part(email,'@',1)) into v_email,v_name from auth.users where id=auth.uid() and email_confirmed_at is not null;
  select * into i from public.care_recipient_invitations where token_hash=p_token_hash for update;
  if not found or v_email is null or i.email<>v_email or i.status<>'pending' or i.expires_at<=now() or not exists(select 1 from public.care_recipients where id=i.care_recipient_id and is_active) then raise exception 'invalid or expired invitation' using errcode='42501';end if;
  if exists(select 1 from public.profiles where id=auth.uid() and status='revoked') then raise exception 'account revoked' using errcode='42501';end if;
  insert into public.profiles(id,full_name,role,status,global_scope) values(auth.uid(),left(case when length(v_name)<2 then 'Usuário' else v_name end,160),'professional','active',false) on conflict(id) do nothing;
  -- Acceptance never edits the global identity or any other membership.
  insert into public.care_recipient_memberships(care_recipient_id,user_id,role,can_manage_stock,can_count_stock)
  values(i.care_recipient_id,auth.uid(),i.role,i.role<>'reader' and i.can_manage_stock,i.role<>'reader' and i.can_count_stock)
  on conflict(care_recipient_id,user_id) do update set role=excluded.role,can_manage_stock=excluded.can_manage_stock,can_count_stock=excluded.can_count_stock,status='active' returning * into v;
  update public.care_recipient_invitations set status='accepted',accepted_by=auth.uid(),accepted_at=now() where id=i.id;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'invitation.accepted','invitation',i.id,jsonb_build_object('care_recipient_id',i.care_recipient_id));return v;
end; $$;

create table public.recipient_notification_settings (
  id uuid primary key default gen_random_uuid(),care_recipient_id uuid not null references public.care_recipients(id),
  recipient_user_id uuid not null references public.profiles(id),recipient_group text not null check(recipient_group in ('family','supervision','care_team','other')),
  channel text not null check(channel in ('internal','email','whatsapp')),destination text,is_enabled boolean not null default false,
  created_at timestamptz not null default now(),unique(care_recipient_id,recipient_user_id,channel)
);
alter table public.recipient_notification_settings enable row level security;
create policy "admin read notification settings" on public.recipient_notification_settings for select using(public.can_manage_recipient(care_recipient_id));
create or replace function public.configure_recipient_notification(p_care_recipient_id uuid,p_recipient_user_id uuid,p_recipient_group text,p_channel text,p_destination text,p_enabled boolean)
returns public.recipient_notification_settings language plpgsql security definer set search_path=public as $$
declare v public.recipient_notification_settings;
begin
  if not public.recipient_can(p_care_recipient_id,'admin') then raise exception 'notification admin authorization required' using errcode='42501';end if;
  if not exists(select 1 from public.profiles p where p.id=p_recipient_user_id and p.status='active' and (p.role='admin' and p.global_scope or exists(select 1 from public.care_recipient_memberships m where m.user_id=p.id and m.care_recipient_id=p_care_recipient_id and m.status='active'))) then raise exception 'recipient is not an active patient member';end if;
  if p_channel not in ('internal','email','whatsapp') or p_channel is null or p_enabled is null
    or p_channel<>'internal' and (p_destination is null or length(trim(p_destination)) not between 3 and 254)
    or p_channel='email' and p_destination!~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    or p_channel='whatsapp' and p_destination!~'^[+][1-9][0-9]{7,14}$' then raise exception 'invalid notification destination';end if;
  insert into public.recipient_notification_settings(care_recipient_id,recipient_user_id,recipient_group,channel,destination,is_enabled)
  values(p_care_recipient_id,p_recipient_user_id,p_recipient_group,p_channel,case when p_channel='internal' then null else trim(p_destination) end,p_enabled)
  on conflict(care_recipient_id,recipient_user_id,channel) do update set recipient_group=excluded.recipient_group,destination=excluded.destination,is_enabled=excluded.is_enabled returning * into v;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'notification.settings.updated','notification_setting',v.id,jsonb_build_object('care_recipient_id',p_care_recipient_id,'channel',p_channel,'enabled',p_enabled));return v;
end; $$;
create table public.stock_alert_rules (
  id uuid primary key default gen_random_uuid(),care_recipient_id uuid not null,product_id text not null,
  location text not null check(location in ('FAMILY','CARE_TEAM')),low_threshold bigint not null check(low_threshold>=0),
  critical_threshold bigint not null check(critical_threshold>=0 and critical_threshold<=low_threshold),is_enabled boolean not null default false,
  foreign key(care_recipient_id,product_id) references public.care_recipient_products(care_recipient_id,product_id),unique(care_recipient_id,product_id,location)
);
create table public.stock_alert_events (
  id uuid primary key default gen_random_uuid(),care_recipient_id uuid not null,product_id text not null,
  location text not null check(location in ('FAMILY','CARE_TEAM')),severity text not null check(severity in ('low','critical')),
  state text not null default 'open' check(state in ('open','resolved')),balance bigint not null,
  created_at timestamptz not null default now(),resolved_at timestamptz,
  foreign key(care_recipient_id,product_id) references public.care_recipient_products(care_recipient_id,product_id)
);
create unique index stock_alert_one_open on public.stock_alert_events(care_recipient_id,product_id,location) where state='open';
alter table public.stock_alert_rules enable row level security;
alter table public.stock_alert_events enable row level security;
create policy "patient read alert rules" on public.stock_alert_rules for select using(public.can_access_recipient(care_recipient_id));
create policy "patient read alert events" on public.stock_alert_events for select using(public.can_access_recipient(care_recipient_id));

alter table public.requisition_notifications drop constraint requisition_notifications_state_check;
alter table public.requisition_notifications add constraint requisition_notifications_state_check check(state in ('pending','processing','accepted','delivered','read','sent','failed','cancelled','uncertain'));
alter table public.requisition_notifications alter column requisition_id drop not null,
  add column care_recipient_id uuid references public.care_recipients(id),add column recipient_user_id uuid references public.profiles(id),
  add column destination text,add column alert_event_id uuid references public.stock_alert_events(id),
  add column leased_by uuid,add column lease_expires_at timestamptz,add column next_attempt_at timestamptz not null default now(),
  add column delivered_at timestamptz,add column read_at timestamptz;
update public.requisition_notifications n set care_recipient_id=r.care_recipient_id from public.requisitions r where r.id=n.requisition_id;
alter table public.requisition_notifications alter column care_recipient_id set not null;
alter table public.requisition_notifications add constraint notification_event_kind check((requisition_id is null)<>(alert_event_id is null));
-- Legacy group work items have no proven individual recipient. Preserve them, without simulating delivery.
update public.requisition_notifications set state='cancelled',last_error='legacy recipient unresolved' where state in ('pending','processing') and recipient_user_id is null;
create unique index notification_individual_requisition on public.requisition_notifications(requisition_id,recipient_user_id,channel) where requisition_id is not null and recipient_user_id is not null;
create unique index notification_individual_alert on public.requisition_notifications(alert_event_id,recipient_user_id,channel) where alert_event_id is not null;
create index notification_due on public.requisition_notifications(next_attempt_at) where state='pending';
create unique index notification_provider_reference_unique on public.requisition_notifications(provider_reference)
  where provider_reference is not null and provider_reference<>'internal';
drop policy "users read scoped notifications" on public.requisition_notifications;
create policy "individual or admin notification read" on public.requisition_notifications for select using(
  public.can_manage_recipient(care_recipient_id) or recipient_user_id=auth.uid() and public.can_access_recipient(care_recipient_id));
create or replace function public.enqueue_patient_event(p_patient uuid,p_requisition uuid,p_alert uuid) returns void
language sql security definer set search_path=public as $$
  insert into public.requisition_notifications(requisition_id,care_recipient_id,alert_event_id,recipient_user_id,recipient_group,recipient_label,channel,destination)
  select p_requisition,p_patient,p_alert,p.id,s.recipient_group,p.full_name,s.channel,s.destination
  from public.recipient_notification_settings s join public.profiles p on p.id=s.recipient_user_id
  where s.care_recipient_id=p_patient and s.is_enabled and p.status='active'
    and (p.role='admin' and p.global_scope or exists(select 1 from public.care_recipient_memberships m where m.care_recipient_id=p_patient and m.user_id=p.id and m.status='active'))
  on conflict do nothing;
$$;
create or replace function public.enqueue_requisition_notifications() returns trigger
language plpgsql security definer set search_path=public as $$ begin
  if not new.is_historical then perform public.enqueue_patient_event(new.care_recipient_id,new.id,null);end if;return new;
end; $$;
create or replace function public.evaluate_stock_alert(p_patient uuid,p_product text,p_location text) returns void
language plpgsql security definer set search_path=public as $$
declare r public.stock_alert_rules;e public.stock_alert_events;v_balance bigint;v_severity text;v_id uuid;
begin
  if p_location is null then return;end if;
  select * into r from public.stock_alert_rules where care_recipient_id=p_patient and product_id=p_product and location=p_location;
  select * into e from public.stock_alert_events where care_recipient_id=p_patient and product_id=p_product and location=p_location and state='open' for update;
  select coalesce(balance,0) into v_balance from public.current_stock_balances where care_recipient_id=p_patient and product_id=p_product and location=p_location;
  v_balance:=coalesce(v_balance,0);
  if r.is_enabled then v_severity:=case when v_balance<=r.critical_threshold then 'critical' when v_balance<=r.low_threshold then 'low' end;end if;
  if e.id is not null and e.severity is not distinct from v_severity then update public.stock_alert_events set balance=v_balance where id=e.id;return;end if;
  if e.id is not null then update public.stock_alert_events set state='resolved',balance=v_balance,resolved_at=now() where id=e.id;end if;
  if v_severity is not null then
    insert into public.stock_alert_events(care_recipient_id,product_id,location,severity,balance) values(p_patient,p_product,p_location,v_severity,v_balance) returning id into v_id;
    perform public.enqueue_patient_event(p_patient,null,v_id);
  end if;
end; $$;
create or replace function public.after_stock_alert() returns trigger language plpgsql security definer set search_path=public as $$ begin
  perform public.evaluate_stock_alert(new.care_recipient_id,new.product_id,new.source_location);
  perform public.evaluate_stock_alert(new.care_recipient_id,new.product_id,new.destination_location);return new;
end; $$;
create trigger evaluate_stock_alert_after_movement after insert on public.stock_movements for each row execute function public.after_stock_alert();
create or replace function public.configure_stock_alert(p_care_recipient_id uuid,p_product_id text,p_location text,p_low_threshold bigint,p_critical_threshold bigint,p_is_enabled boolean)
returns public.stock_alert_rules language plpgsql security definer set search_path=public as $$
declare v public.stock_alert_rules;
begin
  if not public.recipient_can(p_care_recipient_id,'admin') then raise exception 'alert admin authorization required' using errcode='42501';end if;
  perform pg_advisory_xact_lock(hashtextextended('stock:'||p_care_recipient_id,0));
  insert into public.stock_alert_rules(care_recipient_id,product_id,location,low_threshold,critical_threshold,is_enabled)
  values(p_care_recipient_id,p_product_id,p_location,p_low_threshold,p_critical_threshold,p_is_enabled)
  on conflict(care_recipient_id,product_id,location) do update set low_threshold=excluded.low_threshold,critical_threshold=excluded.critical_threshold,is_enabled=excluded.is_enabled returning * into v;
  perform public.evaluate_stock_alert(p_care_recipient_id,p_product_id,p_location);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'stock.alert.configured','stock_alert_rule',v.id,jsonb_build_object('care_recipient_id',p_care_recipient_id,'enabled',p_is_enabled));return v;
end; $$;

create or replace function public.claim_notification_jobs(p_limit integer,p_worker_id uuid,p_external_enabled boolean default false) returns setof public.requisition_notifications
language plpgsql security definer set search_path=public as $$ begin
  if not public.is_global_administrator() and coalesce(auth.role(),'')<>'service_role' then raise exception 'worker authorization required' using errcode='42501';end if;
  if p_worker_id is null then raise exception 'worker identity required';end if;
  update public.requisition_notifications set state=case when channel='internal' then 'pending' else 'uncertain' end,leased_by=null,lease_expires_at=null,last_error='processing lease expired'
    where state='processing' and lease_expires_at<now();
  update public.requisition_notifications n set state='cancelled',last_error='recipient access revoked'
    where n.state='pending' and not exists(select 1 from public.profiles p where p.id=n.recipient_user_id and p.status='active' and (p.role='admin' and p.global_scope or exists(select 1 from public.care_recipient_memberships m where m.care_recipient_id=n.care_recipient_id and m.user_id=p.id and m.status='active')));
  return query update public.requisition_notifications n set state='processing',attempts=n.attempts+1,attempted_at=now(),leased_by=p_worker_id,lease_expires_at=now()+interval '2 minutes'
    where n.id in (select id from public.requisition_notifications where state='pending' and (channel='internal' or channel='whatsapp' and coalesce(p_external_enabled,false)) and next_attempt_at<=now() and attempts<5 order by next_attempt_at,id for update skip locked limit greatest(1,least(coalesce(p_limit,50),100))) returning n.*;
end; $$;
create or replace function public.complete_notification_job(p_id uuid,p_worker_id uuid,p_state text,p_provider_reference text default null,p_error text default null)
returns public.requisition_notifications language plpgsql security definer set search_path=public as $$
declare v public.requisition_notifications;
begin
  if not public.is_global_administrator() and coalesce(auth.role(),'')<>'service_role' then raise exception 'worker authorization required' using errcode='42501';end if;
  if p_state is null or p_state not in ('accepted','delivered','read','failed','pending','uncertain') then raise exception 'invalid notification result';end if;
  select * into v from public.requisition_notifications where id=p_id and leased_by=p_worker_id and state='processing' and lease_expires_at>now() for update;
  if not found then raise exception 'notification lease lost';end if;
  if v.channel='internal' and p_state='accepted' then raise exception 'internal notification requires delivered state';end if;
  update public.requisition_notifications set state=case when p_state='pending' and attempts>=5 then 'failed' else p_state end,
    provider_reference=coalesce(p_provider_reference,provider_reference),last_error=left(p_error,500),leased_by=null,lease_expires_at=null,
    next_attempt_at=now()+make_interval(secs=>least(3600,(30*power(2,attempts))::integer)),
    delivered_at=case when p_state in ('delivered','read') then now() else delivered_at end,read_at=case when p_state='read' then now() else read_at end
  where id=v.id returning * into v;return v;
end; $$;
create or replace function public.retry_notification_job(p_id uuid) returns public.requisition_notifications
language plpgsql security definer set search_path=public as $$
declare v public.requisition_notifications;
begin
  select * into v from public.requisition_notifications where id=p_id for update;
  if not found or not public.can_manage_recipient(v.care_recipient_id) then raise exception 'notification retry not authorized' using errcode='42501';end if;
  if v.state not in ('failed','uncertain') then raise exception 'notification is not retryable';end if;
  -- This explicit administrative action acknowledges the duplicate risk of an uncertain send.
  update public.requisition_notifications set state='pending',attempts=0,next_attempt_at=now(),leased_by=null,lease_expires_at=null,last_error=null where id=v.id returning * into v;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'notification.retry.requested','notification',v.id,jsonb_build_object('care_recipient_id',v.care_recipient_id));return v;
end; $$;
create or replace function public.notification_webhook(p_provider_reference text,p_state text) returns void
language plpgsql security definer set search_path=public as $$ begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'service authorization required' using errcode='42501';end if;
  if p_provider_reference is null or p_state is null or p_state not in ('accepted','delivered','read','failed') then raise exception 'invalid provider event';end if;
  update public.requisition_notifications set state=p_state,
    delivered_at=case when p_state in ('delivered','read') then coalesce(delivered_at,now()) else delivered_at end,
    read_at=case when p_state='read' then coalesce(read_at,now()) else read_at end
  where provider_reference=p_provider_reference and state in ('accepted','uncertain','delivered','read')
    and (p_state='read' or p_state='delivered' and state<>'read' or p_state in ('accepted','failed') and state in ('accepted','uncertain'));
end; $$;
create or replace function public.process_internal_notifications(p_limit integer default 50) returns table(processed integer,external_pending integer)
language plpgsql security definer set search_path=public as $$
declare v_processed integer;v_external integer;
begin
  if not public.is_global_administrator() then raise exception 'notification processing not authorized' using errcode='42501';end if;
  update public.requisition_notifications set state='delivered',attempts=attempts+1,attempted_at=now(),delivered_at=now(),provider_reference='internal'
    where id in(select n.id from public.requisition_notifications n join public.profiles p on p.id=n.recipient_user_id and p.status='active'
      where n.state='pending' and n.channel='internal' and public.can_access_recipient(n.care_recipient_id)
        and (p.role='admin' and p.global_scope or exists(select 1 from public.care_recipient_memberships m where m.care_recipient_id=n.care_recipient_id and m.user_id=p.id and m.status='active'))
      order by n.created_at for update of n skip locked limit greatest(1,least(coalesce(p_limit,50),100)));
  get diagnostics v_processed=row_count;
  select count(*) into v_external from public.requisition_notifications where state='pending' and channel<>'internal';
  return query select v_processed,v_external;
end; $$;

revoke all on public.care_recipient_invitations,public.recipient_notification_settings,public.stock_alert_rules,public.stock_alert_events from anon,public,authenticated;
grant select on public.care_recipient_invitations,public.recipient_notification_settings,public.stock_alert_rules,public.stock_alert_events to authenticated;
do $$ declare f record;begin
  for f in select p.oid::regprocedure signature,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
    and p.proname in ('admin_create_invitation','admin_resend_invitation','revoke_invitation','accept_invitation','configure_recipient_notification','configure_stock_alert','claim_notification_jobs','complete_notification_job','retry_notification_job','notification_webhook','enqueue_patient_event','evaluate_stock_alert','after_stock_alert')
  loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    if f.proname not in ('notification_webhook','enqueue_patient_event','evaluate_stock_alert','after_stock_alert') then execute format('grant execute on function %s to authenticated',f.signature);end if;
    if f.proname in ('notification_webhook','claim_notification_jobs','complete_notification_job') then execute format('grant execute on function %s to service_role',f.signature);end if;
  end loop;
end; $$;
