-- Opt-in BAL per actual scheduled shift. No existing patient is activated.
create table public.bal_regimes (
 care_recipient_id uuid primary key references public.care_recipients(id),enabled boolean not null default false,
 timezone text not null default 'America/Sao_Paulo',weekday integer not null check(weekday between 0 and 6),
 shift_type_id uuid not null,designated_professional_id uuid references public.profiles(id),starts_on date not null,
 version integer not null default 1,activated_at timestamptz,updated_by uuid not null references public.profiles(id),updated_at timestamptz not null default now(),
 foreign key(care_recipient_id,shift_type_id) references public.shift_types(care_recipient_id,id)
);
create table public.bal_cycles (
 id uuid primary key default gen_random_uuid(),care_recipient_id uuid not null references public.care_recipients(id),
 state text not null default 'open' check(state in ('open','counted')),document_id uuid references public.operational_documents(id),
 counted_at timestamptz,created_at timestamptz not null default now(),unique(care_recipient_id,id),
 check((state='open' and counted_at is null) or (state='counted' and counted_at is not null))
);
create unique index bal_single_open_cycle on public.bal_cycles(care_recipient_id) where state='open';
create unique index bal_cycle_document on public.bal_cycles(document_id) where document_id is not null;
create table public.bal_obligations (
 id uuid primary key default gen_random_uuid(),care_recipient_id uuid not null references public.care_recipients(id),cycle_id uuid not null,
 week_start date not null,original_start timestamptz not null,original_due timestamptz not null,regime_snapshot jsonb not null,
 state text not null default 'pending' check(state in ('pending','counted','regularized')),
 missed_at timestamptz,count_document_id uuid references public.operational_documents(id),regularized_by uuid references public.operational_documents(id),
 actual_count_at timestamptz,created_at timestamptz not null default now(),
 foreign key(care_recipient_id,cycle_id) references public.bal_cycles(care_recipient_id,id),unique(care_recipient_id,week_start),
 check(extract(isodow from week_start)=1),check(original_due>original_start),
 check(state='pending' and actual_count_at is null or state='counted' and count_document_id is not null and actual_count_at is not null
 or state='regularized' and regularized_by is not null and actual_count_at is not null)
);
create index bal_obligations_cycle on public.bal_obligations(cycle_id);
create table public.bal_assignments (
 id uuid primary key default gen_random_uuid(),care_recipient_id uuid not null references public.care_recipients(id),cycle_id uuid not null,
 shift_id uuid not null,shift_version integer not null,professional_id uuid not null references public.profiles(id),
 starts_at timestamptz not null,ends_at timestamptz not null,kind text not null check(kind in ('scheduled','transfer','deferred','recount')),
 status text not null default 'active' check(status in ('active','missed','deferred','invalidated','counted')),
 version integer not null default 1,missed_at timestamptz,created_at timestamptz not null default now(),
 foreign key(care_recipient_id,cycle_id) references public.bal_cycles(care_recipient_id,id),
 foreign key(care_recipient_id,shift_id) references public.scheduled_shifts(care_recipient_id,id),check(ends_at>starts_at),
 unique(care_recipient_id,id)
);
create unique index bal_single_active_assignment on public.bal_assignments(care_recipient_id) where status='active';
create index bal_assignments_cycle on public.bal_assignments(cycle_id,created_at desc);
create table public.bal_deferrals (
 id uuid primary key default gen_random_uuid(),care_recipient_id uuid not null references public.care_recipients(id),cycle_id uuid not null,
 assignment_id uuid not null,assignment_version integer not null,target_shift_id uuid not null,
 reason text not null check(length(trim(reason)) between 3 and 1000),requested_by uuid not null references public.profiles(id),
 status text not null default 'pending' check(status in ('pending','approved','rejected','stale')),
 decided_by uuid references public.profiles(id),decision_reason text,created_at timestamptz not null default now(),decided_at timestamptz,
 foreign key(care_recipient_id,cycle_id) references public.bal_cycles(care_recipient_id,id),
 foreign key(care_recipient_id,assignment_id) references public.bal_assignments(care_recipient_id,id),
 foreign key(care_recipient_id,target_shift_id) references public.scheduled_shifts(care_recipient_id,id)
);
create index bal_deferrals_patient on public.bal_deferrals(care_recipient_id,status);
create table public.bal_cycle_events (
 id uuid primary key default gen_random_uuid(),care_recipient_id uuid not null references public.care_recipients(id),
 cycle_id uuid references public.bal_cycles(id),assignment_id uuid references public.bal_assignments(id),event_key text not null,
 action text not null,reason text not null,details jsonb not null default '{}',actor_id uuid references public.profiles(id),
 created_at timestamptz not null default now(),unique(care_recipient_id,event_key)
);
create index bal_events_patient on public.bal_cycle_events(care_recipient_id,created_at desc);
create table private.bal_commands (
 care_recipient_id uuid not null references public.care_recipients(id),actor_id uuid not null references public.profiles(id),
 key uuid not null,request jsonb not null,result jsonb not null,primary key(care_recipient_id,actor_id,key)
);
alter table private.bal_commands enable row level security;
revoke all on private.bal_commands from public,anon,authenticated,service_role;
do $$declare t text;begin
 foreach t in array array['bal_regimes','bal_cycles','bal_obligations','bal_assignments','bal_deferrals','bal_cycle_events'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy bal_read on public.%I for select to authenticated using(private.can(care_recipient_id,''bal.read''))',t);
 end loop;end;$$;
alter table public.operational_reminders add column bal_event_id uuid references public.bal_cycle_events(id);
alter table public.operational_reminders drop constraint operational_reminders_kind_check;
alter table public.operational_reminders add constraint operational_reminders_kind_check check(kind in ('bal','shift','schedule','bal_cycle'));
drop index public.reminders_legacy_once;
create unique index reminders_legacy_once on public.operational_reminders(care_recipient_id,user_id,kind,period) where shift_event_id is null and bal_event_id is null;
create unique index reminders_bal_event_once on public.operational_reminders(bal_event_id,user_id) where bal_event_id is not null;

create function private.bal_family_authority(p_patient uuid,p_cap text) returns boolean language sql stable security definer set search_path='' as $$
 select private.can(p_patient,p_cap) and exists(select 1 from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=auth.uid() and status='active' and role in ('admin','family'));
$$;
create function private.bal_event(p_patient uuid,p_cycle uuid,p_assignment uuid,p_action text,p_reason text,p_details jsonb,p_key text) returns void
language plpgsql security definer set search_path='' as $$declare v_eid uuid;v_rid uuid;v_m record;v_worker uuid;begin
 insert into public.bal_cycle_events(care_recipient_id,cycle_id,assignment_id,event_key,action,reason,details,actor_id)
 values(p_patient,p_cycle,p_assignment,p_key,p_action,p_reason,p_details,auth.uid()) on conflict do nothing returning id into v_eid;
 if v_eid is null then return;end if;
 select professional_id into v_worker from public.bal_assignments where id=p_assignment;
 for v_m in select user_id,role from public.care_recipient_memberships where care_recipient_id=p_patient and status='active'
 and (user_id=v_worker or role in ('admin','family','supervisor')) loop
 if not private.member_can(p_patient,v_m.user_id,'bal.read') then continue;end if;
 insert into public.operational_reminders(care_recipient_id,user_id,kind,period,expected_at,bal_event_id)
 values(p_patient,v_m.user_id,'bal_cycle',current_date,now(),v_eid) returning id into v_rid;
 perform private.enqueue_notice(p_patient,v_m.user_id,p_action,p_reminder=>v_rid);
 end loop;end;$$;

create function private.bal_assign(p_patient uuid,p_cycle uuid,p_shift uuid,p_kind text) returns uuid
language plpgsql security definer set search_path='' as $$declare v_s public.scheduled_shifts;v_id uuid;begin
 select * into v_s from public.scheduled_shifts where care_recipient_id=p_patient and id=p_shift for share;
 if not found or v_s.status<>'published' or v_s.ends_at<=now() or not private.schedule_worker(p_patient,v_s.professional_id)
 or not private.member_can(p_patient,v_s.professional_id,'bal.count') then raise exception 'invalid balance target shift';end if;
 insert into public.bal_assignments(care_recipient_id,cycle_id,shift_id,shift_version,professional_id,starts_at,ends_at,kind)
 values(p_patient,p_cycle,v_s.id,v_s.version,v_s.professional_id,v_s.starts_at,v_s.ends_at,p_kind) returning id into v_id;
 perform private.bal_event(p_patient,p_cycle,v_id,'bal.cycle.assigned','Responsabilidade vinculada ao plantão real',to_jsonb(v_s),'assignment:'||v_id);
 return v_id;end;$$;

create function private.process_bal_patient(p_patient uuid,p_now timestamptz default now()) returns integer
language plpgsql security definer set search_path='' as $$
declare v_r public.bal_regimes;v_type public.shift_types;v_c public.bal_cycles;v_a public.bal_assignments;v_s public.scheduled_shifts;
 v_week date;v_today date;v_day date;v_start timestamptz;v_due timestamptz;v_floor timestamptz;v_matches integer;v_sid uuid;v_cycles integer:=0;v_i integer;v_was_missed boolean:=false;
begin
 perform pg_advisory_xact_lock(hashtextextended('bal:'||p_patient,0));
 select * into v_r from public.bal_regimes where care_recipient_id=p_patient and enabled;
 if not found or not exists(select 1 from public.care_recipients where id=p_patient and is_active) then return 0;end if;
 select * into strict v_type from public.shift_types where id=v_r.shift_type_id;
 v_today:=(p_now at time zone v_r.timezone)::date;
 v_week:=coalesce((select max(week_start)+7 from public.bal_obligations where care_recipient_id=p_patient),date_trunc('week',v_r.starts_on::timestamp)::date);
 -- Bounded historical catch-up; future runs continue from the same unique weeks.
 for v_i in 0..105 loop
 exit when v_week>v_today;
 v_day:=v_week+((v_r.weekday+6)%7);
 if v_day<v_r.starts_on then v_week:=v_week+7;continue;end if;
 v_start:=(v_day+v_type.starts_local) at time zone v_r.timezone;v_due:=v_start+make_interval(mins=>v_type.duration_minutes);
 select count(*),min(s.starts_at),min(s.ends_at) into v_matches,v_floor,v_due from public.scheduled_shifts s
 where s.care_recipient_id=p_patient and s.status='published' and s.shift_type_id=v_r.shift_type_id
 and (s.starts_at at time zone v_r.timezone)::date=v_day
 and (v_r.designated_professional_id is null or s.professional_id=v_r.designated_professional_id)
 and private.schedule_worker(p_patient,s.professional_id) and private.member_can(p_patient,s.professional_id,'bal.count');
 if v_matches=1 then v_start:=v_floor;else v_due:=v_start+make_interval(mins=>v_type.duration_minutes);end if;
 if v_start>p_now then v_week:=v_week+7;continue;end if;
 if not exists(select 1 from public.bal_obligations where care_recipient_id=p_patient and week_start=v_week) then
 select * into v_c from public.bal_cycles where care_recipient_id=p_patient and state='open' for update;
 if not found then insert into public.bal_cycles(care_recipient_id) values(p_patient) returning * into v_c;end if;
 insert into public.bal_obligations(care_recipient_id,cycle_id,week_start,original_start,original_due,regime_snapshot)
 values(p_patient,v_c.id,v_week,v_start,v_due,to_jsonb(v_r));
 perform private.bal_event(p_patient,v_c.id,null,'bal.cycle.opened','Obrigação semanal disponibilizada',jsonb_build_object('weekStart',v_week,'dueAt',v_due),'week:'||v_week);
 end if;v_week:=v_week+7;
 end loop;
 -- Handle both open cycles and formal recount assignments on counted cycles.
 for v_c in select * from public.bal_cycles c where care_recipient_id=p_patient and (state='open' or exists(select 1 from public.bal_assignments a where a.cycle_id=c.id and a.status='active')) order by created_at loop
 v_floor:=greatest(coalesce((select min(original_start) from public.bal_obligations where cycle_id=v_c.id),p_now),coalesce((select max(ends_at) from public.bal_assignments where cycle_id=v_c.id and status='missed'),'-infinity'::timestamptz));
 v_was_missed:=exists(select 1 from public.bal_assignments where cycle_id=v_c.id and status='missed');
 for v_i in 0..100 loop
 select * into v_a from public.bal_assignments where care_recipient_id=p_patient and cycle_id=v_c.id and status='active' for update;
 if found then
 select * into v_s from public.scheduled_shifts where id=v_a.shift_id;
 if v_a.ends_at<=p_now then
 update public.bal_assignments set status='missed',missed_at=v_a.ends_at,version=version+1 where id=v_a.id;
 update public.bal_obligations set missed_at=coalesce(missed_at,original_due) where cycle_id=v_c.id and state='pending' and original_due<=p_now;
 perform private.bal_event(p_patient,v_c.id,v_a.id,'bal.cycle.missed','Plantão encerrado sem contagem',jsonb_build_object('deadline',v_a.ends_at,'professionalId',v_a.professional_id),'missed:'||v_a.id);
 v_floor:=v_a.ends_at;v_was_missed:=true;
 elsif v_s.status<>'published' or v_s.version<>v_a.shift_version or not private.schedule_worker(p_patient,v_a.professional_id) or not private.member_can(p_patient,v_a.professional_id,'bal.count') then
 update public.bal_assignments set status='invalidated',version=version+1 where id=v_a.id;
 perform private.bal_event(p_patient,v_c.id,v_a.id,'bal.cycle.invalidated','Escala ou autorização alterada; atribuição anterior preservada','{}','invalidated:'||v_a.id);
 v_floor:=greatest(v_floor,p_now-interval '24 hours');
 else exit;end if;
 end if;
 update public.bal_deferrals d set status='stale',decided_at=p_now where d.cycle_id=v_c.id and d.status='pending'
 and not exists(select 1 from public.bal_assignments a where a.id=d.assignment_id and a.status='active' and a.version=d.assignment_version);
 if v_c.state='counted' then exit;end if;
 if exists(select 1 from public.bal_assignments where care_recipient_id=p_patient and status='active') then exit;end if;
 -- Never choose arbitrarily between simultaneous eligible professionals.
 select min(s.starts_at) into v_start from public.scheduled_shifts s where s.care_recipient_id=p_patient and s.status='published'
 and s.starts_at>=v_floor and not exists(select 1 from public.bal_assignments a where a.cycle_id=v_c.id and a.shift_id=s.id)
 and (exists(select 1 from public.bal_assignments where cycle_id=v_c.id) or p_now>=(select min(original_due) from public.bal_obligations where cycle_id=v_c.id)
 or s.shift_type_id=v_r.shift_type_id and (s.starts_at at time zone v_r.timezone)::date=(v_floor at time zone v_r.timezone)::date and (v_r.designated_professional_id is null or s.professional_id=v_r.designated_professional_id))
 and private.schedule_worker(p_patient,s.professional_id) and private.member_can(p_patient,s.professional_id,'bal.count');
 select count(*),min(s.id::text)::uuid into v_matches,v_sid from public.scheduled_shifts s where s.care_recipient_id=p_patient and s.status='published' and s.starts_at=v_start
 and (exists(select 1 from public.bal_assignments where cycle_id=v_c.id) or p_now>=(select min(original_due) from public.bal_obligations where cycle_id=v_c.id)
 or s.shift_type_id=v_r.shift_type_id and (s.starts_at at time zone v_r.timezone)::date=(v_floor at time zone v_r.timezone)::date and (v_r.designated_professional_id is null or s.professional_id=v_r.designated_professional_id))
 and private.schedule_worker(p_patient,s.professional_id) and private.member_can(p_patient,s.professional_id,'bal.count')
 and not exists(select 1 from public.bal_assignments a where a.cycle_id=v_c.id and a.shift_id=s.id);
 if v_matches<>1 then
 update public.bal_obligations set missed_at=coalesce(missed_at,original_due) where cycle_id=v_c.id and state='pending' and original_due<=p_now;
 perform private.bal_event(p_patient,v_c.id,null,'bal.cycle.unassigned','Sem próximo plantão único elegível; exige solução autorizada',jsonb_build_object('ambiguous',v_matches>1),'unassigned:'||v_c.id||':'||v_floor);
 exit;end if;
 select * into v_s from public.scheduled_shifts where id=v_sid;
 -- Past assignments are recorded without pretending they are currently executable.
 insert into public.bal_assignments(care_recipient_id,cycle_id,shift_id,shift_version,professional_id,starts_at,ends_at,kind)
 values(p_patient,v_c.id,v_sid,v_s.version,v_s.professional_id,v_s.starts_at,v_s.ends_at,case when v_was_missed then 'transfer' else 'scheduled' end) returning * into v_a;
 perform private.bal_event(p_patient,v_c.id,v_a.id,'bal.cycle.assigned','Responsabilidade vinculada ao plantão real',to_jsonb(v_s),'assignment:'||v_a.id);
 v_cycles:=v_cycles+1;
 if v_s.ends_at>p_now then exit;end if;
 end loop;end loop;
 return v_cycles;
end;$$;

create function public.balance_workspace(p_patient uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_a public.bal_assignments;v_doc uuid;v_available boolean:=false;v_enabled boolean;begin
 perform private.require_cap(p_patient,'bal.read');
 select enabled into v_enabled from public.bal_regimes where care_recipient_id=p_patient;
 select * into v_a from public.bal_assignments where care_recipient_id=p_patient and status='active';
 if found then
 select document_id into v_doc from public.bal_cycles where id=v_a.cycle_id;
 v_available:=v_a.professional_id=auth.uid() and private.can(p_patient,'bal.count') and v_a.starts_at<=now() and v_a.ends_at>now()
 and exists(select 1 from public.scheduled_shifts s where s.id=v_a.shift_id and s.status='published' and s.version=v_a.shift_version)
 and private.schedule_worker(p_patient,auth.uid());end if;
 return jsonb_build_object('enabled',coalesce(v_enabled,false),'regime',(select to_jsonb(r) from public.bal_regimes r where care_recipient_id=p_patient),
 'eligibility',jsonb_build_object('available',v_available,'assignment',case when v_a.id is not null then to_jsonb(v_a) end,'documentId',v_doc,'href','/fichas/bal','dueAt',v_a.ends_at),
 'obligations',coalesce((select jsonb_agg(to_jsonb(x) order by x.week_start desc) from (select * from public.bal_obligations where care_recipient_id=p_patient order by week_start desc limit 104) x),'[]'),
 'assignments',coalesce((select jsonb_agg(to_jsonb(x)||jsonb_build_object('professional_name',p.full_name,'type_name',t.name) order by x.created_at desc)
 from (select * from public.bal_assignments where care_recipient_id=p_patient order by created_at desc limit 200) x join public.profiles p on p.id=x.professional_id join public.scheduled_shifts s on s.id=x.shift_id join public.shift_types t on t.id=s.shift_type_id),'[]'),
 'deferrals',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select * from public.bal_deferrals where care_recipient_id=p_patient order by created_at desc limit 100) x),'[]'),
 'events',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select * from public.bal_cycle_events where care_recipient_id=p_patient order by created_at desc limit 200) x),'[]'),
 'targets',coalesce((select jsonb_agg(to_jsonb(s)||jsonb_build_object('professional_name',p.full_name,'type_name',t.name) order by s.starts_at)
 from public.scheduled_shifts s join public.profiles p on p.id=s.professional_id join public.shift_types t on t.id=s.shift_type_id
 where s.care_recipient_id=p_patient and s.status='published' and s.ends_at>now() and s.starts_at<now()+interval '35 days'
 and private.schedule_worker(p_patient,s.professional_id) and private.member_can(p_patient,s.professional_id,'bal.count')),'[]'));
