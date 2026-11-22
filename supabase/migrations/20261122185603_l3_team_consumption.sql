-- New team records have a different lifecycle. Legacy reports retain their
-- original facts, decisions, movement references and pending state.
alter table public.consumption_reports add column workflow_mode text not null default 'legacy';
alter table public.consumption_reports drop constraint consumption_reports_status_check;
alter table public.consumption_reports add constraint consumption_reports_status_check check (
  (workflow_mode='legacy' and status in ('reported','confirmed','rejected'))
  or (workflow_mode='direct' and kind='consumption' and location='CARE_TEAM' and status in ('recorded','cancelled'))
  or (workflow_mode='shortage' and kind='shortage' and location='CARE_TEAM' and status='communicated')
);

insert into public.capability_definitions(code,default_roles,critical) values
  ('consumption.team.write',array['admin','professional','supervisor'],false),
  ('consumption.team.correct',array['admin','supervisor'],true);

create table private.consumption_acts (
  id uuid primary key default gen_random_uuid(),
  care_recipient_id uuid not null references public.care_recipients(id),
  report_id uuid not null references public.consumption_reports(id),
  report_version integer not null check (report_version>0),
  action text not null check (action in ('issue','correct','cancel','shortage')),
  actor_id uuid not null references public.profiles(id),
  actor_name text,
  command_key uuid not null,
  request jsonb not null,
  recorded_at timestamptz not null default clock_timestamp(),
  unique (actor_id,command_key),
  unique(report_id,report_version)
);
create index consumption_acts_patient on private.consumption_acts(care_recipient_id);
alter table private.consumption_acts enable row level security;
revoke all on private.consumption_acts from public,anon,authenticated,service_role;
create trigger consumption_acts_immutable before update or delete on private.consumption_acts
  for each row execute function private.immutable_event();

create function private.require_team_consumption_write(p_patient uuid)
returns void language plpgsql set search_path='' as $$
begin
  perform private.require_cap(p_patient,'consumption.team.write');
  perform private.require_consumption_read(p_patient,'CARE_TEAM');
  if not exists(select 1 from public.care_recipients where id=p_patient and is_active) then
    raise exception 'patient unavailable' using errcode='42501';
  end if;
end;
$$;
revoke all on function private.require_team_consumption_write(uuid) from public,anon,authenticated,service_role;

create function private.team_consumption_receipt(affected private.consumption_acts)
returns jsonb language sql stable set search_path='' as $$
  select jsonb_build_object('id',affected.report_id,'careRecipientId',affected.care_recipient_id,
    'operationId',affected.id,'version',affected.report_version,'action',affected.action,
    'idempotencyKey',affected.command_key,'recordedAt',affected.recorded_at);
$$;
revoke all on function private.team_consumption_receipt(private.consumption_acts) from public,anon,authenticated,service_role;

