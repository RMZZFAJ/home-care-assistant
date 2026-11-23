-- Keep the interval of each scheduled occurrence and freeze the chosen cycle on its series.
alter table public.shift_types
  add column rest_hours smallint,
  add constraint shift_types_work_rest_check check (
    rest_hours is null or (rest_hours >= 0 and duration_minutes % 60 = 0)
  );

alter table public.shift_series
  drop constraint shift_series_check2,
  add constraint shift_series_cycle_check check (
    recurrence <> 'cycle' or
    case when residence_version is null then
      (work_hours, rest_hours) in ((12,36),(24,24),(24,48))
    else
      work_hours is not null and rest_hours is not null and planned_duration_minutes is not null
      and work_hours between 1 and 24 and rest_hours between 0 and 32767
      and planned_duration_minutes = work_hours * 60
    end
  );

create function private.validate_shift_type_rest_draft(fields jsonb)
returns void language plpgsql immutable set search_path='' as $$
begin
  if fields->>'form' is distinct from 'type' or fields->>'start' is distinct from ''
     or jsonb_typeof(fields->'restHours') is distinct from 'string'
     or fields->>'restHours' !~ '^[0-9]{0,5}$' then
    raise exception 'invalid shift type rest hours' using errcode='22023';
  end if;
  if nullif(fields->>'restHours','')::integer > 32767 then
    raise exception 'invalid shift type rest hours' using errcode='22023';
  end if;
end;
$$;

revoke all on function private.validate_shift_type_rest_draft(jsonb) from public, anon, authenticated, service_role;

-- Extend the deployed functions in place so the surrounding permissions and transaction contracts stay shared.
create function pg_temp.apply_shift_type_change(ddl text, anchor text, replacement text)
returns text language plpgsql set search_path='' as $$
begin
  ddl:=replace(ddl,E'\r\n',E'\n');
  if (length(ddl)-length(replace(ddl,anchor,'')))/length(anchor)<>1 then
    raise exception 'shift type contract drift at %', anchor;
  end if;
  return replace(ddl,anchor,replacement);
end;
$$;

