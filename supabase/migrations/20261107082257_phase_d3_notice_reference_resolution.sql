-- Exact notice targets stay within the selected, revocable patient scope.
-- Original reminder/event identifiers never stand in for authorization.
create unique index reminders_id_patient on public.operational_reminders(id,care_recipient_id);
alter table public.consumption_reports add column source_reminder_id uuid;
alter table public.consumption_reports add constraint consumption_reminder_patient_fk
 foreign key(source_reminder_id,care_recipient_id) references public.operational_reminders(id,care_recipient_id);
create index consumption_reminder_history on public.consumption_reports(source_reminder_id,created_at desc,id desc) where source_reminder_id is not null;

create function private.shift_reminder_for_actor(p_patient uuid,p_id uuid) returns public.operational_reminders
language plpgsql security definer set search_path='' as $$declare r public.operational_reminders;begin
 perform private.require_consumption_read(p_patient,'CARE_TEAM');
 select * into r from public.operational_reminders where id=p_id and care_recipient_id=p_patient and kind='shift'
  and (user_id=auth.uid() or public.can_manage_recipient(p_patient));
 if not found then raise exception 'notification reference unavailable' using errcode='42501';end if;
 perform private.require_consumption_read(p_patient,'CARE_TEAM');return r;
end;$$;

create function public.notification_reference(p_patient uuid,p_ref uuid,p_area text,p_namespace text default 'auto') returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.operational_reminders;a public.stock_alert_events;cr public.consumption_reports;
 se public.shift_events;s public.scheduled_shifts;ss public.shift_series;be public.bal_cycle_events;
 bc public.bal_cycles;ba public.bal_assignments;result jsonb;current_value jsonb;day date;
 is_team boolean;cap text;reports jsonb;report_count integer;
