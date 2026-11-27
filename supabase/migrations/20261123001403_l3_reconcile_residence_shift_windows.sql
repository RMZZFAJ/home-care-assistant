-- Elapsed work and rest intervals stay fixed after the anchor on a cycle.
-- Weekly civil times that disappear during horizon extension are logged by date.
create or replace function private.materialize_residence_schedule(p_series public.shift_series,p_from date,p_through date)
returns void language plpgsql set search_path='' as $$
declare
  anchor timestamptz;
  occurrence timestamptz;
  slot record;
  end_at timestamptz;
  end_day date;
  step_hours integer;
  extension boolean:=p_from>p_series.anchor_date;
begin
  if p_series.recurrence='cycle' then
    anchor:=private.schedule_civil_instant(p_series.anchor_date+p_series.starts_local,p_series.timezone);
    step_hours:=p_series.work_hours+p_series.rest_hours;
  end if;
  for slot in
    select candidate instant,null::date local_day from generate_series(
      anchor+make_interval(hours=>greatest(0,floor(extract(epoch from
        ((p_from::timestamp at time zone p_series.timezone)-anchor))/3600/step_hours)::integer)*step_hours),
      (p_through+1)::timestamp at time zone p_series.timezone,make_interval(hours=>step_hours)
    ) candidate where p_series.recurrence='cycle'
      and (candidate at time zone p_series.timezone)::date between p_from and p_through
    union all
    select null::timestamptz,d::date from generate_series(p_from::timestamp,p_through::timestamp,interval '1 day') d
    where p_series.recurrence<>'cycle'
      and (p_series.recurrence<>'weekly' or extract(dow from d)::integer=any(p_series.weekdays))
      and (p_series.recurrence<>'dates' or d::date=any(p_series.specific_dates))
  loop
    begin
      occurrence:=coalesce(slot.instant,private.schedule_civil_instant(slot.local_day+p_series.starts_local,p_series.timezone));
      if p_series.recurrence='cycle' then
        end_at:=occurrence+make_interval(hours=>p_series.work_hours);
      elsif p_series.special_ends_local is null then
        end_at:=occurrence+make_interval(mins=>p_series.planned_duration_minutes);
      else
        end_day:=slot.local_day+(p_series.special_ends_local<=p_series.starts_local)::integer;
        end_at:=private.schedule_civil_instant(end_day+p_series.special_ends_local,p_series.timezone);
      end if;
      if end_at<occurrence+interval '15 minutes' or end_at>occurrence+interval '24 hours' then
        raise exception 'invalid special shift duration' using errcode='22023';
      end if;
    exception when invalid_parameter_value then
      if not extension or slot.local_day is null then raise;end if;
      insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
      values(null,'schedule.civil_time_skipped','shift_series',p_series.id,
        jsonb_build_object('care_recipient_id',p_series.care_recipient_id,'date',slot.local_day,'timezone',p_series.timezone,
          'startsLocal',p_series.starts_local,'endsLocal',p_series.special_ends_local));
      continue;
    end;
    insert into public.scheduled_shifts(care_recipient_id,series_id,professional_id,shift_type_id,starts_at,ends_at,
      timezone,original_starts_at,status,notes)
    values(p_series.care_recipient_id,p_series.id,p_series.professional_id,p_series.shift_type_id,occurrence,end_at,
      p_series.timezone,occurrence,p_series.status,p_series.notes);
  end loop;
end;$$;

do $$
declare ddl text:=pg_get_functiondef('private.create_residence_series(uuid,jsonb)'::regprocedure);
  timing text:='if no_end then last_day:=first_day+56; end if;';
  materialize text:='perform private.materialize_residence_schedule(series,first_day,last_day);';
begin
  if (length(ddl)-length(replace(ddl,timing,'')))/length(timing)<>1
    or (length(ddl)-length(replace(ddl,materialize,'')))/length(materialize)<>1 then
    raise exception 'residence series scheduling contract drift';
  end if;
  ddl:=replace(ddl,timing,$timing$
    if mode='cycle' and end_local is not null and
      private.schedule_civil_instant(first_day+(end_local<=begin_local)::integer+end_local,zone)
      -private.schedule_civil_instant(first_day+begin_local,zone)<>make_interval(hours=>work) then
      raise exception 'special hours must match cycle work hours' using errcode='22023';
    end if;
    if no_end then last_day:=first_day+56; end if;
  $timing$);
  execute replace(ddl,materialize,materialize||$materialize$
    if not exists(select 1 from public.scheduled_shifts where series_id=series.id and care_recipient_id=p_patient) then
      raise exception 'selected period has no scheduled occurrence' using errcode='22023';
    end if;
  $materialize$);
end;$$;
