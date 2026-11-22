create table private.schedule_residence_hours (
  care_recipient_id uuid primary key references public.care_recipients(id),
  timezone text not null,
  day_start time not null check (day_start < time '24:00'),
  night_start time not null check (night_start < time '24:00'),
  version integer not null check (version > 0)
);
alter table private.schedule_residence_hours enable row level security;
revoke all on private.schedule_residence_hours from public, anon, authenticated, service_role;
create trigger schedule_residence_invalidate after insert or update on private.schedule_residence_hours
  for each row execute function private.invalidate_workspace();

create function private.schedule_residence_view(hours private.schedule_residence_hours)
returns jsonb language sql immutable set search_path='' as $$
  select case when hours.version is not null then jsonb_build_object(
    'version', hours.version, 'timezone', hours.timezone,
    'dayStart', to_char(hours.day_start, 'HH24:MI'),
    'nightStart', to_char(hours.night_start, 'HH24:MI')
  ) end
$$;

create function public.schedule_residence(p_patient uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  hours private.schedule_residence_hours;
begin
  if private.auth_session() is null or not public.can_access_recipient(p_patient) or not (
    private.can(p_patient, 'schedule.read.own') or private.can(p_patient, 'schedule.read.team')
    or private.can(p_patient, 'schedule.types.manage') or private.can(p_patient, 'schedule.propose')
    or private.can(p_patient, 'schedule.manage.team') or private.can(p_patient, 'schedule.manage.own')
  ) then
    raise exception 'schedule authorization required' using errcode='42501';
  end if;
  select * into hours from private.schedule_residence_hours where care_recipient_id=p_patient;
  return jsonb_build_object('careRecipientId', p_patient, 'hours', private.schedule_residence_view(hours));
end
$$;

create function public.set_schedule_residence(p_patient uuid,p_body jsonb,p_key uuid,p_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  hours private.schedule_residence_hours;
  prior private.schedule_commands;
  request jsonb := jsonb_build_object('action','residence_hours','body',p_body,'version',p_version);
  previous jsonb;
  result jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('schedule:'||p_patient,0));
  perform private.require_cap(p_patient, 'access.manage');
  perform private.require_cap(p_patient, 'schedule.types.manage');
  if not exists(select 1 from public.care_recipients where id=p_patient and is_active) then
    raise exception 'schedule authorization required' using errcode='42501';
  end if;
  if p_key is null or jsonb_typeof(p_body) is distinct from 'object'
    or not (p_body ?& array['timezone','dayStart','nightStart'])
    or p_body-array['timezone','dayStart','nightStart'] <> '{}'::jsonb
    or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_body->>'timezone')
    or not coalesce((p_body->>'dayStart') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$', false)
    or not coalesce((p_body->>'nightStart') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$', false) then
    raise exception 'invalid residence hours' using errcode='22023';
  end if;
  select * into prior from private.schedule_commands
    where care_recipient_id=p_patient and actor_id=auth.uid() and key=p_key;
  if found then
    if prior.request is distinct from request then
      raise exception 'idempotency payload mismatch' using errcode='23505';
    end if;
    return prior.result;
  end if;
  select * into hours from private.schedule_residence_hours where care_recipient_id=p_patient for update;
  if hours.version is distinct from p_version then
    raise exception 'stale residence hours' using errcode='PT409';
  end if;
  previous:=private.schedule_residence_view(hours);
  insert into private.schedule_residence_hours(care_recipient_id,timezone,day_start,night_start,version)
    values(p_patient,p_body->>'timezone',(p_body->>'dayStart')::time,(p_body->>'nightStart')::time,1)
    on conflict(care_recipient_id) do update set timezone=excluded.timezone,day_start=excluded.day_start,
      night_start=excluded.night_start,version=private.schedule_residence_hours.version+1
    returning * into hours;
  result:=jsonb_build_object('careRecipientId', p_patient, 'hours', private.schedule_residence_view(hours));
  insert into private.schedule_commands(care_recipient_id,actor_id,key,request,result)
    values(p_patient,auth.uid(),p_key,request,result);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'schedule.residence_hours','care_recipient',p_patient,
      jsonb_build_object('care_recipient_id',p_patient,'before',previous,'after',result->'hours'));
  return result;
end
$$;

revoke all on function private.schedule_residence_view(private.schedule_residence_hours),
  public.schedule_residence(uuid), public.set_schedule_residence(uuid,jsonb,uuid,integer)
  from public, anon, authenticated, service_role;
grant execute on function public.schedule_residence(uuid), public.set_schedule_residence(uuid,jsonb,uuid,integer)
  to authenticated;

alter table public.shift_series
  add column open_ended boolean not null default false,
  add column residence_version integer check (residence_version > 0),
  add column day_period text check (day_period in ('day','night')),
  add column starts_local time check (starts_local < time '24:00'),
  add column special_ends_local time check (special_ends_local < time '24:00'),
  add column planned_duration_minutes integer check (planned_duration_minutes between 15 and 1440),
  add column continuation_blocked boolean not null default false,
  add column continuation_retry_on date,
  drop constraint shift_series_check;
alter table public.shift_series add constraint shift_series_valid_span check (
  valid_until >= anchor_date and (
    (open_ended and recurrence in ('weekly','cycle') and residence_version is not null)
    or (not open_ended and valid_until <= anchor_date+366)
  )
);
create index shift_series_rolling on public.shift_series(valid_until,id)
where open_ended and status='published' and ended_on is null;

create function private.schedule_civil_instant(p_local timestamp,p_zone text)
returns timestamptz language plpgsql stable set search_path='' as $$
declare
  instant timestamptz := p_local at time zone p_zone;
begin
  if instant at time zone p_zone is distinct from p_local then
    raise exception 'invalid civil shift time' using errcode='22023';
  end if;
  return instant;
end
$$;

create function private.materialize_residence_schedule(p_series public.shift_series,p_from date,p_through date)
returns void language plpgsql set search_path='' as $$
declare
  anchor timestamptz;
  occurrence timestamptz;
  starts_day date;
  end_day date;
  end_at timestamptz;
  step_hours integer;
begin
  if p_series.recurrence='cycle' then
    anchor:=private.schedule_civil_instant(p_series.anchor_date+p_series.starts_local,p_series.timezone);
    step_hours:=p_series.work_hours+p_series.rest_hours;
  end if;
  for occurrence in
    select candidate
    from (
      select generate_series(
        anchor+make_interval(hours=>greatest(0,floor(extract(epoch from
          ((p_from::timestamp at time zone p_series.timezone)-anchor))/3600/step_hours)::integer)*step_hours),
        (p_through+1)::timestamp at time zone p_series.timezone,
        make_interval(hours=>step_hours)
      ) candidate where p_series.recurrence='cycle'
      union all
      select private.schedule_civil_instant(d::date+p_series.starts_local,p_series.timezone)
      from generate_series(p_from::timestamp,p_through::timestamp,interval '1 day') d
      where p_series.recurrence<>'cycle'
        and (p_series.recurrence<>'weekly' or extract(dow from d)::integer=any(p_series.weekdays))
        and (p_series.recurrence<>'dates' or d::date=any(p_series.specific_dates))
    ) slots
    where (candidate at time zone p_series.timezone)::date between p_from and p_through
  loop
    if p_series.special_ends_local is null then
      end_at:=occurrence+make_interval(mins=>p_series.planned_duration_minutes);
    else
      starts_day:=(occurrence at time zone p_series.timezone)::date;
      end_day:=starts_day+(p_series.special_ends_local<=(occurrence at time zone p_series.timezone)::time)::integer;
      end_at:=private.schedule_civil_instant(end_day+p_series.special_ends_local,p_series.timezone);
    end if;
    if end_at<occurrence+interval '15 minutes' or end_at>occurrence+interval '24 hours' then
      raise exception 'invalid special shift duration' using errcode='22023';
    end if;
    insert into public.scheduled_shifts(care_recipient_id,series_id,professional_id,shift_type_id,starts_at,ends_at,
      timezone,original_starts_at,status,notes)
    values(p_series.care_recipient_id,p_series.id,p_series.professional_id,p_series.shift_type_id,occurrence,end_at,
      p_series.timezone,occurrence,p_series.status,p_series.notes);
  end loop;
end
$$;

create function private.create_residence_series(p_patient uuid,p_body jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare
  hours private.schedule_residence_hours;
  mode text := p_body->>'recurrence';
  timing jsonb := p_body->'residenceHours';
  selected_period text := timing->>'period';
  reason text := trim(coalesce(p_body->>'reason',''));
  zone text;
  worker uuid := (p_body->>'professionalId')::uuid;
  typ public.shift_types;
  series public.shift_series;
  first_day date := (p_body->>'anchorDate')::date;
  last_day date := (p_body->>'validUntil')::date;
  no_end boolean := last_day is null;
  begin_local time;
  end_local time;
  dates date[];
  weekdays integer[];
  work integer := (p_body->>'workHours')::integer;
  rest integer := (p_body->>'restHours')::integer;
  publish boolean;
begin
  if p_body-array['professionalId','shiftTypeId','shiftTypeVersion','timezone','recurrence','weekdays','dates',
    'workHours','restHours','anchorDate','validUntil','notes','reason','residenceHours'] <> '{}'::jsonb
    or jsonb_typeof(timing) is distinct from 'object'
    or timing-array['version','period','startsLocal','endsLocal'] <> '{}'::jsonb
    or not timing ?& array['version','period','startsLocal','endsLocal']
    or selected_period is null or selected_period not in ('day','night')
    or not coalesce((timing->>'startsLocal') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$',false)
    or (timing->>'endsLocal' is not null and (timing->>'endsLocal') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
    or mode is null or mode not in ('once','weekly','cycle','dates')
    or jsonb_typeof(p_body->'weekdays') is distinct from 'array' or not p_body ? 'validUntil'
    or first_day is null or not isfinite(first_day)
    or not coalesce((p_body->>'anchorDate') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$',false)
    or (last_day is not null and (not isfinite(last_day) or (p_body->>'validUntil') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'))
    or length(reason)>1000
    or (no_end and mode not in ('weekly','cycle'))
    or (not no_end and (last_day<first_day or last_day>first_day+366
      or (mode='once' and last_day<>first_day))) then
    raise exception 'invalid residence shift' using errcode='22023';
  end if;
  select * into hours from private.schedule_residence_hours where care_recipient_id=p_patient;
  zone:=hours.timezone;
  if hours.version is null or hours.version::text is distinct from timing->>'version'
    or zone is distinct from p_body->>'timezone' then
    raise exception 'stale residence hours' using errcode='PT409';
  end if;
  select * into typ from public.shift_types where id=(p_body->>'shiftTypeId')::uuid
    and care_recipient_id=p_patient and is_active for share;
  if not found or typ.version::text is distinct from p_body->>'shiftTypeVersion' then
    raise exception 'stale schedule type reference' using errcode='PT409';
  end if;
  publish:=private.can(p_patient,'schedule.manage.team') or
    worker=auth.uid() and private.can(p_patient,'schedule.manage.own');
  if worker is null or not private.schedule_worker(p_patient,worker) or not (
    publish or worker=auth.uid() and private.can(p_patient,'schedule.propose')
  ) then
    raise exception 'schedule authorization required' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('schedule-worker:'||worker,0));
  if publish then perform private.require_schedule_management(p_patient,worker);
  else perform private.require_cap(p_patient,'schedule.propose'); end if;
  if first_day < (now() at time zone zone)::date and length(reason)<3 then
    raise exception 'retroactive reason required' using errcode='22023';
  end if;
  if mode='cycle' and (work is null or rest is null or (work,rest) not in ((12,36),(24,24),(24,48))
    or typ.duration_minutes<>work*60) or mode<>'cycle' and (work is not null or rest is not null) then
    raise exception 'invalid cycle' using errcode='22023';
  end if;
  select array(select value::integer from jsonb_array_elements_text(p_body->'weekdays') order by value::integer) into weekdays;
  if mode='weekly' and (cardinality(weekdays) not between 1 and 7 or not weekdays<@ array[0,1,2,3,4,5,6]
    or cardinality(weekdays)<>(select count(distinct v) from unnest(weekdays) v))
    or mode<>'weekly' and cardinality(weekdays)<>0 then
    raise exception 'invalid weekdays' using errcode='22023';
  end if;
  if mode='dates' then
    if jsonb_typeof(p_body->'dates') is distinct from 'array' or jsonb_array_length(p_body->'dates') not between 1 and 367 then
      raise exception 'invalid selected dates' using errcode='22023';
    end if;
    dates:=array(select value::date from jsonb_array_elements_text(p_body->'dates') order by value::date);
    if array_position(dates,null) is not null or not (first_day<=all(dates) and last_day>=all(dates))
      or cardinality(dates)<>(select count(distinct v) from unnest(dates) v) then
      raise exception 'invalid selected dates' using errcode='22023';
    end if;
  elsif p_body ? 'dates' then
    raise exception 'invalid selected dates' using errcode='22023';
  end if;
  begin_local:=(timing->>'startsLocal')::time;
  end_local:=(timing->>'endsLocal')::time;
  if end_local is null and begin_local is distinct from (case selected_period when 'day' then hours.day_start else hours.night_start end) then
    raise exception 'invalid residence start' using errcode='22023';
  end if;
  if no_end then last_day:=first_day+56; end if;
  insert into public.shift_series(care_recipient_id,professional_id,shift_type_id,timezone,recurrence,weekdays,
    work_hours,rest_hours,anchor_date,valid_until,status,notes,created_by,specific_dates,open_ended,
    residence_version,day_period,starts_local,special_ends_local,planned_duration_minutes)
  values(p_patient,worker,typ.id,zone,mode,weekdays,work,rest,first_day,last_day,
    case when publish then 'published' else 'proposed' end,coalesce(p_body->>'notes',''),auth.uid(),
    coalesce(dates,'{}'),no_end,hours.version,selected_period,begin_local,end_local,typ.duration_minutes)
  returning * into series;
  perform private.materialize_residence_schedule(series,first_day,last_day);
  perform private.schedule_event(p_patient,series.id,null,worker,'schedule.'||series.status,reason,null,to_jsonb(series));
  return to_jsonb(series);
end
$$;

-- Reuse the native command receipt and transaction for publication and recovery.
do $migration$
declare
  definition text:=pg_get_functiondef('public.schedule_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
  anchor text:='elsif p_action=''series'' then';
begin
  if (length(definition)-length(replace(definition,anchor,'')))/length(anchor)<>1 then
    raise exception 'schedule creation contract drift';
  end if;
  execute replace(definition,anchor,$branch$
elsif p_action='series' and p_body ? 'residenceHours' then
  result:=private.create_residence_series(p_patient,p_body);
elsif p_action='series' then$branch$);
end
$migration$;

revoke all on function private.schedule_civil_instant(timestamp,text),
  private.materialize_residence_schedule(public.shift_series,date,date), private.create_residence_series(uuid,jsonb)
  from public, anon, authenticated, service_role;

create function private.validate_schedule_residence_draft(f jsonb)
returns void language plpgsql immutable set search_path='' as $$
declare
  r jsonb:=f->'residence';
  k text;
begin
  if f->>'form' is distinct from 'series' or jsonb_typeof(r) is distinct from 'object'
    or not r ?& array['version','timezone','dayStart','nightStart','period','special','specialStart','specialEnd']
    or r-array['version','timezone','dayStart','nightStart','period','special','specialStart','specialEnd']<>'{}'::jsonb
    or jsonb_typeof(r->'version') is distinct from 'number'
    or not coalesce((r->>'version')~'^[1-9][0-9]{0,9}$',false)
    or (r->>'version')::numeric>2147483647
    or jsonb_typeof(r->'timezone') is distinct from 'string' or r->>'timezone' is distinct from f->>'timezone'
    or jsonb_typeof(r->'period') is distinct from 'string' or r->>'period' not in ('day','night')
    or jsonb_typeof(r->'special') is distinct from 'boolean' then
    raise exception 'invalid residence draft hours' using errcode='22023';
  end if;
  foreach k in array array['dayStart','nightStart','specialStart','specialEnd'] loop
    if jsonb_typeof(r->k) is distinct from 'string'
      or not ((k in ('specialStart','specialEnd') and r->>k='') or (r->>k)~'^([01][0-9]|2[0-3]):[0-5][0-9]$') then
      raise exception 'invalid residence draft hours' using errcode='22023';
    end if;
  end loop;
end
$$;

do $migration$
declare
  definition text:=pg_get_functiondef('private.validate_schedule_preparation(uuid,text,jsonb,jsonb,jsonb)'::regprocedure);
  anchor text:='f:=p_content->''schedule'';';
begin
  if (length(definition)-length(replace(definition,anchor,'')))/length(anchor)<>1 then
    raise exception 'schedule draft validation contract drift';
  end if;
  execute replace(definition,anchor,anchor||$body$
  if f ? 'residence' then
    perform private.validate_schedule_residence_draft(f);
    f:=f-'residence';
  end if;
$body$);
end
$migration$;

do $migration$
declare
  definition text:=pg_get_functiondef('private.schedule_creation_command(jsonb)'::regprocedure);
  date_anchor text:='(f->>''recurrence''<>''once'' and f->>''until''='''')';
  response_anchor text:='return jsonb_build_object(''action'',''series'',''body'',b);';
begin
  if (length(definition)-length(replace(definition,date_anchor,'')))/length(date_anchor)<>1
    or (length(definition)-length(replace(definition,response_anchor,'')))/length(response_anchor)<>1 then
    raise exception 'schedule draft command contract drift';
  end if;
  definition:=replace(definition,date_anchor,$body$
    (f->>'recurrence'<>'once' and f->>'until'='' and (not f ? 'residence' or f->>'recurrence'='dates'))
$body$);
  execute replace(definition,response_anchor,$body$
  if f ? 'residence' then
    b:=b||jsonb_build_object('shiftTypeVersion',f->'shiftTypeVersion','residenceHours',
      jsonb_build_object('version',f#>'{residence,version}','period',f#>'{residence,period}',
        'startsLocal',case when (f#>>'{residence,special}')::boolean then f#>'{residence,specialStart}'
          when f#>>'{residence,period}'='day' then f#>'{residence,dayStart}' else f#>'{residence,nightStart}' end,
        'endsLocal',case when (f#>>'{residence,special}')::boolean then f#>'{residence,specialEnd}' end));
    if f->>'recurrence' in ('weekly','cycle') and f->>'until'='' then
      b:=b||jsonb_build_object('validUntil',null);
    end if;
  end if;
  return jsonb_build_object('action','series','body',b);
$body$);
end
$migration$;

revoke all on function private.validate_schedule_residence_draft(jsonb) from public, anon, authenticated, service_role;

create function private.extend_residence_schedules(p_now timestamptz default now())
returns integer language plpgsql set search_path='' as $$
declare
  candidate record;
  series public.shift_series;
  today date;
  through date;
  extended integer:=0;
begin
  if not pg_try_advisory_xact_lock(hashtextextended('schedule:residence-horizon',0)) then return 0; end if;
  for candidate in
    select s.id,s.care_recipient_id from public.shift_series s
    join public.care_recipients p on p.id=s.care_recipient_id and p.is_active
    where s.open_ended and s.status='published' and s.ended_on is null
      and s.valid_until<(p_now at time zone s.timezone)::date+28
      and (s.continuation_retry_on is null or s.continuation_retry_on<=(p_now at time zone s.timezone)::date)
    order by s.valid_until,s.id limit 32
  loop
    if not pg_try_advisory_xact_lock(hashtextextended('schedule:'||candidate.care_recipient_id,0)) then continue; end if;
    select * into series from public.shift_series where id=candidate.id and open_ended and status='published'
      and ended_on is null for update skip locked;
    if not found then continue; end if;
    if not pg_try_advisory_xact_lock(hashtextextended('schedule-worker:'||series.professional_id,0)) then continue; end if;
    today:=(p_now at time zone series.timezone)::date;
    if series.valid_until>=today+28 or series.continuation_retry_on>today then continue; end if;
    through:=today+56;
    begin
      if not private.schedule_worker(series.care_recipient_id,series.professional_id) then
        raise exception 'series professional unavailable' using errcode='22023';
      end if;
      perform private.materialize_residence_schedule(series,greatest(series.valid_until+1,today),through);
      update public.shift_series set valid_until=through,continuation_blocked=false,continuation_retry_on=null
        where id=series.id;
      extended:=extended+1;
    exception when exclusion_violation or invalid_parameter_value then
      update public.shift_series set continuation_blocked=true,continuation_retry_on=today+1 where id=series.id;
    end;
  end loop;
  return extended;
end
$$;
revoke all on function private.extend_residence_schedules(timestamptz) from public, anon, authenticated, service_role;

do $migration$
declare
  definition text:=pg_get_functiondef('public.run_operational_schedule()'::regprocedure);
  anchor text:='v_result := public.fluent_pre_shift_scheduler();';
begin
  if (length(definition)-length(replace(definition,anchor,'')))/length(anchor)<>1 then
    raise exception 'operational scheduler contract drift';
  end if;
  execute replace(definition,anchor,anchor||E'\n  perform private.extend_residence_schedules();');
end
$migration$;