begin
 if p_ref is null or p_area is null or p_namespace is null or p_area not in ('schedule','balance','stock','consumption') or p_namespace not in ('auto','report','reminder','alert') then raise exception 'invalid notification reference' using errcode='22023';end if;
 if p_area='stock' and p_namespace in ('auto','alert') then
  select * into a from public.stock_alert_events where id=p_ref and care_recipient_id=p_patient;
  if not found then raise exception 'notification reference unavailable' using errcode='42501';end if;
  cap:=case a.location when 'FAMILY' then 'stock.family.read' else 'stock.team.read' end;perform private.require_cap(p_patient,cap);
  result:=jsonb_build_object('kind','stock_alert','referenceId',p_ref,'careRecipientId',p_patient,'productId',a.product_id,
   'productName',(select name from public.care_recipient_products where care_recipient_id=p_patient and product_id=a.product_id),
   'unit',(select unit from public.care_recipient_products where care_recipient_id=p_patient and product_id=a.product_id),
   'location',a.location,'severity',a.severity,'state',a.state,'balance',a.balance::text,'createdAt',a.created_at,
   'observedAt',a.observed_at,'resolvedAt',a.resolved_at,'currentBalance',private.stock_quantity(p_patient,a.product_id,a.location)::text);
  perform private.require_cap(p_patient,cap);return result;
 end if;
 if p_area='consumption' and p_namespace in ('auto','report') then
  select * into cr from public.consumption_reports where id=p_ref and care_recipient_id=p_patient;
  if found then
   if p_namespace='auto' and exists(select 1 from public.operational_reminders where id=p_ref and care_recipient_id=p_patient) then raise exception 'notification reference needs an explicit kind' using errcode='22023';end if;
   perform private.require_consumption_read(p_patient,cr.location);
   return jsonb_build_object('kind','report','referenceId',p_ref,'careRecipientId',p_patient,'reportId',cr.id,'sourceReminderId',cr.source_reminder_id);
  end if;
 end if;
 if p_namespace not in ('auto','reminder') then raise exception 'notification reference unavailable' using errcode='42501';end if;
 select * into r from public.operational_reminders where id=p_ref and care_recipient_id=p_patient
  and (user_id=auth.uid() or public.can_manage_recipient(p_patient));
 if not found then raise exception 'notification reference unavailable' using errcode='42501';end if;
 if p_area='schedule' and r.kind='schedule' then
  is_team:=private.can(p_patient,'schedule.read.team');cap:=case when is_team then 'schedule.read.team' else 'schedule.read.own' end;
  perform private.require_cap(p_patient,cap);
  select * into se from public.shift_events where id=r.shift_event_id and care_recipient_id=p_patient and (is_team or professional_id=auth.uid());
  if not found then raise exception 'notification reference unavailable' using errcode='42501';end if;
  select * into s from public.scheduled_shifts where id=se.shift_id and care_recipient_id=p_patient and (is_team or professional_id=auth.uid());
  if found then current_value:=jsonb_build_object('status',s.status,'version',s.version,'startsAt',s.starts_at,'endsAt',s.ends_at,'timezone',s.timezone,
   'professionalName',(select full_name from public.profiles where id=s.professional_id),'typeName',(select name from public.shift_types where id=s.shift_type_id));
   day:=(s.starts_at at time zone s.timezone)::date;
  elsif se.shift_id is null and not (se.after_state ? 'starts_at') then
   select * into ss from public.shift_series where id=se.series_id and care_recipient_id=p_patient and (is_team or professional_id=auth.uid());
   if found then current_value:=jsonb_build_object('status',ss.status,'version',ss.version,'startsAt',null,'endsAt',null,'timezone',ss.timezone,
    'professionalName',(select full_name from public.profiles where id=ss.professional_id),'typeName',(select name from public.shift_types where id=ss.shift_type_id));day:=ss.anchor_date;end if;
  end if;
  if day is null then day:=coalesce(nullif(se.after_state->>'anchor_date','')::date,(nullif(se.after_state->>'starts_at','')::timestamptz at time zone coalesce(se.after_state->>'timezone','America/Sao_Paulo'))::date,r.period);end if;
  result:=jsonb_build_object('kind','schedule','referenceId',p_ref,'careRecipientId',p_patient,'eventId',se.id,'action',se.action,'reason',se.reason,
   'recordedAt',se.created_at,'actorName',se.actor_name_snapshot,'referenceDay',day,'shiftId',se.shift_id,'seriesId',se.series_id,
   'originalStartsAt',se.after_state->>'starts_at','originalEndsAt',se.after_state->>'ends_at','current',current_value);
  perform private.require_cap(p_patient,cap);return result;
 end if;
 if p_area='balance' and r.kind in ('bal','bal_cycle') then
  perform private.require_cap(p_patient,'bal.read');
  if r.kind='bal' then
   result:=jsonb_build_object('kind','legacy_balance','referenceId',p_ref,'careRecipientId',p_patient,'period',r.period,'expectedAt',r.expected_at,'acknowledgedAt',r.acknowledged_at,'canCountNow',private.can(p_patient,'bal.count'));
  else
   select * into be from public.bal_cycle_events where id=r.bal_event_id and care_recipient_id=p_patient;
   if not found then raise exception 'notification reference unavailable' using errcode='42501';end if;
   select * into bc from public.bal_cycles where id=be.cycle_id and care_recipient_id=p_patient;
   select * into ba from public.bal_assignments where id=be.assignment_id and care_recipient_id=p_patient;
   result:=jsonb_build_object('kind','balance','referenceId',p_ref,'careRecipientId',p_patient,'eventId',be.id,'action',be.action,'reason',be.reason,'recordedAt',be.created_at,
    'cycleState',bc.state,'documentId',bc.document_id,'assignment',case when ba.id is null then null else jsonb_build_object('id',ba.id,'professionalName',(select full_name from public.profiles where id=ba.professional_id),'startsAt',ba.starts_at,'endsAt',ba.ends_at,'status',ba.status,'version',ba.version) end,
    'weeks',(select jsonb_build_object('count',count(*),'first',min(week_start),'last',max(week_start)) from public.bal_obligations where care_recipient_id=p_patient and cycle_id=be.cycle_id));
  end if;
  perform private.require_cap(p_patient,'bal.read');return result;
 end if;
 if p_area='consumption' and r.kind='shift' then
  r:=private.shift_reminder_for_actor(p_patient,p_ref);
  select count(*) into report_count from public.consumption_reports where care_recipient_id=p_patient and source_reminder_id=p_ref and location='CARE_TEAM';
  select coalesce(jsonb_agg(x),'[]'::jsonb) into reports from (select id,kind,status,created_at as "createdAt" from public.consumption_reports where care_recipient_id=p_patient and source_reminder_id=p_ref and location='CARE_TEAM' order by created_at desc,id desc limit 20)x;
  result:=jsonb_build_object('kind','shift_reminder','referenceId',p_ref,'careRecipientId',p_patient,'period',r.period,'expectedAt',r.expected_at,'acknowledgedAt',r.acknowledged_at,
   'canAcknowledge',r.user_id=auth.uid() and private.can(p_patient,'consumption.report') and r.expected_at<=clock_timestamp() and r.acknowledged_at is null,
   'canReport',r.user_id=auth.uid() and private.can(p_patient,'consumption.report') and r.expected_at<=clock_timestamp(),
   'reportCount',report_count,'reports',reports);
  perform private.require_consumption_read(p_patient,'CARE_TEAM');return result;
 end if;
 raise exception 'notification reference unavailable' using errcode='42501';
end;$$;

