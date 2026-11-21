-- Specific dates share one professional, reviewed type, zone and series. They
-- materialize only the selected civil dates; all existing recurrence modes stay.
alter table public.shift_series add column specific_dates date[] not null default '{}';
alter table public.shift_series drop constraint shift_series_recurrence_check;
alter table public.shift_series add constraint shift_series_recurrence_check
 check(recurrence in ('once','weekly','cycle','dates'));
alter table public.shift_series add constraint shift_series_specific_dates_check check(
 (recurrence<>'dates' and cardinality(specific_dates)=0) or
 (recurrence='dates' and cardinality(specific_dates) between 1 and 367
  and array_ndims(specific_dates)=1 and array_position(specific_dates,null) is null
  and anchor_date<=all(specific_dates) and valid_until>=all(specific_dates)));

do $$declare body text;marker text;replacement text;begin
 body:=replace(pg_get_functiondef('public.schedule_command(uuid,text,jsonb,uuid,integer)'::regprocedure),E'\r\n',E'\n');
 marker:=$marker$ select * into typ from public.shift_types where id=(p_body->>'shiftTypeId')::uuid and care_recipient_id=p_patient and is_active;
 if not found then raise exception 'shift type not found';end if;$marker$;
 marker:=replace(marker,E'\r\n',E'\n');
 if (length(body)-length(replace(body,marker,'')))/length(marker)<>1 then raise exception 'schedule type marker missing';end if;
 replacement:=marker||$dates$
 if p_body->>'recurrence'='dates' then
  if jsonb_typeof(p_body->'dates') is distinct from 'array' then raise exception 'selected shift dates required' using errcode='22023';end if;
  if jsonb_array_length(p_body->'dates') not between 1 and 367
   or exists(select 1 from jsonb_array_elements(p_body->'dates') v where jsonb_typeof(v)<>'string' or (v#>>'{}')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
   or (select count(distinct value) from jsonb_array_elements_text(p_body->'dates'))<>jsonb_array_length(p_body->'dates')
   or exists(select 1 from jsonb_array_elements_text(p_body->'dates') v where v::date<(p_body->>'anchorDate')::date or v::date>(p_body->>'validUntil')::date)
   or coalesce(p_body->'weekdays','[]'::jsonb)<>'[]'::jsonb or p_body->>'workHours' is not null or p_body->>'restHours' is not null
   or jsonb_typeof(p_body->'shiftTypeVersion') is distinct from 'number' or coalesce(p_body->>'shiftTypeVersion','')!~'^[1-9][0-9]{0,9}$' then
   raise exception 'invalid selected shift dates' using errcode='22023';end if;
  select * into typ from public.shift_types where id=typ.id and care_recipient_id=p_patient and is_active for share;
  if not found or typ.version::text is distinct from p_body->>'shiftTypeVersion' then
   raise exception 'stale schedule type reference' using errcode='PT409';end if;
 elsif p_body ? 'dates' or p_body ? 'shiftTypeVersion' then
  raise exception 'selected dates belong to their recurrence mode' using errcode='22023';
 end if;
$dates$;
 body:=replace(body,marker,replacement);
 marker:='insert into public.shift_series(care_recipient_id,professional_id,shift_type_id,timezone,recurrence,weekdays,work_hours,rest_hours,anchor_date,valid_until,status,notes,created_by,replaces_id)';
 if (length(body)-length(replace(body,marker,'')))/length(marker)<>1 then raise exception 'schedule series insert marker missing';end if;
 body:=replace(body,marker,replace(marker,'created_by,replaces_id)','created_by,replaces_id,specific_dates)'));
 marker:='coalesce(p_body->>''notes'',''''),auth.uid(),(p_body->>''replacesId'')::uuid) returning * into ser;';
 if (length(body)-length(replace(body,marker,'')))/length(marker)<>1 then raise exception 'schedule dates value marker missing';end if;
 body:=replace(body,marker,'coalesce(p_body->>''notes'',''''),auth.uid(),(p_body->>''replacesId'')::uuid,array(select value::date from jsonb_array_elements_text(coalesce(p_body->''dates'',''[]'')) order by value::date)) returning * into ser;');
 marker:=' if ser.recurrence=''weekly'' and not(extract(dow from day)::integer=any(ser.weekdays)) then continue;end if;';
 if (length(body)-length(replace(body,marker,'')))/length(marker)<>1 then raise exception 'schedule occurrence marker missing';end if;
 body:=replace(body,marker,marker||E'\n'||' if ser.recurrence=''dates'' and not(day=any(ser.specific_dates)) then continue;end if;');
 execute replace(body,E'\r\n',E'\n');
end;$$;
