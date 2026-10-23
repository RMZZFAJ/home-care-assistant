-- Authority is selected explicitly and belongs to a real, revocable Auth session.
create table private.authority_sessions (
 session_id uuid primary key references auth.sessions(id) on delete cascade,
 user_id uuid not null references public.profiles(id),
 mode text not null check(mode in ('global','patient')),
 care_recipient_id uuid references public.care_recipients(id),
 revision bigint not null default 1,updated_at timestamptz not null default now(),
 check((mode='global')=(care_recipient_id is null))
);
alter table private.authority_sessions enable row level security;
revoke all on private.authority_sessions from public,anon,authenticated,service_role;
create table private.worker_authority (
 backend_pid integer not null,transaction_id bigint not null,user_id uuid not null references public.profiles(id),
 care_recipient_id uuid not null references public.care_recipients(id),purpose text not null,
 primary key(backend_pid,transaction_id)
);
alter table private.worker_authority enable row level security;
revoke all on private.worker_authority from public,anon,authenticated,service_role;
alter table public.document_events add column actor_name text,add column authority_context jsonb;

create function private.auth_session() returns uuid language sql stable security definer set search_path='' as $$
 select s.id from auth.sessions s join public.profiles p on p.id=s.user_id
 where s.id=nullif(auth.jwt()->>'session_id','')::uuid and s.user_id=auth.uid()
 and p.status='active' and (s.not_after is null or s.not_after>now());
$$;
create function private.global_identity() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and status='active' and role='admin' and global_scope);
$$;
create function public.my_active_context() returns jsonb language sql stable security definer set search_path='' as $$
 select to_jsonb(a)-'session_id'-'user_id' from private.authority_sessions a
 where a.session_id=private.auth_session() and a.user_id=auth.uid()
 and (a.mode='global' and private.global_identity() or a.mode='patient' and exists(
 select 1 from public.care_recipient_memberships m where m.user_id=a.user_id and m.care_recipient_id=a.care_recipient_id and m.status='active'));
