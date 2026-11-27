-- An existing Flow suggestion becomes a normal team issue only after the
-- owner reviews the materials and confirms. Reuse the operation and its locks.
create function pg_temp.flow_contract(ddl text, anchor text, replacement text)
returns text language plpgsql set search_path='' as $$
begin
  ddl:=replace(ddl,E'\r\n',E'\n');
  if (length(ddl)-length(replace(ddl,anchor,'')))/length(anchor)<>1 then
    raise exception 'consumption flow contract drift at %',anchor;
  end if;
  return replace(ddl,anchor,replacement);
end;
$$;

do $migration$
declare ddl text;
begin
  ddl:=pg_get_functiondef('private.validate_consumption_preparation(jsonb,jsonb,text)'::regprocedure);
  ddl:=pg_temp.flow_contract(ddl,$before$'lines','reminderId']$before$,$after$'lines','reminderId','flowSubmissionId']$after$);
  execute pg_temp.flow_contract(ddl,
    $before$ for f in select * from jsonb_each((p_content->'consumption')-'lines') loop$before$,
    $after$
 if (p_content->'consumption') ? 'flowSubmissionId' and (
   p_purpose<>'consumption_report_team' or p_content#>>'{consumption,kind}' is distinct from 'consumption'
   or p_content#>>'{consumption,location}' is distinct from 'CARE_TEAM'
   or p_content#>>'{consumption,reminderId}' is distinct from ''
   or not coalesce((p_content#>>'{consumption,flowSubmissionId}')~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',false)
 ) then raise exception 'invalid consumption flow preparation' using errcode='22023';end if;
 for f in select * from jsonb_each((p_content->'consumption')-'lines') loop$after$);

  ddl:=pg_get_functiondef('public.commit_consumption_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid)'::regprocedure);
  execute pg_temp.flow_contract(ddl,
    $before$f:=d.content->'consumption';$before$,
    $after$f:=d.content->'consumption';
 if f ? 'flowSubmissionId' then raise exception 'flow preparation requires direct issue' using errcode='22023';end if;$after$);

  ddl:=pg_get_functiondef('public.submit_team_consumption(uuid,uuid,jsonb,text,uuid,integer)'::regprocedure);
  ddl:=pg_temp.flow_contract(ddl,$before$  if p_key is null or $before$,$after$  if p_key is null
    or (p_body ? 'flowSubmissionId' and p_draft_id is null)
    or $after$);
  execute pg_temp.flow_contract(ddl,
    $before$      or nullif(fields->>'reminderId','') is distinct from p_body->>'reminderId'$before$,
    $after$      or nullif(fields->>'reminderId','') is distinct from p_body->>'reminderId'
      or fields->>'flowSubmissionId' is distinct from p_body->>'flowSubmissionId'$after$);

  ddl:=pg_get_functiondef('public.team_consumption_command(uuid,uuid,jsonb)'::regprocedure);
  ddl:=pg_temp.flow_contract(ddl,$before$  next_version integer;$before$,$after$  next_version integer;
  flow_id uuid := (p_body->>'flowSubmissionId')::uuid;
  suggestion public.flow_submissions;$after$);
  ddl:=pg_temp.flow_contract(ddl,$before$'reason','lines'])$before$,$after$'reason','lines','flowSubmissionId'])$after$);
  ddl:=pg_temp.flow_contract(ddl,$before$    or (repeated_id is not null and action<>'shortage')$before$,$after$
    or (repeated_id is not null and action<>'shortage')
    or (p_body ? 'flowSubmissionId' and (flow_id is null or action<>'issue' or p_body->>'reminderId' is not null))
$after$);
  ddl:=pg_temp.flow_contract(ddl,$before$  perform pg_advisory_xact_lock(hashtextextended('team-consumption:'$before$,$after$
  if flow_id is not null then request:=request||jsonb_build_object('flowSubmissionId',flow_id);end if;
  perform pg_advisory_xact_lock(hashtextextended('team-consumption:'$after$);
  ddl:=pg_temp.flow_contract(ddl,$before$  select full_name into actor_name from public.profiles where id=actor;$before$,$after$
  if flow_id is not null then
    perform private.require_cap(p_patient,'consumption.report');
    select * into suggestion from public.flow_submissions
      where id=flow_id and care_recipient_id=p_patient and user_id=actor and body->>'kind'='consumption' for update;
    if not found then raise exception 'consumption flow unavailable' using errcode='42501';end if;
    if suggestion.status<>'pending_confirmation' then
      raise exception 'consumption flow already settled' using errcode='PT409';
    end if;
    perform private.require_team_consumption_write(p_patient);
    perform private.require_cap(p_patient,'consumption.report');
  end if;
  select full_name into actor_name from public.profiles where id=actor;$after$);
  execute pg_temp.flow_contract(ddl,
    $before$  return private.team_consumption_receipt(affected);
end;$before$,
    $after$  if flow_id is not null then
    perform private.require_cap(p_patient,'consumption.report');
    update public.flow_submissions set status='confirmed',report_id=affected.report_id,
      reviewed_at=clock_timestamp() where id=flow_id;
    insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
      values(actor,'flow.confirmed','flow_submission',flow_id,
        jsonb_build_object('care_recipient_id',p_patient,'report_id',report_id,'operationId',affected.id));
  end if;
  return private.team_consumption_receipt(affected);
end;$after$);

  ddl:=pg_get_functiondef('public.consumption_record_detail(uuid)'::regprocedure);
  execute pg_temp.flow_contract(ddl,
    $before$'at',a.recorded_at,'reason',a.request->>'reason','repeatedReportId',a.request->>'repeatedReportId')$before$,
    $after$'at',a.recorded_at,'reason',a.request->>'reason','repeatedReportId',a.request->>'repeatedReportId',
      'source',case when a.request ? 'flowSubmissionId' then 'whatsapp' end)$after$);
end;
$migration$;

drop function pg_temp.flow_contract(text,text,text);