end;$$;

create function public.balance_command(p_patient uuid,p_action text,p_body jsonb,p_key uuid,p_version integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_old private.bal_commands;v_request jsonb;v_result jsonb;v_r public.bal_regimes;v_a public.bal_assignments;v_d public.bal_deferrals;
 v_c public.bal_cycles;v_s public.scheduled_shifts;v_id uuid;v_approve boolean;v_reason text:=trim(coalesce(p_body->>'reason',''));
begin
 perform private.require_cap(p_patient,'bal.read');
 if p_key is null or p_body is null or jsonb_typeof(p_body)<>'object' then raise exception 'invalid balance command';end if;
 if not exists(select 1 from public.care_recipients where id=p_patient and is_active) then raise exception 'inactive patient';end if;
 perform pg_advisory_xact_lock(hashtextextended('bal:'||p_patient,0));
 v_request:=jsonb_build_object('action',p_action,'body',p_body,'version',p_version);
 select * into v_old from private.bal_commands where care_recipient_id=p_patient and actor_id=auth.uid() and key=p_key;
 if found then if v_old.request<>v_request then raise exception 'idempotency payload mismatch';end if;return v_old.result;end if;
 if p_action='configure' then
 if not private.bal_family_authority(p_patient,'bal.schedule.manage') then raise exception 'family balance scheduling authorization required' using errcode='42501';end if;
 select * into v_r from public.bal_regimes where care_recipient_id=p_patient for update;
 if v_r.version is distinct from p_version then raise exception 'stale document';end if;
 if length(v_reason)<3 or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_body->>'timezone') then raise exception 'reason and valid timezone required';end if;
 if not exists(select 1 from public.shift_types where care_recipient_id=p_patient and id=(p_body->>'shiftTypeId')::uuid and is_active) then raise exception 'invalid balance shift type';end if;
 if p_body->>'professionalId' is not null and not private.schedule_worker(p_patient,(p_body->>'professionalId')::uuid) then raise exception 'invalid designated professional';end if;
 if (v_r.care_recipient_id is null or not v_r.enabled) and (p_body->>'startsOn')::date<(now() at time zone (p_body->>'timezone'))::date then raise exception 'balance activation cannot be retroactive';end if;
 if v_r.starts_on is not null and (p_body->>'startsOn')::date<v_r.starts_on then raise exception 'balance activation cannot be retroactive';end if;
 insert into public.bal_regimes(care_recipient_id,enabled,timezone,weekday,shift_type_id,designated_professional_id,starts_on,activated_at,updated_by)
 values(p_patient,(p_body->>'enabled')::boolean,p_body->>'timezone',(p_body->>'weekday')::integer,(p_body->>'shiftTypeId')::uuid,(p_body->>'professionalId')::uuid,(p_body->>'startsOn')::date,case when (p_body->>'enabled')::boolean then now() end,auth.uid())
 on conflict(care_recipient_id) do update set enabled=excluded.enabled,timezone=excluded.timezone,weekday=excluded.weekday,shift_type_id=excluded.shift_type_id,
 designated_professional_id=excluded.designated_professional_id,starts_on=excluded.starts_on,activated_at=coalesce(public.bal_regimes.activated_at,excluded.activated_at),version=public.bal_regimes.version+1,updated_by=auth.uid(),updated_at=now() returning * into v_r;
 perform private.bal_event(p_patient,null,null,'bal.cycle.configured',v_reason,to_jsonb(v_r),'config:'||v_r.version);
 perform private.process_bal_patient(p_patient);v_result:=to_jsonb(v_r);
 elsif p_action='refresh' then
 if not(private.can(p_patient,'bal.schedule.manage') or private.can(p_patient,'schedule.manage.team')) then raise exception 'balance scheduling authorization required' using errcode='42501';end if;
 perform private.process_bal_patient(p_patient);v_result:=jsonb_build_object('processed',true);
 elsif p_action in ('request_deferral','defer','decide_deferral') then
 perform private.process_bal_patient(p_patient);
 if length(v_reason)<3 then raise exception 'deferral reason required';end if;
 if p_action='decide_deferral' then
 if not private.bal_family_authority(p_patient,'bal.defer.approve') then raise exception 'family approval required' using errcode='42501';end if;
 select * into v_d from public.bal_deferrals where care_recipient_id=p_patient and id=(p_body->>'id')::uuid for update;
 if not found or v_d.status<>'pending' then raise exception 'stale document';end if;
 select * into v_a from public.bal_assignments where id=v_d.assignment_id for update;
 if v_a.status<>'active' or v_a.version<>v_d.assignment_version or v_a.ends_at<=now() then raise exception 'stale document';end if;
 v_approve:=(p_body->>'approve')::boolean;
 else
 select * into v_a from public.bal_assignments where id=(p_body->>'assignmentId')::uuid and care_recipient_id=p_patient for update;
 if not found or v_a.status<>'active' or v_a.version is distinct from p_version or v_a.ends_at<=now() then raise exception 'stale document';end if;
 if p_action='defer' then
 if not private.bal_family_authority(p_patient,'bal.defer.approve') then raise exception 'family approval required' using errcode='42501';end if;
 else
 if not private.can(p_patient,'bal.defer.request') or (v_a.professional_id<>auth.uid() and not exists(select 1 from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=auth.uid() and status='active' and role='supervisor')) then raise exception 'deferral request authorization required' using errcode='42501';end if;
 end if;
 select * into v_s from public.scheduled_shifts where care_recipient_id=p_patient and id=(p_body->>'targetShiftId')::uuid;
 if not found or v_s.status<>'published' or v_s.starts_at<v_a.ends_at or not private.schedule_worker(p_patient,v_s.professional_id) or not private.member_can(p_patient,v_s.professional_id,'bal.count') then raise exception 'invalid deferral target shift';end if;
 insert into public.bal_deferrals(care_recipient_id,cycle_id,assignment_id,assignment_version,target_shift_id,reason,requested_by)
 values(p_patient,v_a.cycle_id,v_a.id,v_a.version,v_s.id,v_reason,auth.uid()) returning * into v_d;
 v_approve:=p_action='defer';end if;
 if v_approve then
 update public.bal_assignments set status='deferred',version=version+1 where id=v_a.id;
 v_id:=private.bal_assign(p_patient,v_a.cycle_id,v_d.target_shift_id,'deferred');
 update public.bal_deferrals set status='approved',decided_by=auth.uid(),decided_at=now(),decision_reason=v_reason where id=v_d.id returning * into v_d;
 perform private.bal_event(p_patient,v_a.cycle_id,v_id,'bal.cycle.deferred',v_reason,to_jsonb(v_d),'deferral:'||v_d.id||':approved');
 elsif p_action='decide_deferral' then
 update public.bal_deferrals set status='rejected',decided_by=auth.uid(),decided_at=now(),decision_reason=v_reason where id=v_d.id returning * into v_d;
 perform private.bal_event(p_patient,v_a.cycle_id,v_a.id,'bal.cycle.deferral_rejected',v_reason,to_jsonb(v_d),'deferral:'||v_d.id||':rejected');
 else perform private.bal_event(p_patient,v_a.cycle_id,v_a.id,'bal.cycle.deferral_requested',v_reason,to_jsonb(v_d),'deferral:'||v_d.id||':requested');end if;
 v_result:=to_jsonb(v_d);
 elsif p_action='assign_recount' then
 if not(private.can(p_patient,'bal.approve.family') or private.can(p_patient,'bal.approve.supervisor')) then raise exception 'balance review authorization required' using errcode='42501';end if;
 if length(v_reason)<3 then raise exception 'recount reason required';end if;
 select * into v_c from public.bal_cycles where care_recipient_id=p_patient and document_id=(p_body->>'documentId')::uuid and state='counted' for update;
 if not found or not exists(select 1 from public.operational_documents where id=v_c.document_id and type='BAL' and status='submitted') then raise exception 'pending balance review required';end if;
 if exists(select 1 from public.bal_assignments where care_recipient_id=p_patient and status='active') then raise exception 'another balance assignment is active';end if;
 v_id:=private.bal_assign(p_patient,v_c.id,(p_body->>'targetShiftId')::uuid,'recount');
 perform private.bal_event(p_patient,v_c.id,v_id,'bal.cycle.recount_assigned',v_reason,jsonb_build_object('documentId',v_c.document_id),'recount:'||v_id);
 v_result:=jsonb_build_object('assignmentId',v_id);
 else raise exception 'invalid balance action';end if;
 insert into private.bal_commands(care_recipient_id,actor_id,key,request,result) values(p_patient,auth.uid(),p_key,v_request,v_result);
 return v_result;
