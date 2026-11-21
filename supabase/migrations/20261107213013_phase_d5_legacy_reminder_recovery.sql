begin;

-- Operational transport progress, never a second business-obligation engine.
create table private.legacy_reminder_progress (
 singleton boolean primary key default true check(singleton),
 last_patient uuid,last_run timestamptz,processed integer not null default 0,
 created integer not null default 0,failed integer not null default 0
);
insert into private.legacy_reminder_progress(singleton) values(true);
create table private.legacy_reminder_checkpoints (
 care_recipient_id uuid primary key references public.care_recipients(id),
 policy_fingerprint text not null,source_version bigint not null,source_updated_at timestamptz not null,observed_at timestamptz not null,
 closed_through date not null,checked_at timestamptz not null
);
create table private.legacy_reminder_failures (
 care_recipient_id uuid primary key references public.care_recipients(id),
 policy_fingerprint text not null,sqlstate text not null,attempts integer not null default 1,
 first_failure_at timestamptz not null,last_failure_at timestamptz not null,resolved_at timestamptz
);
create table private.legacy_reminder_gaps (
 id uuid primary key default gen_random_uuid(),
 care_recipient_id uuid not null references public.care_recipients(id),
 policy_fingerprint text not null,period_from date not null,period_to date not null,
 reason text not null check(reason in ('policy_changed','invalid_configuration')),
 detected_at timestamptz not null default now(),check(period_to>=period_from),
 unique(care_recipient_id,policy_fingerprint,period_from,period_to,reason)
);
alter table private.legacy_reminder_progress enable row level security;
alter table private.legacy_reminder_checkpoints enable row level security;
alter table private.legacy_reminder_failures enable row level security;
alter table private.legacy_reminder_gaps enable row level security;
revoke all on private.legacy_reminder_progress,private.legacy_reminder_checkpoints,
 private.legacy_reminder_failures,private.legacy_reminder_gaps from public,anon,authenticated,service_role;

