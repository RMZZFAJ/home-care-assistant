-- Scheduled work, never attendance. No existing patient or document is changed.
create extension if not exists btree_gist with schema extensions;
insert into public.capability_definitions(code,default_roles,critical) values
 ('schedule.read.own',array['professional','supervisor'],false),
 ('schedule.read.team',array['admin','family','supervisor','reader'],false),
 ('schedule.propose',array['professional','supervisor'],false),
 ('schedule.manage.own',array[]::text[],true),
 ('schedule.manage.team',array['admin','family','supervisor'],true),
 ('schedule.types.manage',array['admin','family','supervisor'],false),
 ('bal.schedule.manage',array['admin','family'],true),
 ('bal.defer.request',array['professional','supervisor'],false),
 ('bal.defer.approve',array['admin','family'],true);

create table public.shift_types (
 id uuid primary key default gen_random_uuid(),care_recipient_id uuid not null references public.care_recipients(id),
 name text not null check(length(trim(name)) between 2 and 100),starts_local time not null,
 duration_minutes integer not null check(duration_minutes between 15 and 1440),
 is_active boolean not null default true,version integer not null default 1,
 created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),
 unique(care_recipient_id,name),unique(care_recipient_id,id)
);
create table public.shift_series (
 id uuid primary key default gen_random_uuid(),care_recipient_id uuid not null references public.care_recipients(id),
 professional_id uuid not null references public.profiles(id),shift_type_id uuid not null,
 timezone text not null default 'America/Sao_Paulo',recurrence text not null check(recurrence in ('once','weekly','cycle')),
 weekdays integer[] not null default '{}',work_hours integer,rest_hours integer,
 anchor_date date not null,valid_until date not null,ended_on date,
 status text not null check(status in ('proposed','published','rejected')),
 notes text not null default '' check(length(notes)<=2000),version integer not null default 1,
 replaces_id uuid references public.shift_series(id),created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 foreign key(care_recipient_id,shift_type_id) references public.shift_types(care_recipient_id,id),
 check(valid_until>=anchor_date and valid_until<=anchor_date+366),
 check(recurrence<>'weekly' or cardinality(weekdays) between 1 and 7 and weekdays <@ array[0,1,2,3,4,5,6]),
 check(recurrence<>'cycle' or (work_hours,rest_hours) in ((12,36),(24,48),(24,24))),
 unique(care_recipient_id,id)
);
create table public.scheduled_shifts (
 id uuid primary key default gen_random_uuid(),care_recipient_id uuid not null references public.care_recipients(id),
 series_id uuid not null,professional_id uuid not null references public.profiles(id),shift_type_id uuid not null,
 starts_at timestamptz not null,ends_at timestamptz not null,timezone text not null,
 original_starts_at timestamptz not null,status text not null check(status in ('proposed','published','cancelled','rejected')),
 is_exception boolean not null default false,notes text not null default '',version integer not null default 1,
 foreign key(care_recipient_id,series_id) references public.shift_series(care_recipient_id,id),
 foreign key(care_recipient_id,shift_type_id) references public.shift_types(care_recipient_id,id),
 check(ends_at>starts_at and ends_at<=starts_at+interval '24 hours'),
 unique(series_id,original_starts_at),unique(care_recipient_id,id),
 exclude using gist(professional_id extensions.gist_uuid_ops with =,tstzrange(starts_at,ends_at,'[)') with &&) where(status='published')
);
create index scheduled_shifts_patient_window on public.scheduled_shifts(care_recipient_id,starts_at);
create table public.shift_events (
 id uuid primary key default gen_random_uuid(),care_recipient_id uuid not null references public.care_recipients(id),
 series_id uuid references public.shift_series(id),shift_id uuid references public.scheduled_shifts(id),
 professional_id uuid references public.profiles(id),action text not null,reason text not null,
 before_state jsonb,after_state jsonb,actor_id uuid not null references public.profiles(id),created_at timestamptz not null default now()
);
create index shift_events_patient on public.shift_events(care_recipient_id,created_at desc);
create table public.shift_change_requests (
 id uuid primary key default gen_random_uuid(),care_recipient_id uuid not null references public.care_recipients(id),
 shift_id uuid not null,professional_id uuid not null references public.profiles(id),
 proposed_professional_id uuid not null references public.profiles(id),starts_at timestamptz not null,ends_at timestamptz not null,
 reason text not null check(length(trim(reason)) between 3 and 1000),shift_version integer not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 decided_by uuid references public.profiles(id),decision_reason text,created_at timestamptz not null default now(),
 foreign key(care_recipient_id,shift_id) references public.scheduled_shifts(care_recipient_id,id),
 check(ends_at>starts_at and ends_at<=starts_at+interval '24 hours')
);
create index shift_changes_patient on public.shift_change_requests(care_recipient_id,status);
create table private.schedule_commands (
 care_recipient_id uuid not null references public.care_recipients(id),actor_id uuid not null references public.profiles(id),
 key uuid not null,request jsonb not null,result jsonb not null,created_at timestamptz not null default now(),
 primary key(care_recipient_id,actor_id,key)
);
alter table private.schedule_commands enable row level security;
revoke all on private.schedule_commands from public,anon,authenticated,service_role;