create function public.acknowledge_shift_reminder(p_patient uuid,p_ref uuid,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.operational_reminders;c private.phase_d3_commands;h text;result jsonb;recorded boolean:=false;begin
 r:=private.shift_reminder_for_actor(p_patient,p_ref);
 if r.user_id<>auth.uid() or p_key is null then raise exception 'personal reminder authority required' using errcode='42501';end if;
 h:=encode(extensions.digest(jsonb_build_array('shift-reminder-no-issues',p_patient,p_ref)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('d3-notice:'||auth.uid()||':'||p_key,0));
 r:=private.shift_reminder_for_actor(p_patient,p_ref);
 select * into c from private.phase_d3_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then if c.intent_hash is distinct from h then raise exception 'reminder idempotency conflict' using errcode='23505';end if;return c.result||jsonb_build_object('replayed',true);end if;
 select * into r from public.operational_reminders where id=p_ref and care_recipient_id=p_patient and user_id=auth.uid() for update;
 perform private.require_consumption_report(p_patient,'CARE_TEAM');
 if r.expected_at>clock_timestamp() then raise exception 'reminder not due' using errcode='22023';end if;
 if r.acknowledged_at is null then
  update public.operational_reminders set acknowledged_at=clock_timestamp() where id=p_ref returning * into r;recorded:=true;
  update public.requisition_notifications set seen_at=coalesce(seen_at,clock_timestamp()) where reminder_id=p_ref and recipient_user_id=auth.uid();
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'shift.no_issues','reminder',p_ref,jsonb_build_object('care_recipient_id',p_patient,'origin','authenticated_app','period',r.period,'stockChanged',false));
 end if;
 result:=jsonb_build_object('careRecipientId',p_patient,'reminderId',p_ref,'idempotencyKey',p_key,'acknowledgedAt',r.acknowledged_at,'recorded',recorded);
 insert into private.phase_d3_commands values(auth.uid(),p_key,h,result);
 perform private.require_consumption_report(p_patient,'CARE_TEAM');return result;
end;$$;

create function public.report_consumption_from_reminder(p_patient uuid,p_reminder uuid,p_kind text,p_location text,p_text text,p_lines jsonb,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.operational_reminders;cr public.consumption_reports;c private.phase_d3_commands;h text;rid uuid;result jsonb;was_existing boolean;begin
 r:=private.shift_reminder_for_actor(p_patient,p_reminder);
 if r.user_id<>auth.uid() or p_key is null or p_location is distinct from 'CARE_TEAM' then raise exception 'personal reminder report required' using errcode='42501';end if;
 h:=encode(extensions.digest(jsonb_build_array('shift-reminder-report',p_patient,p_reminder,p_kind,p_location,p_text,p_lines)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('d3-notice:'||auth.uid()||':'||p_key,0));
 r:=private.shift_reminder_for_actor(p_patient,p_reminder);
 select * into c from private.phase_d3_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then if c.intent_hash is distinct from h then raise exception 'reminder report idempotency conflict' using errcode='23505';end if;return c.result||jsonb_build_object('replayed',true);end if;
 -- Share the existing report writer's lock before testing its immutable origin.
 perform pg_advisory_xact_lock(hashtextextended('report:'||auth.uid()||p_key,0));
 r:=private.shift_reminder_for_actor(p_patient,p_reminder);
 select * into r from public.operational_reminders where id=p_reminder and care_recipient_id=p_patient and user_id=auth.uid() for update;
 select * into cr from public.consumption_reports where reported_by=auth.uid() and idempotency_key=p_key;was_existing:=found;
 if was_existing and cr.source_reminder_id is distinct from p_reminder then raise exception 'report origin idempotency conflict' using errcode='23505';end if;
 if not was_existing and r.expected_at>clock_timestamp() then raise exception 'reminder not due' using errcode='22023';end if;
 rid:=public.report_extraordinary_consumption(p_patient,p_kind,p_location,p_text,p_lines,p_key);
 if not was_existing then
  update public.consumption_reports set source_reminder_id=p_reminder where id=rid and care_recipient_id=p_patient and reported_by=auth.uid();
  update public.operational_reminders set acknowledged_at=coalesce(acknowledged_at,clock_timestamp()) where id=p_reminder;
  update public.requisition_notifications set seen_at=coalesce(seen_at,clock_timestamp()) where reminder_id=p_reminder and recipient_user_id=auth.uid();
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'shift.occurrence_reported','reminder',p_reminder,jsonb_build_object('care_recipient_id',p_patient,'reportId',rid,'stockChanged',false));
  perform private.require_consumption_report(p_patient,'CARE_TEAM');
 end if;
 result:=jsonb_build_object('id',rid,'careRecipientId',p_patient,'reminderId',p_reminder,'recorded',not was_existing);
 insert into private.phase_d3_commands values(auth.uid(),p_key,h,result);
 perform private.require_consumption_read(p_patient,'CARE_TEAM');return result;
end;$$;

revoke all on function private.shift_reminder_for_actor(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.notification_reference(uuid,uuid,text,text),public.acknowledge_shift_reminder(uuid,uuid,uuid),public.report_consumption_from_reminder(uuid,uuid,text,text,text,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.notification_reference(uuid,uuid,text,text),public.acknowledge_shift_reminder(uuid,uuid,uuid),public.report_consumption_from_reminder(uuid,uuid,text,text,text,jsonb,uuid) to authenticated;