create function public.team_consumption_result(p_patient uuid,p_key uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare affected private.consumption_acts;
begin
  perform private.require_team_consumption_write(p_patient);
  select * into affected from private.consumption_acts
    where care_recipient_id=p_patient and actor_id=auth.uid() and command_key=p_key;
  if not found then return null; end if;
  return private.team_consumption_receipt(affected);
end;
$$;

create function public.team_consumption_command(p_patient uuid,p_key uuid,p_body jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  action text := p_body->>'action';
  report_id uuid := (p_body->>'reportId')::uuid;
  reminder_id uuid := (p_body->>'reminderId')::uuid;
  repeated_id uuid := (p_body->>'repeatedReportId')::uuid;
  expected integer := (p_body->>'expectedVersion')::integer;
  observation text := trim(coalesce(p_body->>'observation',''));
  reason text := trim(coalesce(p_body->>'reason',''));
  input jsonb;
  delta record;
  movement_qty numeric;
  affected private.consumption_acts;
  report public.consumption_reports;
  reminder public.operational_reminders;
  actor_name text;
  canonical jsonb := '[]'::jsonb;
  previous jsonb := '[]'::jsonb;
  previous_item jsonb;
  item jsonb;
  request jsonb;
  next_version integer;
begin
  perform private.require_team_consumption_write(p_patient);
  if p_key is null or jsonb_typeof(p_body) is distinct from 'object'
    or (p_body-array['action','reportId','reminderId','repeatedReportId','expectedVersion','observation','reason','lines'])<>'{}'::jsonb
    or action is null or action not in ('issue','correct','cancel','shortage')
    or length(observation)>2000 or length(reason)>1000
    or (action in ('correct','cancel') and (expected is null or expected<1 or report_id is null or length(reason)<3))
    or (action in ('issue','shortage') and (expected is not null or report_id is not null or reason<>''))
    or (action='cancel' and observation<>'') or (action='shortage' and length(observation)<3)
    or (reminder_id is not null and action not in ('issue','shortage'))
    or (repeated_id is not null and action<>'shortage')
  then raise exception 'invalid team consumption command' using errcode='22023'; end if;
  input := private.consumption_input(coalesce(p_body->'lines','[]'::jsonb));
  if (action in ('issue','correct') and jsonb_array_length(input)=0)
    or (action='cancel' and jsonb_array_length(input)<>0) then
    raise exception 'team consumption requires at least one material' using errcode='22023';
  end if;

  request := jsonb_build_object('action',action,'reportId',report_id,'reminderId',reminder_id,
    'repeatedReportId',repeated_id,'expectedVersion',expected,'observation',observation,'reason',reason,'lines',input);
  perform pg_advisory_xact_lock(hashtextextended('team-consumption:'||actor||':'||p_key,0));
  perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
  perform private.require_team_consumption_write(p_patient);
  select * into affected from private.consumption_acts where actor_id=actor and command_key=p_key;
  if found then
    if affected.care_recipient_id<>p_patient or affected.request<>request then
      raise exception 'idempotency payload mismatch' using errcode='23505';
    end if;
    return private.team_consumption_receipt(affected);
  end if;

  select full_name into actor_name from public.profiles where id=actor;
  if action in ('correct','cancel') then
    select * into report from public.consumption_reports
      where id=report_id and care_recipient_id=p_patient and workflow_mode='direct' for update;
    if not found then raise exception 'team consumption unavailable' using errcode='42501'; end if;
    if report.reported_by<>actor then perform private.require_cap(p_patient,'consumption.team.correct'); end if;
    if report.version<>expected or report.status<>'recorded' then
      raise exception 'stale consumption report' using errcode='PT409';
    end if;
    next_version := report.version+1;
    previous := private.consumption_current_lines(report_id);
  else
    next_version := 1;
  end if;
  if reminder_id is not null then
    reminder := private.shift_reminder_for_actor(p_patient,reminder_id);
    if reminder.user_id<>actor or reminder.expected_at>clock_timestamp() then
      raise exception 'team reminder unavailable' using errcode='42501';
    end if;
  end if;
  if repeated_id is not null and not exists (select 1 from public.consumption_reports r
    where r.id=repeated_id and r.care_recipient_id=p_patient and r.kind='shortage' and r.location='CARE_TEAM') then
    raise exception 'shortage origin unavailable' using errcode='42501';
  end if;

  for item in select value from jsonb_array_elements(input) loop
    select value into previous_item from jsonb_array_elements(previous)
      where value->>'productId'=item->>'productId';
    if previous_item is not null and (item->>'quantity')::numeric<=(previous_item->>'quantity')::numeric then
      if item ? 'unit' and item->>'unit' is distinct from previous_item->>'unit' then
        raise exception 'invalid consumption unit reference' using errcode='22023';
      end if;
      canonical := canonical||jsonb_build_array(previous_item||jsonb_build_object('quantity',item->>'quantity'));
    else
      canonical := canonical||private.consumption_lines(p_patient,'CARE_TEAM',jsonb_build_array(item));
    end if;
  end loop;

  if action in ('issue','shortage') then
    insert into public.consumption_reports(care_recipient_id,reported_by,reported_name,kind,location,status,
      body,lines,submitted_intent,idempotency_key,source_reminder_id,workflow_mode)
    values(p_patient,actor,actor_name,case when action='issue' then 'consumption' else 'shortage' end,'CARE_TEAM',
      case when action='issue' then 'recorded' else 'communicated' end,observation,canonical,request,p_key,reminder_id,
      case when action='issue' then 'direct' else 'shortage' end) returning id into report_id;
  elsif action='correct' then
    insert into public.consumption_report_revisions(report_id,version,actor_id,actor_name,body,lines,submitted_intent,idempotency_key)
      values(report_id,next_version,actor,actor_name,observation,canonical,request,p_key);
    update public.consumption_reports set version=next_version where id=report_id;
  else
    update public.consumption_reports set status='cancelled',version=next_version where id=report_id;
  end if;

  insert into private.consumption_acts(care_recipient_id,report_id,report_version,action,actor_id,actor_name,command_key,request)
    values(p_patient,report_id,next_version,action,actor,actor_name,p_key,request) returning * into affected;

  if action<>'shortage' then
    for delta in
      with old as (select value->>'productId' as product_id,(value->>'quantity')::numeric as quantity from jsonb_array_elements(previous)),
      new as (select value->>'productId' as product_id,(value->>'quantity')::numeric as quantity from jsonb_array_elements(canonical))
      select coalesce(new.product_id,old.product_id) as product_id,coalesce(new.quantity,0)-coalesce(old.quantity,0) as effect
      from new full join old using(product_id) where coalesce(new.quantity,0)<>coalesce(old.quantity,0) order by 1
    loop
      movement_qty := abs(delta.effect);
      perform private.move_stock(p_patient,delta.product_id,movement_qty,
        case when delta.effect>0 then 'CARE_TEAM' end,case when delta.effect<0 then 'CARE_TEAM' end,
        case when action='issue' then 'Consumo do plantão' else reason end,'consumption_operation',affected.id);
    end loop;
  end if;

  if reminder_id is not null then
    update public.operational_reminders set acknowledged_at=coalesce(acknowledged_at,clock_timestamp())
      where id=reminder_id and care_recipient_id=p_patient and user_id=actor;
    update public.requisition_notifications set seen_at=coalesce(seen_at,clock_timestamp())
      where reminder_id=reminder_id and recipient_user_id=actor;
  end if;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
    values(actor,'consumption.'||affected.action,'consumption',report_id,
      jsonb_build_object('care_recipient_id',p_patient,'version',next_version,'operationId',affected.id));
  perform private.require_team_consumption_write(p_patient);
  if action in ('correct','cancel') and report.reported_by<>actor then perform private.require_cap(p_patient,'consumption.team.correct'); end if;
  return private.team_consumption_receipt(affected);
end;
$$;

revoke all on function public.team_consumption_command(uuid,uuid,jsonb),public.team_consumption_result(uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.team_consumption_command(uuid,uuid,jsonb),public.team_consumption_result(uuid,uuid)
  to authenticated;

create function public.team_consumption_movement_origin(p_patient uuid,p_movement uuid)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare report uuid;
begin
  perform private.require_consumption_read(p_patient,'CARE_TEAM');
  select a.report_id into report from public.stock_movements m
    join private.consumption_acts a on a.id=m.reference_id and a.care_recipient_id=m.care_recipient_id
    where m.id=p_movement and m.care_recipient_id=p_patient and m.reference_type='consumption_operation'
      and 'CARE_TEAM' in (m.source_location,m.destination_location);
  return report;
end;
$$;
revoke all on function public.team_consumption_movement_origin(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.team_consumption_movement_origin(uuid,uuid) to authenticated;

do $migration$
declare
  definition text := pg_get_functiondef('public.consumption_report(uuid)'::regprocedure);
  original text := definition;
begin
  definition := replace(definition,
    $anchor$'current_lines',private.consumption_current_lines(p_id),$anchor$,
    $edit$'current_lines',private.consumption_current_lines(p_id),
  'acts',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'action',a.action,
    'version',a.report_version,'by',a.actor_name,'at',a.recorded_at,'reason',a.request->>'reason',
    'repeatedReportId',a.request->>'repeatedReportId') order by a.report_version)
    from private.consumption_acts a where a.report_id=p_id and a.care_recipient_id=r.care_recipient_id),'[]'::jsonb),$edit$);
  definition := replace(definition,
    $anchor$where m.reference_type='consumption' and m.reference_id=p_id and m.care_recipient_id=r.care_recipient_id$anchor$,
    $edit$where m.care_recipient_id=r.care_recipient_id and (
      (m.reference_type='consumption' and m.reference_id=p_id) or
      (m.reference_type='consumption_operation' and exists(select 1 from private.consumption_acts a
        where a.id=m.reference_id and a.report_id=p_id and a.care_recipient_id=m.care_recipient_id)))$edit$);
  if definition=original or strpos(definition,'''acts'',coalesce')=0 or strpos(definition,'''consumption_operation''')=0
  then raise exception 'consumption report projection anchors changed'; end if;
  execute definition;
  definition := pg_get_functiondef('public.stock_operation_history(uuid,text,timestamptz,timestamptz,text,integer,integer,text,text)'::regprocedure);
  original := definition;
  definition := replace(definition, $anchor$when document_act.id is not null then$anchor$,
    $edit$when consumption_act.id is not null then 'consumption:'||consumption_act.id
          when document_act.id is not null then$edit$);
  definition := replace(definition, 'coalesce(operation.actor_name,document_act.actor_name,application.actor_name,profile.full_name)',
    'coalesce(operation.actor_name,document_act.actor_name,consumption_act.actor_name,application.actor_name,profile.full_name)');
  definition := replace(definition, 'left join private.stock_document_act_movements document_movement',
    $edit$left join private.consumption_acts consumption_act on m.reference_type='consumption_operation'
        and consumption_act.id=m.reference_id and consumption_act.care_recipient_id=p_patient
      left join private.stock_document_act_movements document_movement$edit$);
  if definition=original or strpos(definition,'when consumption_act.id is not null')=0
    or strpos(definition,'document_act.actor_name,consumption_act.actor_name')=0
    or strpos(definition,'left join private.consumption_acts consumption_act')=0
  then raise exception 'consumption act history anchors changed'; end if;
  execute definition;
end;
$migration$;