$$;
create function public.select_active_context(p_patient uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare sid uuid:=private.auth_session();begin
 if sid is null then raise exception 'active Auth session required' using errcode='42501';end if;
 if p_patient is null then
 if not private.global_identity() then raise exception 'global authorization required' using errcode='42501';end if;
 elsif not exists(select 1 from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=auth.uid() and status='active') then
 raise exception 'active patient membership required' using errcode='42501';end if;
 insert into private.authority_sessions(session_id,user_id,mode,care_recipient_id)
 values(sid,auth.uid(),case when p_patient is null then 'global' else 'patient' end,p_patient)
 on conflict(session_id) do update set mode=excluded.mode,care_recipient_id=excluded.care_recipient_id,revision=private.authority_sessions.revision+1,updated_at=now();
 insert into public.audit_events(actor_id,action,entity_type,metadata) values(auth.uid(),'authority.selected','session',jsonb_build_object('care_recipient_id',p_patient,'mode',case when p_patient is null then 'global' else 'patient' end));
 return public.my_active_context();
end;$$;
create or replace function public.is_global_administrator() returns boolean language sql stable security definer set search_path='' as $$
 select private.global_identity() and exists(select 1 from private.authority_sessions where session_id=private.auth_session() and user_id=auth.uid() and mode='global');
$$;
create or replace function public.recipient_role(p_recipient_id uuid) returns public.profile_role
language sql stable security definer set search_path='' as $$
 select m.role from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id
 join private.authority_sessions a on a.session_id=private.auth_session() and a.user_id=m.user_id and a.mode='patient' and a.care_recipient_id=m.care_recipient_id
 where m.user_id=auth.uid() and m.care_recipient_id=p_recipient_id and m.status='active' and p.status='active';
$$;
create or replace function public.can_access_recipient(p_recipient_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.recipient_role(p_recipient_id) is not null;
$$;
create or replace function public.can_manage_recipient(p_recipient_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(public.recipient_role(p_recipient_id)='admin',false);
$$;
-- This helper evaluates recipients, independently of their currently selected UI context.
create function private.member_can(p_patient uuid,p_user uuid,p_capability text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare r text;v boolean;begin
 select m.role::text into r from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id
 where m.care_recipient_id=p_patient and m.user_id=p_user and m.status='active' and p.status='active';
 if r is null then return false;end if;
 if p_capability='access.manage' then return r='admin';end if;
 if p_capability like 'com.%' and r not in ('admin','family') then return false;end if;
 select enabled into v from public.capability_overrides where care_recipient_id=p_patient and capability=p_capability and subject_user=p_user;
 if found then return v;end if;
 select enabled into v from public.capability_overrides where care_recipient_id=p_patient and capability=p_capability and subject_role=r;
 if found then return v;end if;
 return coalesce((select r=any(default_roles) from public.capability_definitions where code=p_capability),false);
end;$$;
create or replace function private.can(p_patient uuid,p_capability text) returns boolean
language sql stable security definer set search_path='' as $$
 select public.can_access_recipient(p_patient) and private.member_can(p_patient,auth.uid(),p_capability);
$$;
create or replace function private.user_can(p_patient uuid,p_user uuid,p_cap text) returns boolean
language sql stable security definer set search_path='' as $$ select private.member_can(p_patient,p_user,p_cap);$$;

create or replace function public.my_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare person public.profiles;patients jsonb;begin
 select * into person from public.profiles where id=auth.uid() and status='active';
 if not found or private.auth_session() is null then raise exception 'active Auth session required' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'display_name',c.display_name,'is_active',c.is_active,'is_development',c.is_development,
 'role',m.role,'hasMembership',m.user_id is not null,'capabilities',case when public.can_access_recipient(c.id) then public.patient_capabilities(c.id) else '{}'::jsonb end) order by c.display_name,c.id),'[]') into patients
 from public.care_recipients c left join public.care_recipient_memberships m on m.care_recipient_id=c.id and m.user_id=person.id and m.status='active'
 where m.user_id is not null or private.global_identity();
 return jsonb_build_object('userId',person.id,'fullName',person.full_name,'isGlobalAdmin',private.global_identity(),'activeContext',public.my_active_context(),'patients',patients,'avatarPath',person.avatar_path);
end;$$;

-- Local administrators act directly. Global changes are proposals to a different local administrator.
create or replace function private.guard_membership_elevation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null and current_user<>'authenticated' then return new;end if;
 if not public.can_manage_recipient(new.care_recipient_id) then raise exception 'local administrator required' using errcode='42501';end if;
 return new;
end;$$;

create or replace function public.configure_patient_access(p_patient uuid,p_kind text,p_change jsonb,p_key uuid,p_version integer,p_request_id uuid default null,p_decision text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.patient_settings;c public.access_change_requests;rid uuid;local_admin boolean:=public.can_manage_recipient(p_patient);x jsonb;begin
 if not local_admin and not public.is_global_administrator() then raise exception 'administrator authorization required' using errcode='42501';end if;
 if not exists(select 1 from public.care_recipients where id=p_patient) then raise exception 'patient required';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
 insert into public.patient_settings(care_recipient_id) values(p_patient) on conflict do nothing;
 select * into s from public.patient_settings where care_recipient_id=p_patient for update;
 if p_request_id is not null then
 select * into strict c from public.access_change_requests where id=p_request_id and care_recipient_id=p_patient for update;
 if not local_admin or c.proposed_by=auth.uid() then raise exception 'distinct patient administrator required' using errcode='42501';end if;
 if c.status<>'pending' then return to_jsonb(c);end if;
 if p_decision is null or p_decision not in ('approve','reject') then raise exception 'invalid decision';end if;
 if p_decision='approve' and s.version<>c.base_version then raise exception 'stale policy version' using errcode='40001';end if;
 update public.access_change_requests set approved_by=auth.uid() where id=c.id;
 if p_decision='approve' then perform private.apply_access_change(c.id);
 else update public.access_change_requests set status='rejected',decided_at=now() where id=c.id;end if;
 return (select to_jsonb(q) from public.access_change_requests q where id=c.id);
 end if;
 if p_key is null then raise exception 'idempotency key required';end if;
 select * into c from public.access_change_requests where care_recipient_id=p_patient and idempotency_key=p_key;
 if found then
 if c.kind<>p_kind or c.proposed<>p_change or c.proposed_by<>auth.uid() then raise exception 'idempotency conflict' using errcode='23505';end if;
 return to_jsonb(c);end if;
 if p_version is null or p_version<>s.version then raise exception 'stale policy version' using errcode='40001';end if;
 if jsonb_typeof(p_change) is distinct from 'object' or length(p_change::text)>64000 then raise exception 'invalid change';end if;
 if p_kind='settings' then
 if exists(select 1 from jsonb_object_keys(p_change) k where k not in ('balDay','balReview','balApprovers','balRequirement','whatsappSimpleAcceptance','scienceRequired','scienceRoles','scienceUsers','scienceRequirement','scienceByDispatch','scienceAutomatic','scienceWhatsApp','archiveDays','patientShortName','reminderHours','reminderRepeatHours','shareWaitSeconds','shiftReminder','balReminderUsers'))
 or p_change ? 'balDay' and p_change->'balDay'<>'null'::jsonb and (p_change->>'balDay')::integer not between 0 and 6
 or p_change ? 'balReview' and p_change->>'balReview' not in ('optional','required')
 or p_change ? 'balRequirement' and p_change->>'balRequirement' not in ('any','all')
 or p_change ? 'scienceRequirement' and p_change->>'scienceRequirement' not in ('any','all')
 or p_change ? 'balApprovers' and (jsonb_typeof(p_change->'balApprovers')<>'array' or jsonb_array_length(p_change->'balApprovers') not between 1 and 2 or exists(select 1 from jsonb_array_elements_text(p_change->'balApprovers') z where z not in ('family','supervisor')))
 or p_change ? 'scienceRoles' and (jsonb_typeof(p_change->'scienceRoles')<>'array' or exists(select 1 from jsonb_array_elements_text(p_change->'scienceRoles') z where z not in ('admin','family','supervisor','professional')))
 or p_change ? 'scienceUsers' and (jsonb_typeof(p_change->'scienceUsers')<>'array' or exists(select 1 from jsonb_array_elements_text(p_change->'scienceUsers') z where not exists(select 1 from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=z::uuid and status='active')))
 or exists(select 1 from jsonb_each(p_change) z where z.key in ('whatsappSimpleAcceptance','scienceRequired','scienceByDispatch','scienceAutomatic','scienceWhatsApp') and jsonb_typeof(z.value)<>'boolean')
 or p_change ? 'archiveDays' and (p_change->>'archiveDays')::integer not between 1 and 365
 or p_change ? 'reminderHours' and (p_change->>'reminderHours')::integer not between 1 and 720
 or p_change ? 'reminderRepeatHours' and (p_change->>'reminderRepeatHours')::integer not between 1 and 720
 or p_change ? 'shareWaitSeconds' and (p_change->>'shareWaitSeconds')::integer not between 0 and 10
 or p_change ? 'patientShortName' and length(trim(p_change->>'patientShortName')) not between 1 and 60 then raise exception 'invalid patient settings';end if;
 if p_change ? 'balReminderUsers' and (jsonb_typeof(p_change->'balReminderUsers') is distinct from 'array' or jsonb_array_length(p_change->'balReminderUsers')>100 or exists(select 1 from jsonb_array_elements_text(p_change->'balReminderUsers') u where not private.member_can(p_patient,u::uuid,'bal.count'))) then raise exception 'invalid BAL reminder recipients';end if;
 if p_change ? 'shiftReminder' and (jsonb_typeof(p_change->'shiftReminder') is distinct from 'object' or jsonb_typeof(p_change->'shiftReminder'->'enabled') is distinct from 'boolean' or coalesce((p_change->'shiftReminder'->>'hour')::integer,-1) not between 0 and 23
 or jsonb_typeof(p_change->'shiftReminder'->'days') is distinct from 'array' or jsonb_typeof(p_change->'shiftReminder'->'userIds') is distinct from 'array'
 or exists(select 1 from jsonb_array_elements_text(p_change->'shiftReminder'->'days') d where d not in ('0','1','2','3','4','5','6'))
 or exists(select 1 from jsonb_array_elements_text(p_change->'shiftReminder'->'userIds') u where not private.member_can(p_patient,u::uuid,'consumption.report'))) then raise exception 'invalid shift reminder policy';end if;
 elsif p_kind='capability' then
 if not exists(select 1 from public.capability_definitions where code=p_change->>'capability')
 or (p_change->>'subjectUser' is null)=(p_change->>'subjectRole' is null)
 or not(p_change ? 'enabled') or p_change->'enabled'<>'null'::jsonb and jsonb_typeof(p_change->'enabled')<>'boolean'
 or p_change->>'subjectRole' is not null and p_change->>'subjectRole' not in ('admin','family','supervisor','professional','reader') then raise exception 'invalid capability override';end if;
 if p_change->>'subjectUser' is not null and not exists(select 1 from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=(p_change->>'subjectUser')::uuid and status='active') then raise exception 'invalid patient member';end if;
 if p_change->>'capability'='access.manage' then raise exception 'administrator governance cannot be overridden';end if;
 elsif p_kind='membership' then
 if p_change->>'role' is null or p_change->>'role' not in ('admin','family','supervisor','professional','reader') or not exists(select 1 from public.profiles where id=(p_change->>'userId')::uuid and status='active') then raise exception 'invalid membership';end if;
 elsif p_kind='notification_rule' then
 if p_change->>'event' is null or p_change->>'role' not in ('admin','family','supervisor','professional','reader') or jsonb_typeof(p_change->'channels') is distinct from 'array' then raise exception 'invalid notification rule';end if;
 if p_change ? 'mode' and p_change->>'mode' not in ('required','optional','silent') then raise exception 'invalid notification mode';end if;
 elsif p_kind='administration' then
 if p_change->>'operation' is null or p_change->>'operation' not in ('recipient','product','adoptProduct','membershipStatus','alertRule','notificationRecipient') or jsonb_typeof(p_change->'args') is distinct from 'object' then raise exception 'invalid administrative proposal';end if;
 else raise exception 'invalid access change';end if;
 insert into public.access_change_requests(care_recipient_id,kind,proposed,base_version,proposed_by,idempotency_key)
 values(p_patient,p_kind,p_change,s.version,auth.uid(),p_key) returning id into rid;
 if local_admin then
 if p_kind='capability' and p_change->'enabled'='null'::jsonb then
 delete from public.capability_overrides where care_recipient_id=p_patient and capability=p_change->>'capability'
 and (subject_role=p_change->>'subjectRole' or subject_user=(p_change->>'subjectUser')::uuid);
 update public.patient_settings set version=version+1,updated_at=now() where care_recipient_id=p_patient;
 update public.access_change_requests set status='applied',decided_at=now() where id=rid;
 else perform private.apply_access_change(rid);end if;
 end if;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),case when local_admin then 'access.changed.local' else 'access.proposed.global' end,'access_change',rid,jsonb_build_object('care_recipient_id',p_patient,'kind',p_kind));
 return (select to_jsonb(q) from public.access_change_requests q where id=rid);