create function private.schedule_worker(p_patient uuid,p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id
 where m.care_recipient_id=p_patient and m.user_id=p_user and m.status='active' and p.status='active' and m.role in ('professional','supervisor'));
$$;
create function private.schedule_visible(p_patient uuid,p_worker uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.can(p_patient,'schedule.read.team') or p_worker=auth.uid() and private.can(p_patient,'schedule.read.own');
$$;
do $$declare t text;begin
 foreach t in array array['shift_types','shift_series','scheduled_shifts','shift_events','shift_change_requests'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;end;$$;
create policy shift_type_read on public.shift_types for select to authenticated using(
 private.can(care_recipient_id,'schedule.read.team') or private.can(care_recipient_id,'schedule.read.own'));
create policy shift_series_read on public.shift_series for select to authenticated using(private.schedule_visible(care_recipient_id,professional_id));
create policy scheduled_shift_read on public.scheduled_shifts for select to authenticated using(private.schedule_visible(care_recipient_id,professional_id));
create policy shift_event_read on public.shift_events for select to authenticated using(private.schedule_visible(care_recipient_id,professional_id));
create policy shift_changes_read on public.shift_change_requests for select to authenticated using(private.schedule_visible(care_recipient_id,professional_id));
-- Policies may call this single read-only helper, which rechecks session/capabilities.
grant execute on function private.schedule_visible(uuid,uuid) to authenticated;

-- Reuse V4 routing, provider opt-ins, quiet hours, dedupe and delivery states.
alter table public.operational_reminders drop constraint operational_reminders_kind_check;
alter table public.operational_reminders add constraint operational_reminders_kind_check check(kind in ('bal','shift','schedule'));
alter table public.operational_reminders add column shift_event_id uuid references public.shift_events(id);
alter table public.operational_reminders drop constraint operational_reminders_care_recipient_id_user_id_kind_period_key;
create unique index reminders_legacy_once on public.operational_reminders(care_recipient_id,user_id,kind,period) where shift_event_id is null;
create unique index reminders_shift_event_once on public.operational_reminders(shift_event_id,user_id) where shift_event_id is not null;

create function private.schedule_event(p_patient uuid,p_series uuid,p_shift uuid,p_worker uuid,p_action text,p_reason text,p_before jsonb,p_after jsonb) returns void
language plpgsql security definer set search_path='' as $$declare eid uuid;rid uuid;m record;begin
 insert into public.shift_events(care_recipient_id,series_id,shift_id,professional_id,action,reason,before_state,after_state,actor_id)
 values(p_patient,p_series,p_shift,p_worker,p_action,p_reason,p_before,p_after,auth.uid()) returning id into eid;
 for m in select user_id from public.care_recipient_memberships where care_recipient_id=p_patient and status='active'
 and (user_id=p_worker or role in ('admin','family','supervisor')) loop
 insert into public.operational_reminders(care_recipient_id,user_id,kind,period,expected_at,shift_event_id)
 values(p_patient,m.user_id,'schedule',current_date,now(),eid) returning id into rid;
 perform private.enqueue_notice(p_patient,m.user_id,p_action,p_reminder=>rid);
 end loop;end;$$;

create function public.schedule_workspace(p_patient uuid,p_from date,p_until date) returns jsonb
language plpgsql stable security definer set search_path='' as $$begin
 if not(private.can(p_patient,'schedule.read.team') or private.can(p_patient,'schedule.read.own')) then raise exception 'schedule authorization required' using errcode='42501';end if;
 if p_from is null or p_until is null or p_until<p_from or p_until>p_from+42 then raise exception 'invalid schedule interval';end if;
 return jsonb_build_object('types',coalesce((select jsonb_agg(to_jsonb(t) order by t.starts_local,t.name) from public.shift_types t where t.care_recipient_id=p_patient),'[]'),
 'shifts',coalesce((select jsonb_agg(to_jsonb(s)||jsonb_build_object('professional_name',p.full_name,'type_name',t.name) order by s.starts_at,p.full_name)
 from public.scheduled_shifts s join public.profiles p on p.id=s.professional_id join public.shift_types t on t.id=s.shift_type_id
 where s.care_recipient_id=p_patient and private.schedule_visible(p_patient,s.professional_id)
 and s.starts_at<((p_until+1)::timestamp at time zone s.timezone) and s.ends_at>(p_from::timestamp at time zone s.timezone)),'[]'),
 'professionals',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.full_name) order by p.full_name)
 from public.profiles p where private.schedule_worker(p_patient,p.id) and (private.can(p_patient,'schedule.read.team') or private.can(p_patient,'schedule.propose') or p.id=auth.uid())),'[]'),
 'changes',coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc) from public.shift_change_requests c where c.care_recipient_id=p_patient
 and private.schedule_visible(p_patient,c.professional_id) and c.status='pending'),'[]'),
 'series',coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at desc) from public.shift_series s where s.care_recipient_id=p_patient
 and private.schedule_visible(p_patient,s.professional_id) and s.valid_until>=p_from and s.anchor_date<=p_until),'[]'),
 'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc) from (select * from public.shift_events where care_recipient_id=p_patient
 and private.schedule_visible(p_patient,professional_id) order by created_at desc limit 100) e),'[]'));