end;$$;

-- Count execution is guarded at every public entrypoint, including old clients.
create function private.bal_count_context(p_patient uuid,p_document uuid,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_a public.bal_assignments;v_c public.bal_cycles;v_s public.scheduled_shifts;begin
 perform private.require_cap(p_patient,'bal.count');
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
 perform pg_advisory_xact_lock(hashtextextended('bal:'||p_patient,0));
 select * into v_a from public.bal_assignments where care_recipient_id=p_patient and id=(p_payload->'balanceAssignment'->>'id')::uuid for update;
 if not found or v_a.status<>'active' or v_a.version is distinct from (p_payload->'balanceAssignment'->>'version')::integer
 or v_a.professional_id<>auth.uid() or not private.schedule_worker(p_patient,auth.uid()) or v_a.starts_at>now() or v_a.ends_at<=now() then raise exception 'balance shift authorization required' using errcode='42501';end if;
 select * into v_s from public.scheduled_shifts where id=v_a.shift_id for share;
 if v_s.status<>'published' or v_s.version<>v_a.shift_version then raise exception 'stale balance assignment';end if;
 select * into strict v_c from public.bal_cycles where id=v_a.cycle_id for update;
 if (p_document is null and v_c.document_id is not null) or (p_document is not null and v_c.document_id is distinct from p_document) then raise exception 'existing balance document requires revision' using errcode='40001';end if;
 return jsonb_build_object('cycleId',v_c.id,'assignmentId',v_a.id,'assignmentVersion',v_a.version,'shiftId',v_s.id,'shiftType',(select name from public.shift_types where id=v_s.shift_type_id),
 'professionalId',v_a.professional_id,'professionalName',(select full_name from public.profiles where id=v_a.professional_id),'startsAt',v_a.starts_at,'endsAt',v_a.ends_at,'timezone',v_s.timezone,
 'countedAt',now(),'weeks',(select jsonb_agg(week_start order by week_start) from public.bal_obligations where cycle_id=v_c.id),'kind',v_a.kind);
end;$$;
create function private.finish_bal_count(p_id uuid,p_context jsonb) returns void language plpgsql security definer set search_path='' as $$
declare v_cycle uuid:=(p_context->>'cycleId')::uuid;v_assignment uuid:=(p_context->>'assignmentId')::uuid;v_current_week date:=date_trunc('week',now() at time zone (p_context->>'timezone'))::date;begin
 update public.bal_cycles set document_id=p_id,state='counted',counted_at=now() where id=v_cycle;
 update public.bal_assignments set status='counted',version=version+1 where id=v_assignment;
 update public.bal_obligations set state=case when week_start=v_current_week then 'counted' else 'regularized' end,
 count_document_id=case when week_start=v_current_week then p_id end,regularized_by=case when week_start<>v_current_week then p_id end,
 actual_count_at=now() where cycle_id=v_cycle and state='pending';
 update public.bal_deferrals set status='stale',decided_at=now() where cycle_id=v_cycle and status='pending';
 perform private.bal_event((select care_recipient_id from public.bal_cycles where id=v_cycle),v_cycle,v_assignment,'bal.cycle.counted','Contagem física atual registrada; atrasos anteriores preservados',p_context,'count:'||p_id||':'||(select version from public.operational_documents where id=p_id));
end;$$;

alter function public.create_supply_document(uuid,text,jsonb,uuid,boolean) rename to fluent_pre_shift_create;
alter function public.revise_supply_document(uuid,jsonb,uuid,integer,boolean) rename to fluent_pre_shift_revise;
alter function public.supply_document_command(uuid,text,jsonb,uuid,integer) rename to fluent_pre_shift_command;
revoke all on function public.fluent_pre_shift_create(uuid,text,jsonb,uuid,boolean),public.fluent_pre_shift_revise(uuid,jsonb,uuid,integer,boolean),public.fluent_pre_shift_command(uuid,text,jsonb,uuid,integer) from public,anon,authenticated,service_role;
create function public.create_supply_document(p_patient uuid,p_type text,p_payload jsonb,p_key uuid,p_draft boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$declare v_context jsonb;v_result jsonb;v_existing public.operational_documents;begin
 if p_type='BAL' and exists(select 1 from public.bal_regimes where care_recipient_id=p_patient and activated_at is not null) then
 perform private.require_cap(p_patient,'bal.read');
 select * into v_existing from public.operational_documents where care_recipient_id=p_patient and created_by=auth.uid() and idempotency_key=p_key and type='BAL';
 if found then if v_existing.payload-'balanceContext'<>p_payload-'balanceContext' then raise exception 'idempotency payload mismatch';end if;return public.operational_document(v_existing.id);end if;
 v_context:=private.bal_count_context(p_patient,null,p_payload);
 p_payload:=(p_payload-'balanceContext')||jsonb_build_object('balanceContext',v_context);
 v_result:=public.fluent_pre_shift_create(p_patient,p_type,p_payload,p_key,p_draft);
 update public.bal_cycles set document_id=(v_result->>'id')::uuid where id=(v_context->>'cycleId')::uuid;
 if not p_draft then perform private.finish_bal_count((v_result->>'id')::uuid,v_context);end if;
 return v_result;end if;
 return public.fluent_pre_shift_create(p_patient,p_type,p_payload,p_key,p_draft);
end;$$;
create function public.revise_supply_document(p_id uuid,p_payload jsonb,p_key uuid,p_version integer,p_recount boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$declare v_d public.operational_documents;v_context jsonb;v_result jsonb;v_event public.document_events;begin
 select * into v_d from public.operational_documents where id=p_id;
 if v_d.type='BAL' and (exists(select 1 from public.bal_cycles where document_id=p_id) or exists(select 1 from public.bal_regimes where care_recipient_id=v_d.care_recipient_id and activated_at is not null)) then
 perform private.require_cap(v_d.care_recipient_id,'bal.read');
 select * into v_event from public.document_events where actor_id=auth.uid() and idempotency_key=p_key;
 if found then if v_event.document_id<>p_id or (v_event.body->'event')-'balanceContext'<>p_payload-'balanceContext' or v_event.action<>(case when p_recount then 'bal.recount' else 'bal.draft_updated' end) then raise exception 'idempotency payload mismatch';end if;return public.operational_document(p_id);end if;
 v_context:=private.bal_count_context(v_d.care_recipient_id,p_id,p_payload);
 if p_recount and v_context->>'kind'<>'recount' then raise exception 'formal recount assignment required';end if;
 p_payload:=(p_payload-'balanceContext')||jsonb_build_object('balanceContext',v_context);
 v_result:=public.fluent_pre_shift_revise(p_id,p_payload,p_key,p_version,p_recount);
 if p_recount then perform private.finish_bal_count(p_id,v_context);end if;return v_result;end if;
 return public.fluent_pre_shift_revise(p_id,p_payload,p_key,p_version,p_recount);
end;$$;
create function public.supply_document_command(p_id uuid,p_action text,p_body jsonb,p_key uuid,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$declare v_d public.operational_documents;v_context jsonb;v_result jsonb;v_event public.document_events;begin
 select * into v_d from public.operational_documents where id=p_id;
 if v_d.type='BAL' and p_action='approve' and p_body->>'group'='family' and not private.bal_family_authority(v_d.care_recipient_id,'bal.approve.family') then raise exception 'family approval required' using errcode='42501';end if;
 if v_d.type='BAL' and p_action='cancel' and exists(select 1 from public.bal_cycles where document_id=p_id and state='counted') then raise exception 'scheduled balance requires formal recount';end if;
 if v_d.type='BAL' and p_action='submit' and (exists(select 1 from public.bal_cycles where document_id=p_id) or exists(select 1 from public.bal_regimes where care_recipient_id=v_d.care_recipient_id and activated_at is not null)) then
 perform private.require_cap(v_d.care_recipient_id,'bal.read');
 select * into v_event from public.document_events where actor_id=auth.uid() and idempotency_key=p_key;
 if found then if v_event.document_id<>p_id or v_event.action<>'bal.submit' or v_event.body->'event'<>p_body then raise exception 'idempotency payload mismatch';end if;return public.operational_document(p_id);end if;
 v_context:=private.bal_count_context(v_d.care_recipient_id,p_id,v_d.payload);
 update public.operational_documents set payload=(payload-'balanceContext')||jsonb_build_object('balanceContext',v_context) where id=p_id;
 v_result:=public.fluent_pre_shift_command(p_id,p_action,p_body,p_key,p_version);
 perform private.finish_bal_count(p_id,v_context);return v_result;end if;
 return public.fluent_pre_shift_command(p_id,p_action,p_body,p_key,p_version);
end;$$;
-- The original author remains unchanged during handoff. The current actor must
-- independently pass the same patient/assignment/window guard before revising.
do $$declare v_def text;v_old text:='if d.created_by<>auth.uid() and not public.can_manage_recipient(p_patient) then';begin
 v_def:=pg_get_functiondef('public.v3_revise_supply_document(uuid,jsonb,uuid,integer,boolean)'::regprocedure);
 if strpos(v_def,v_old)=0 then raise exception 'unexpected legacy BAL owner guard';end if;
 v_def:=replace(v_def,v_old,'if d.created_by<>auth.uid() and not public.can_manage_recipient(p_patient) and not (d.type=''BAL'' and exists(select 1 from public.bal_cycles where document_id=p_id) and private.bal_count_context(p_patient,p_id,p_payload) is not null) then');
 execute v_def;
end;$$;

-- Reuse the existing service-only scheduler; do not install a second cron job.
alter function public.run_operational_schedule() rename to fluent_pre_shift_scheduler;
revoke all on function public.fluent_pre_shift_scheduler() from public,anon,authenticated,service_role;
create function public.run_operational_schedule() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_result jsonb;v_patient uuid;v_n integer:=0;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'worker authorization required' using errcode='42501';end if;
 v_result:=public.fluent_pre_shift_scheduler();
 for v_patient in select care_recipient_id from public.bal_regimes where enabled order by care_recipient_id limit 100 loop
 v_n:=v_n+private.process_bal_patient(v_patient);end loop;
 return v_result||jsonb_build_object('balanceAssignments',v_n);
end;$$;
do $$declare v_def text;v_old text:='if s.settings->>''balDay'' is not null and';begin
 v_def:=pg_get_functiondef('private.enqueue_scheduled_reminders()'::regprocedure);
 if strpos(v_def,v_old)=0 then raise exception 'unexpected legacy reminder condition';end if;
 execute replace(v_def,v_old,'if not exists(select 1 from public.bal_regimes br where br.care_recipient_id=s.care_recipient_id and br.enabled) and s.settings->>''balDay'' is not null and');
end;$$;

create function private.reminder_recipient_can(p_reminder uuid,p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((select r.user_id=p_user and r.acknowledged_at is null and case r.kind
 when 'schedule' then private.member_can(r.care_recipient_id,p_user,'schedule.read.own') or private.member_can(r.care_recipient_id,p_user,'schedule.read.team')
 when 'bal_cycle' then private.member_can(r.care_recipient_id,p_user,'bal.read')
 when 'bal' then private.member_can(r.care_recipient_id,p_user,'bal.count') else private.member_can(r.care_recipient_id,p_user,'consumption.report') end
 from public.operational_reminders r where r.id=p_reminder),false);
$$;
-- Apply the same fresh recipient check to the internal and leased worker paths.
do $$declare v_fn record;v_def text;v_needle text;v_alias text;begin
 for v_fn in select p.oid from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
 where n.nspname in ('public','private') and p.prokind='f'
 and (p.prosrc like '%case when rem.kind=''bal'' then ''bal.count'' else ''consumption.report'' end%'
 or p.prosrc like '%case when r.kind=''bal'' then ''bal.count'' else ''consumption.report'' end%') loop
 v_def:=pg_get_functiondef(v_fn.oid);
 foreach v_alias in array array['r','rem'] loop
 v_needle:='private.member_can(n.care_recipient_id,n.recipient_user_id,case when '||v_alias||'.kind=''bal'' then ''bal.count'' else ''consumption.report'' end)';
 v_def:=replace(v_def,v_needle,'private.reminder_recipient_can('||v_alias||'.id,n.recipient_user_id)');
 end loop;execute v_def;end loop;
end;$$;
do $$declare v_def text;begin
 v_def:=pg_get_functiondef('private.schedule_event(uuid,uuid,uuid,uuid,text,text,jsonb,jsonb)'::regprocedure);
 execute replace(v_def,'(user_id=p_worker or role in','(user_id=p_worker or user_id=nullif(p_before->>''professional_id'','''')::uuid or role in');
end;$$;

revoke all on function private.bal_family_authority(uuid,text),private.bal_event(uuid,uuid,uuid,text,text,jsonb,text),private.bal_assign(uuid,uuid,uuid,text),private.process_bal_patient(uuid,timestamptz),private.bal_count_context(uuid,uuid,jsonb),private.finish_bal_count(uuid,jsonb) from public,anon,authenticated,service_role;
revoke all on function private.reminder_recipient_can(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.balance_workspace(uuid),public.balance_command(uuid,text,jsonb,uuid,integer),public.create_supply_document(uuid,text,jsonb,uuid,boolean),public.revise_supply_document(uuid,jsonb,uuid,integer,boolean),public.supply_document_command(uuid,text,jsonb,uuid,integer),public.run_operational_schedule() from public,anon,authenticated,service_role;
grant execute on function public.balance_workspace(uuid),public.balance_command(uuid,text,jsonb,uuid,integer),public.create_supply_document(uuid,text,jsonb,uuid,boolean),public.revise_supply_document(uuid,jsonb,uuid,integer,boolean),public.supply_document_command(uuid,text,jsonb,uuid,integer) to authenticated;
grant execute on function public.run_operational_schedule() to service_role;