end;$$;

create function public.patient_governance(p_patient uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.can_manage_recipient(p_patient) and not public.is_global_administrator() then raise exception 'administrator authorization required' using errcode='42501';end if;
 return jsonb_build_object('data',coalesce((select to_jsonb(s) from public.patient_settings s where care_recipient_id=p_patient),jsonb_build_object('version',1,'settings','{}'::jsonb)),
 'directory',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'name',p.full_name,'role',m.role)) from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id where m.care_recipient_id=p_patient and m.status='active' and p.status='active'),'[]'),
 'definitions',(select jsonb_agg(to_jsonb(c) order by c.code) from public.capability_definitions c),
 'overrides',coalesce((select jsonb_agg(to_jsonb(c)) from public.capability_overrides c where care_recipient_id=p_patient),'[]'),
 'changes',coalesce((select jsonb_agg(to_jsonb(c) order by created_at desc) from (select * from public.access_change_requests where care_recipient_id=p_patient order by created_at desc limit 50) c),'[]'));
end;$$;

grant execute on function public.my_active_context(),public.select_active_context(uuid),public.patient_governance(uuid) to authenticated;
create function public.my_session_valid() returns boolean language sql stable security definer set search_path='' as $$ select private.auth_session() is not null;$$;
create function public.document_navigation_context(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('patientId',d.care_recipient_id,'displayName',c.display_name,'type',d.type)
 from public.operational_documents d join public.care_recipients c on c.id=d.care_recipient_id
 where d.id=p_id and private.auth_session() is not null and private.member_can(d.care_recipient_id,auth.uid(),lower(d.type)||'.read');
$$;
grant execute on function public.my_session_valid(),public.document_navigation_context(uuid) to authenticated;
-- Existing grants stay explicit; no legacy RPC is reopened.
revoke all on function private.auth_session(),private.global_identity(),private.member_can(uuid,uuid,text) from public,anon,authenticated,service_role;