end;$$;

create function public.schedule_command(p_patient uuid,p_action text,p_body jsonb,p_key uuid,p_version integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare old private.schedule_commands;req jsonb;result jsonb;typ public.shift_types;ser public.shift_series;s public.scheduled_shifts;proposal public.shift_change_requests;
 worker uuid;sid uuid;before_row jsonb;day date;begin_at timestamptz;end_at timestamptz;can_publish boolean;event_name text;reason text:=trim(coalesce(p_body->>'reason',''));cutoff date;
begin
 if auth.uid() is null or not public.can_access_recipient(p_patient) or not exists(select 1 from public.care_recipients where id=p_patient and is_active) then raise exception 'schedule authorization required' using errcode='42501';end if;
 if p_key is null or p_body is null or jsonb_typeof(p_body)<>'object' then raise exception 'invalid schedule command';end if;
 perform pg_advisory_xact_lock(hashtextextended('schedule:'||p_patient,0));
 req:=jsonb_build_object('action',p_action,'body',p_body,'version',p_version);
 select * into old from private.schedule_commands where care_recipient_id=p_patient and actor_id=auth.uid() and key=p_key;
 if found then
 if not(private.can(p_patient,'schedule.manage.team') or private.can(p_patient,'schedule.manage.own') or private.can(p_patient,'schedule.propose') or private.can(p_patient,'schedule.types.manage')) then raise exception 'schedule authorization required' using errcode='42501';end if;
 if old.request<>req then raise exception 'idempotency payload mismatch';end if;return old.result;end if;
 if p_action='type' then
 perform private.require_cap(p_patient,'schedule.types.manage');
 if p_body->>'id' is not null then
 select * into typ from public.shift_types where id=(p_body->>'id')::uuid and care_recipient_id=p_patient for update;
 if not found then raise exception 'shift type not found';end if;
 if typ.version is distinct from p_version then raise exception 'stale document';end if;before_row:=to_jsonb(typ);
 -- Existing occurrences retain their real intervals; changing a type affects new series only.
 update public.shift_types set name=trim(p_body->>'name'),starts_local=(p_body->>'startsLocal')::time,duration_minutes=(p_body->>'durationMinutes')::integer,
 is_active=coalesce((p_body->>'active')::boolean,true),version=version+1 where id=typ.id returning * into typ;
 else
 insert into public.shift_types(care_recipient_id,name,starts_local,duration_minutes,created_by)
 values(p_patient,trim(p_body->>'name'),(p_body->>'startsLocal')::time,(p_body->>'durationMinutes')::integer,auth.uid()) returning * into typ;
 end if;
 result:=to_jsonb(typ);perform private.schedule_event(p_patient,null,null,null,'schedule.type',reason,before_row,result);
 elsif p_action='series' then
 worker:=(p_body->>'professionalId')::uuid;
 can_publish:=private.can(p_patient,'schedule.manage.team') or worker=auth.uid() and private.can(p_patient,'schedule.manage.own');
 if not can_publish and not(worker=auth.uid() and private.can(p_patient,'schedule.propose')) then raise exception 'schedule authorization required' using errcode='42501';end if;
 if not private.schedule_worker(p_patient,worker) then raise exception 'invalid scheduled professional';end if;
 select * into typ from public.shift_types where id=(p_body->>'shiftTypeId')::uuid and care_recipient_id=p_patient and is_active;
 if not found then raise exception 'shift type not found';end if;
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=coalesce(p_body->>'timezone','America/Sao_Paulo')) then raise exception 'invalid timezone';end if;
 if (p_body->>'anchorDate')::date<(now() at time zone coalesce(p_body->>'timezone','America/Sao_Paulo'))::date and length(reason)<3 then raise exception 'retroactive reason required';end if;
 if p_body->>'recurrence'='cycle' and typ.duration_minutes<>(p_body->>'workHours')::integer*60 then raise exception 'cycle duration differs from shift type';end if;
 if p_body->>'replacesId' is not null then
 select * into ser from public.shift_series where id=(p_body->>'replacesId')::uuid and care_recipient_id=p_patient for update;
 if not found or ser.ended_on is null or not can_publish then raise exception 'end the previous series before replacing it';end if;
 end if;
 insert into public.shift_series(care_recipient_id,professional_id,shift_type_id,timezone,recurrence,weekdays,work_hours,rest_hours,anchor_date,valid_until,status,notes,created_by,replaces_id)
 values(p_patient,worker,typ.id,coalesce(p_body->>'timezone','America/Sao_Paulo'),p_body->>'recurrence',
 array(select jsonb_array_elements_text(coalesce(p_body->'weekdays','[]'))::integer),(p_body->>'workHours')::integer,(p_body->>'restHours')::integer,
 (p_body->>'anchorDate')::date,case when p_body->>'recurrence'='once' then (p_body->>'anchorDate')::date else (p_body->>'validUntil')::date end,
 case when can_publish then 'published' else 'proposed' end,coalesce(p_body->>'notes',''),auth.uid(),(p_body->>'replacesId')::uuid) returning * into ser;
 perform pg_advisory_xact_lock(hashtextextended('schedule-worker:'||worker,0));
 begin_at:=(ser.anchor_date+typ.starts_local) at time zone ser.timezone;
 for day in select generate_series(ser.anchor_date::timestamp,ser.valid_until::timestamp,interval '1 day')::date loop
 if ser.recurrence='weekly' and not(extract(dow from day)::integer=any(ser.weekdays)) then continue;end if;
 if ser.recurrence<>'cycle' then begin_at:=(day+typ.starts_local) at time zone ser.timezone;
 elsif day<>ser.anchor_date then continue;end if;
 loop
 end_at:=begin_at+make_interval(mins=>typ.duration_minutes);
 insert into public.scheduled_shifts(care_recipient_id,series_id,professional_id,shift_type_id,starts_at,ends_at,timezone,original_starts_at,status,notes)
 values(p_patient,ser.id,worker,typ.id,begin_at,end_at,ser.timezone,begin_at,ser.status,ser.notes);
 exit when ser.recurrence<>'cycle';
 begin_at:=begin_at+make_interval(hours=>ser.work_hours+ser.rest_hours);
 exit when (begin_at at time zone ser.timezone)::date>ser.valid_until;
 end loop;end loop;
 result:=to_jsonb(ser);perform private.schedule_event(p_patient,ser.id,null,worker,'schedule.'||ser.status,reason,null,result);
 elsif p_action in ('approve','reject','end_series') then
 select * into ser from public.shift_series where care_recipient_id=p_patient and id=(p_body->>'id')::uuid for update;
 if not found then raise exception 'series not found';end if;
 if not(private.can(p_patient,'schedule.manage.team') or ser.professional_id=auth.uid() and private.can(p_patient,'schedule.manage.own')) then raise exception 'schedule authorization required' using errcode='42501';end if;
 if ser.version is distinct from p_version then raise exception 'stale document';end if;
 before_row:=to_jsonb(ser);worker:=ser.professional_id;
 perform pg_advisory_xact_lock(hashtextextended('schedule-worker:'||worker,0));
 if p_action='end_series' then
 cutoff:=(p_body->>'fromDate')::date;
 if cutoff is null or length(reason)<3 then raise exception 'reason and effective date required';end if;
 update public.shift_series set ended_on=cutoff,version=version+1 where id=ser.id returning * into ser;
 update public.scheduled_shifts set status='cancelled',version=version+1 where series_id=ser.id and (starts_at at time zone timezone)::date>=cutoff and status in ('published','proposed');
 else
 if ser.status<>'proposed' then raise exception 'invalid proposal state';end if;
 if p_action='reject' and length(reason)<3 then raise exception 'rejection reason required';end if;
 update public.shift_series set status=case when p_action='approve' then 'published' else 'rejected' end,version=version+1 where id=ser.id returning * into ser;
 update public.scheduled_shifts set status=ser.status,version=version+1 where series_id=ser.id;
 end if;
 result:=to_jsonb(ser);perform private.schedule_event(p_patient,ser.id,null,worker,'schedule.'||p_action,reason,before_row,result);
 elsif p_action='propose_change' then
 perform private.require_cap(p_patient,'schedule.propose');
 select * into s from public.scheduled_shifts where care_recipient_id=p_patient and id=(p_body->>'id')::uuid for update;
 if not found then raise exception 'shift not found';end if;
 if s.professional_id<>auth.uid() and not private.can(p_patient,'schedule.read.team') then raise exception 'schedule authorization required' using errcode='42501';end if;
 if s.version is distinct from p_version then raise exception 'stale document';end if;
 worker:=coalesce((p_body->>'professionalId')::uuid,s.professional_id);
 if s.status<>'published' or not private.schedule_worker(p_patient,worker) then raise exception 'invalid proposed shift';end if;
 insert into public.shift_change_requests(care_recipient_id,shift_id,professional_id,proposed_professional_id,starts_at,ends_at,reason,shift_version)
 values(p_patient,s.id,s.professional_id,worker,coalesce((p_body->>'startsAt')::timestamptz,s.starts_at),coalesce((p_body->>'endsAt')::timestamptz,s.ends_at),reason,s.version) returning * into proposal;
 result:=to_jsonb(proposal);perform private.schedule_event(p_patient,s.series_id,s.id,s.professional_id,'schedule.change_requested',reason,to_jsonb(s),result);
 elsif p_action='decide_change' then
 perform private.require_cap(p_patient,'schedule.manage.team');
 select * into proposal from public.shift_change_requests where id=(p_body->>'id')::uuid and care_recipient_id=p_patient for update;
 if not found then raise exception 'proposal not found';end if;
 if proposal.status<>'pending' then raise exception 'stale document';end if;
 if (p_body->>'approve')::boolean then
 result:=public.schedule_command(p_patient,'change',jsonb_build_object('id',proposal.shift_id,'professionalId',proposal.proposed_professional_id,'startsAt',proposal.starts_at,'endsAt',proposal.ends_at,'reason',proposal.reason),gen_random_uuid(),proposal.shift_version);
 elsif length(reason)<3 then raise exception 'rejection reason required';end if;
 update public.shift_change_requests set status=case when (p_body->>'approve')::boolean then 'approved' else 'rejected' end,decided_by=auth.uid(),decision_reason=reason where id=proposal.id returning * into proposal;
 result:=to_jsonb(proposal);perform private.schedule_event(p_patient,null,proposal.shift_id,proposal.professional_id,'schedule.change_decided',reason,null,result);
 elsif p_action in ('change','cancel') then
 select * into s from public.scheduled_shifts where care_recipient_id=p_patient and id=(p_body->>'id')::uuid for update;
 if not found then raise exception 'shift not found';end if;
 if not(private.can(p_patient,'schedule.manage.team') or s.professional_id=auth.uid() and private.can(p_patient,'schedule.manage.own')) then raise exception 'schedule authorization required' using errcode='42501';end if;
 if s.version is distinct from p_version then raise exception 'stale document';end if;
 if s.status<>'published' or length(reason)<3 then raise exception 'published shift and reason required';end if;
 before_row:=to_jsonb(s);worker:=coalesce((p_body->>'professionalId')::uuid,s.professional_id);
 -- Lock both identities in a deterministic order for concurrent substitutions.
 for sid in select distinct x from unnest(array[worker,s.professional_id]) x order by x loop
 perform pg_advisory_xact_lock(hashtextextended('schedule-worker:'||sid,0));end loop;
 if not private.schedule_worker(p_patient,worker) then raise exception 'invalid scheduled professional';end if;
 if worker<>s.professional_id and not private.can(p_patient,'schedule.manage.team') then raise exception 'schedule authorization required' using errcode='42501';end if;
 update public.scheduled_shifts set professional_id=worker,starts_at=coalesce((p_body->>'startsAt')::timestamptz,starts_at),
 ends_at=coalesce((p_body->>'endsAt')::timestamptz,ends_at),status=case when p_action='cancel' then 'cancelled' else status end,
 is_exception=true,notes=coalesce(p_body->>'notes',notes),version=version+1 where id=s.id returning * into s;
 result:=to_jsonb(s);perform private.schedule_event(p_patient,s.series_id,s.id,worker,'schedule.'||p_action,reason,before_row,result);
 else raise exception 'invalid schedule action';end if;
 insert into private.schedule_commands(care_recipient_id,actor_id,key,request,result) values(p_patient,auth.uid(),p_key,req,result);
 return result;
exception when exclusion_violation then raise exception 'schedule overlap' using errcode='23P01';
end;$$;
revoke all on function private.schedule_worker(uuid,uuid),private.schedule_event(uuid,uuid,uuid,uuid,text,text,jsonb,jsonb) from public,anon,authenticated,service_role;
revoke all on function private.schedule_visible(uuid,uuid) from public,anon,service_role;
revoke all on function public.schedule_workspace(uuid,date,date),public.schedule_command(uuid,text,jsonb,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.schedule_workspace(uuid,date,date),public.schedule_command(uuid,text,jsonb,uuid,integer) to authenticated;