do $migration$
declare ddl text:=pg_get_functiondef('public.schedule_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
begin
  ddl:=pg_temp.apply_shift_type_change(ddl,'balance_assignment public.bal_assignments;',
    'balance_assignment public.bal_assignments; type_start time; type_rest smallint;');
  ddl:=pg_temp.apply_shift_type_change(ddl,$before$
 if p_action='type' then
 perform private.require_cap(p_patient,'schedule.types.manage');
$before$,$after$
 if p_action='type' then
 perform private.require_cap(p_patient,'schedule.types.manage');
 if p_body ? 'restHours' then
   if p_body-array['id','name','restHours','durationMinutes','active']<>'{}'::jsonb
      or jsonb_typeof(p_body->'restHours') is distinct from 'number'
      or jsonb_typeof(p_body->'durationMinutes') is distinct from 'number'
      or p_body->>'restHours' !~ '^[0-9]{1,5}$'
      or p_body->>'durationMinutes' !~ '^[0-9]{1,4}$'
      or (p_body ? 'active' and jsonb_typeof(p_body->'active') is distinct from 'boolean') then
     raise exception 'invalid shift type cycle' using errcode='22023';
   end if;
   if (p_body->>'restHours')::integer > 32767 or (p_body->>'durationMinutes')::integer not between 60 and 1440
      or (p_body->>'durationMinutes')::integer % 60 <> 0 then
     raise exception 'invalid shift type cycle' using errcode='22023';
   end if;
   type_rest:=(p_body->>'restHours')::smallint;
   -- The existing start column also serves readers deployed before this migration.
   -- Structured types always schedule against the independently versioned residence.
   select day_start into type_start from private.schedule_residence_hours where care_recipient_id=p_patient;
   if not found then raise exception 'configure residence hours before creating a shift type' using errcode='PT409';end if;
 else
   type_start:=(p_body->>'startsLocal')::time;
 end if;
$after$);
  ddl:=pg_temp.apply_shift_type_change(ddl,
    $before$-- Existing occurrences retain their real intervals; changing a type affects new series only.
 update public.shift_types set name=trim(p_body->>'name'),starts_local=(p_body->>'startsLocal')::time,$before$,
    $after$if typ.rest_hours is not null and type_rest is null then
   raise exception 'structured shift type requires rest hours' using errcode='22023';
 end if;
 -- Existing occurrences retain their real intervals; changing a type affects new series only.
 update public.shift_types set name=trim(p_body->>'name'),starts_local=type_start,rest_hours=type_rest,$after$);
  ddl:=pg_temp.apply_shift_type_change(ddl,
    $before$public.shift_types(care_recipient_id,name,starts_local,duration_minutes,created_by,is_active)
 values(p_patient,trim(p_body->>'name'),(p_body->>'startsLocal')::time,$before$,
    $after$public.shift_types(care_recipient_id,name,starts_local,rest_hours,duration_minutes,created_by,is_active)
 values(p_patient,trim(p_body->>'name'),type_start,type_rest,$after$);
  ddl:=pg_temp.apply_shift_type_change(ddl,
    $before$if not found then raise exception 'shift type not found';end if;
 if p_body->>'recurrence'='dates' then$before$,
    $after$if not found then raise exception 'shift type not found';end if;
 if typ.rest_hours is not null then
   raise exception 'structured shift type requires residence hours' using errcode='PT409';
 end if;
 if p_body->>'recurrence'='dates' then$after$);
  execute ddl;

  ddl:=pg_get_functiondef('private.create_residence_series(uuid,jsonb)'::regprocedure);
  execute pg_temp.apply_shift_type_change(ddl,
    $before$if mode='cycle' and (work is null or rest is null or (work,rest) not in ((12,36),(24,24),(24,48))
    or typ.duration_minutes<>work*60) or mode<>'cycle' and (work is not null or rest is not null) then$before$,
    $after$if mode='cycle' and (
    work is null or work not between 1 and 24 or rest is null or rest not between 0 and 32767
    or typ.duration_minutes/60<>work or typ.duration_minutes%60<>0
    or case when typ.rest_hours is null then (work,rest) not in ((12,36),(24,24),(24,48))
      else rest<>typ.rest_hours end
  ) or mode<>'cycle' and (work is not null or rest is not null) then$after$);

  ddl:=pg_get_functiondef('private.validate_schedule_preparation(uuid,text,jsonb,jsonb,jsonb)'::regprocedure);
  execute pg_temp.apply_shift_type_change(ddl,$before$f:=p_content->'schedule';$before$,$after$
 f:=p_content->'schedule';
 if f ? 'restHours' then
   perform private.validate_shift_type_rest_draft(f);
   f:=f-'restHours';
 end if;
 if f ? 'typeCycle' then
   if f->>'form' is distinct from 'series' or coalesce(f->>'shiftTypeId','')=''
      or jsonb_typeof(f->'typeCycle') is distinct from 'object'
      or (f->'typeCycle')-array['workHours','restHours']<>'{}'::jsonb
      or jsonb_typeof(f#>'{typeCycle,workHours}') is distinct from 'number'
      or jsonb_typeof(f#>'{typeCycle,restHours}') is distinct from 'number'
      or f#>>'{typeCycle,workHours}' !~ '^[0-9]{1,2}$'
      or f#>>'{typeCycle,restHours}' !~ '^[0-9]{1,5}$' then
     raise exception 'invalid shift type cycle reference' using errcode='22023';
   end if;
   if (f#>>'{typeCycle,workHours}')::integer not between 1 and 24
      or (f#>>'{typeCycle,restHours}')::integer not between 0 and 32767 then
     raise exception 'invalid shift type cycle reference' using errcode='22023';
   end if;
   f:=f-'typeCycle';
 end if;
$after$);

  ddl:=pg_get_functiondef('private.validate_schedule_resource_fields(text,jsonb,jsonb)'::regprocedure);
  execute pg_temp.apply_shift_type_change(ddl,
    $before$ if p_purpose='shift_type_edit' and form='type' then expected:=$before$,
    $after$ if p_purpose='shift_type_edit' and f ? 'restHours' then
  perform private.validate_shift_type_rest_draft(f);
  f:=f-'restHours';
 end if;
 if p_purpose='shift_type_edit' and form='type' then expected:=$after$);

  ddl:=pg_get_functiondef('private.schedule_creation_command(jsonb)'::regprocedure);
  ddl:=pg_temp.apply_shift_type_change(ddl,$before$if f->>'form'='type' then$before$,$after$
 if f->>'form'='type' then
  if f ? 'restHours' then
   perform private.validate_shift_type_rest_draft(f);
   if nullif(f->>'restHours','') is null or length(btrim(f->>'name',white)) not between 2 and 100
      or nullif(f->>'duration','') is null or (f->>'duration')::numeric not between 60 and 1440
      or mod((f->>'duration')::numeric,60)<>0 then
     raise exception 'invalid complete shift type cycle' using errcode='22023';
   end if;
   return jsonb_build_object('action','type','body',jsonb_build_object('name',btrim(f->>'name',white),
     'durationMinutes',(f->>'duration')::numeric::integer,'restHours',(f->>'restHours')::integer,'active',f->'active'));
  end if;
$after$);
  execute pg_temp.apply_shift_type_change(ddl,
    $before$b:=b||jsonb_build_object('workHours',split_part(f->>'cycle','x',1)::integer,'restHours',split_part(f->>'cycle','x',2)::integer);$before$,
    $after$
  if f ? 'typeCycle' and not f ? 'residence' then
   raise exception 'structured shift type requires residence hours' using errcode='PT409';
  end if;
  b:=b||coalesce(f->'typeCycle',jsonb_build_object('workHours',split_part(f->>'cycle','x',1)::integer,'restHours',split_part(f->>'cycle','x',2)::integer));
 $after$);

  ddl:=pg_get_functiondef('private.schedule_resource_intent(private.schedule_resource_preparations)'::regprocedure);
  execute pg_temp.apply_shift_type_change(ddl,$before$if f->>'form'='type' then$before$,$after$
 if f->>'form'='type' then
  if f ? 'restHours' then
   b:=b||(private.schedule_creation_command(jsonb_build_object('schedule',f))->'body');
   return jsonb_build_object('action','type','body',b);
  end if;
$after$);

  ddl:=pg_get_functiondef('private.schedule_resource_source(uuid,text,uuid)'::regprocedure);
  execute pg_temp.apply_shift_type_change(ddl,$before$select to_jsonb(t) into target from public.shift_types t$before$,
    $after$select case when t.rest_hours is null then to_jsonb(t)-'rest_hours' else to_jsonb(t) end into target from public.shift_types t$after$);
end;
$migration$;

drop function pg_temp.apply_shift_type_change(text,text,text);