create function private.legacy_reminder_policy(p_settings jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare b jsonb;s jsonb;u text;d text;day integer;hour integer;
begin
 if jsonb_typeof(p_settings) is distinct from 'object' then raise exception 'invalid reminder policy' using errcode='22023';end if;
 b:=coalesce(p_settings->'balReminderUsers','[]');s:=coalesce(p_settings->'shiftReminder','{}');
 if jsonb_typeof(b) is distinct from 'array' or jsonb_array_length(b)>200
 or jsonb_typeof(s) is distinct from 'object' then raise exception 'invalid reminder policy' using errcode='22023';end if;
 if jsonb_array_length(b)>0 then
  if not p_settings ? 'balDay' then raise exception 'invalid reminder day' using errcode='22023';end if;
  day:=private.scheduler_policy_integer(p_settings,'balDay',0,0,6);
 end if;
 if s ? 'enabled' and jsonb_typeof(s->'enabled') is distinct from 'boolean' then raise exception 'invalid reminder switch' using errcode='22023';end if;
 if coalesce((s->>'enabled')::boolean,false) then
  hour:=private.scheduler_policy_integer(s,'hour',19,0,23);
  if jsonb_typeof(s->'days') is distinct from 'array' or jsonb_array_length(s->'days')>7
  or jsonb_typeof(s->'userIds') is distinct from 'array' or jsonb_array_length(s->'userIds')>200 then raise exception 'invalid reminder recipients' using errcode='22023';end if;
  if exists(select 1 from jsonb_array_elements(s->'days') as x(value) where jsonb_typeof(x.value) is distinct from 'string') then raise exception 'invalid reminder weekday' using errcode='22023';end if;
  for d in select value from jsonb_array_elements_text(s->'days') loop
   if d is null or d !~ '^[0-6]$' then raise exception 'invalid reminder weekday' using errcode='22023';end if;
  end loop;
  for u in select value from jsonb_array_elements_text(s->'userIds') loop
   if u is null or u !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'invalid reminder recipient' using errcode='22023';end if;
  end loop;
 end if;
 for u in select value from jsonb_array_elements_text(b) loop
  if u is null or u !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'invalid reminder recipient' using errcode='22023';end if;
 end loop;
 return jsonb_build_object('balUsers',b,'balDay',day,'shift',s,'shiftHour',hour);
end;$$;

create view private.legacy_reminder_candidates with(security_invoker=true) as
select p.care_recipient_id,p.settings,p.version source_version,p.updated_at source_updated_at,
 encode(extensions.digest(jsonb_build_object('balDay',p.settings->'balDay',
 'balReminderUsers',p.settings->'balReminderUsers','shiftReminder',p.settings->'shiftReminder')::text,'sha256'),'hex') policy_fingerprint
from public.patient_settings p join public.care_recipients c on c.id=p.care_recipient_id
where c.is_active and (
 jsonb_typeof(p.settings) is distinct from 'object'
 or (p.settings ? 'balReminderUsers' and p.settings->'balReminderUsers'<>'[]'::jsonb)
 or (p.settings ? 'shiftReminder' and case when jsonb_typeof(p.settings->'shiftReminder')='object'
  then coalesce(p.settings->'shiftReminder'->'enabled','false'::jsonb)<>'false'::jsonb
  else true end));
revoke all on private.legacy_reminder_candidates from public,anon,authenticated,service_role;

create or replace function private.enqueue_scheduled_reminders() returns integer
language plpgsql security definer set search_path='' as $$
declare
 s record;cp private.legacy_reminder_checkpoints;previous_failure private.legacy_reminder_failures;
 cursor_patient uuid;policy jsonb;uid uuid;rid uuid;period_date date;last_date date;from_date date;
 today date:=(now() at time zone 'America/Sao_Paulo')::date;expected timestamptz;
 n integer:=0;v_processed integer:=0;v_failed integer:=0;patient_created integer;error_state text;
begin
 select last_patient into strict cursor_patient from private.legacy_reminder_progress where singleton for update;
 for s in select * from private.legacy_reminder_candidates
  order by case when cursor_patient is null or care_recipient_id>cursor_patient then 0 else 1 end,care_recipient_id limit 100 loop
  v_processed:=v_processed+1;cursor_patient:=s.care_recipient_id;patient_created:=0;
  begin
   -- Re-read after locking, so configuration changes cannot inherit an old plan.
   select p.settings,p.version,p.updated_at into s.settings,s.source_version,s.source_updated_at from public.patient_settings p where p.care_recipient_id=s.care_recipient_id for update;
   if not exists(select 1 from public.care_recipients where id=s.care_recipient_id and is_active) then continue;end if;
   s.policy_fingerprint:=encode(extensions.digest(jsonb_build_object('balDay',s.settings->'balDay','balReminderUsers',s.settings->'balReminderUsers','shiftReminder',s.settings->'shiftReminder')::text,'sha256'),'hex');
   policy:=private.legacy_reminder_policy(s.settings);
   select * into previous_failure from private.legacy_reminder_failures where care_recipient_id=s.care_recipient_id;
   if found and previous_failure.resolved_at is null and (previous_failure.first_failure_at at time zone 'America/Sao_Paulo')::date<today then
    insert into private.legacy_reminder_gaps(care_recipient_id,policy_fingerprint,period_from,period_to,reason)
    values(s.care_recipient_id,previous_failure.policy_fingerprint,(previous_failure.first_failure_at at time zone 'America/Sao_Paulo')::date,today-1,'invalid_configuration') on conflict do nothing;
   end if;
   select * into cp from private.legacy_reminder_checkpoints where care_recipient_id=s.care_recipient_id for update;
   if not found then
    insert into private.legacy_reminder_checkpoints values(s.care_recipient_id,s.policy_fingerprint,s.source_version,s.source_updated_at,now(),today-1,now()) returning * into cp;
   elsif cp.policy_fingerprint<>s.policy_fingerprint or cp.source_version<>s.source_version or cp.source_updated_at<>s.source_updated_at then
    -- Changed policy has no trustworthy historical effective date. Record the
    -- uncovered interval instead of applying today's recipients retroactively.
    if cp.closed_through<today-1 then
     insert into private.legacy_reminder_gaps(care_recipient_id,policy_fingerprint,period_from,period_to,reason)
     values(s.care_recipient_id,cp.policy_fingerprint,cp.closed_through+1,today-1,'policy_changed') on conflict do nothing;
    end if;
    update private.legacy_reminder_checkpoints set policy_fingerprint=s.policy_fingerprint,source_version=s.source_version,source_updated_at=s.source_updated_at,observed_at=now(),closed_through=today-1 where care_recipient_id=s.care_recipient_id returning * into cp;
   end if;
   from_date:=least(cp.closed_through+1,today);last_date:=least(today,from_date+6);
   for period_date in select from_date+i from generate_series(0,last_date-from_date) i loop
    if not exists(select 1 from public.bal_regimes br where br.care_recipient_id=s.care_recipient_id and br.enabled)
    and (policy->>'balDay')::integer=extract(dow from period_date) then
     expected:=(period_date+time '09:00') at time zone 'America/Sao_Paulo';
     if expected<=now() then
      for uid in select distinct value::uuid from jsonb_array_elements_text(policy->'balUsers') loop
       if not private.member_can(s.care_recipient_id,uid,'bal.count') then continue;end if;
       rid:=null;
       insert into public.operational_reminders(care_recipient_id,user_id,kind,period,expected_at)
       values(s.care_recipient_id,uid,'bal',period_date,expected) on conflict do nothing returning id into rid;
       if rid is not null then perform private.enqueue_notice(s.care_recipient_id,uid,'bal.reminder',null,null,null,null,rid);patient_created:=patient_created+1;end if;
      end loop;
     end if;
    end if;
    if coalesce((policy->'shift'->>'enabled')::boolean,false) and (policy->'shift'->'days') ? extract(dow from period_date)::text then
     expected:=(period_date+make_time((policy->>'shiftHour')::integer,0,0)) at time zone 'America/Sao_Paulo';
     if expected<=now() then
      for uid in select distinct value::uuid from jsonb_array_elements_text(policy->'shift'->'userIds') loop
       if not private.member_can(s.care_recipient_id,uid,'consumption.report') then continue;end if;
       rid:=null;
       insert into public.operational_reminders(care_recipient_id,user_id,kind,period,expected_at)
       values(s.care_recipient_id,uid,'shift',period_date,expected) on conflict do nothing returning id into rid;
       if rid is not null then perform private.enqueue_notice(s.care_recipient_id,uid,'shift.reminder',null,null,null,null,rid);patient_created:=patient_created+1;end if;
      end loop;
     end if;
    end if;
   end loop;
   update private.legacy_reminder_checkpoints set closed_through=greatest(cp.closed_through,least(last_date,today-1)),checked_at=now() where care_recipient_id=s.care_recipient_id;
   update private.legacy_reminder_failures set resolved_at=now() where care_recipient_id=s.care_recipient_id and resolved_at is null;
   n:=n+patient_created;
  exception when others then
   get stacked diagnostics error_state=returned_sqlstate;
   insert into private.legacy_reminder_failures(care_recipient_id,policy_fingerprint,sqlstate,first_failure_at,last_failure_at)
   values(s.care_recipient_id,s.policy_fingerprint,error_state,now(),now())
   on conflict(care_recipient_id) do update set policy_fingerprint=excluded.policy_fingerprint,sqlstate=excluded.sqlstate,
    attempts=private.legacy_reminder_failures.attempts+1,last_failure_at=excluded.last_failure_at,
    first_failure_at=case when private.legacy_reminder_failures.resolved_at is not null then excluded.first_failure_at else private.legacy_reminder_failures.first_failure_at end,resolved_at=null;
   v_failed:=v_failed+1;
  end;
 end loop;
 update private.legacy_reminder_progress set last_patient=coalesce(cursor_patient,last_patient),last_run=now(),processed=v_processed,created=n,failed=v_failed where singleton;
 return n;
end;$$;

create or replace function public.fluent_pre_shift_scheduler() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;n integer;scanned integer;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'worker authorization required' using errcode='42501';end if;
 result:=public.v4_lifecycle_schedule();n:=private.enqueue_scheduled_reminders();
 select p.processed into scanned from private.legacy_reminder_progress p where singleton;
 return result||jsonb_build_object('scheduledReminders',n,'legacyReminderPatients',scanned,
  'legacyReminderFailures',(select count(*) from private.legacy_reminder_failures f join public.care_recipients c on c.id=f.care_recipient_id where c.is_active and f.resolved_at is null),
  'legacyReminderGaps',(select count(*) from private.legacy_reminder_gaps g join public.care_recipients c on c.id=g.care_recipient_id where c.is_active));
end;$$;
revoke all on function private.legacy_reminder_policy(jsonb),private.enqueue_scheduled_reminders(),public.fluent_pre_shift_scheduler() from public,anon,authenticated,service_role;
notify pgrst,'reload schema';
commit;
