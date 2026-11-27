-- Serialize schedule edits with BAL admissions and assignment transitions.
create function private.schedule_balance_assignment(p_patient uuid,p_shift uuid,p_series uuid)
returns public.bal_assignments language sql stable set search_path='' as $$
  select a from public.bal_assignments a
  join public.scheduled_shifts s on s.care_recipient_id=a.care_recipient_id and s.id=a.shift_id
  where a.care_recipient_id=p_patient and a.status='active'
    and s.status='published' and s.version=a.shift_version and s.professional_id=a.professional_id
    and (s.id=p_shift or s.series_id=p_series)
    and (a.ends_at>now() or (private.active_balance_admission(a)).id is not null)
$$;

create function private.schedule_balance_impact(p_patient uuid,p_purpose text,p_target jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare a public.bal_assignments; c public.bal_cycles; s public.scheduled_shifts;
  manage boolean; defer boolean; targets jsonb:='[]'; doc jsonb; reference_start timestamptz;
begin
  a:=private.schedule_balance_assignment(p_patient,
    (case p_purpose when 'schedule_shift_edit' then p_target->>'id' else p_target->>'shift_id' end)::uuid,
    (case when p_purpose='schedule_series_end' then p_target->>'id' end)::uuid);
  if a.id is null then return null;end if;
  select * into strict s from public.scheduled_shifts where care_recipient_id=p_patient and id=a.shift_id;
  if not private.schedule_visible(p_patient,s.professional_id) then return null;end if;
  if not private.can(p_patient,'bal.read') then return jsonb_build_object('restricted',true,'shiftDate',(s.starts_at at time zone s.timezone)::date);end if;
  manage:=private.bal_family_authority(p_patient,'bal.schedule.manage');
  defer:=manage and private.bal_family_authority(p_patient,'bal.defer.approve');
  select * into strict c from public.bal_cycles where care_recipient_id=p_patient and id=a.cycle_id;
  select jsonb_build_object('id',d.id,'protocol',d.protocol) into doc from public.operational_documents d
    where d.id=c.document_id and d.care_recipient_id=p_patient and d.type='BAL';
  select min(original_start) into reference_start from public.bal_obligations where cycle_id=c.id;
  if manage then
    select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'version',x.version,'professionalName',p.full_name,
      'startsAt',x.starts_at,'endsAt',x.ends_at,'timezone',x.timezone,'seriesId',x.series_id,
      'localDate',(x.starts_at at time zone x.timezone)::date) order by x.starts_at,x.id),'[]') into targets
    from public.scheduled_shifts x join public.profiles p on p.id=x.professional_id
    where x.care_recipient_id=p_patient and x.status='published' and x.id<>s.id
      and x.starts_at>=reference_start and x.starts_at<greatest(a.ends_at,now())+interval '35 days' and x.ends_at>now()
      and (x.ends_at<=a.ends_at or defer and x.starts_at>=a.ends_at)
      and private.schedule_worker(p_patient,x.professional_id)
      and private.member_can(p_patient,x.professional_id,'bal.count');
  end if;
  return jsonb_build_object('restricted',false,'assignmentId',a.id,'assignmentVersion',a.version,'sourceVersion',s.version,
    'shiftId',s.id,'shiftDate',(s.starts_at at time zone s.timezone)::date,'professionalId',a.professional_id,
    'professionalName',(select full_name from public.profiles where id=a.professional_id),
    'startsAt',a.starts_at,'endsAt',a.ends_at,'timezone',s.timezone,'document',doc,
    'inProgress',(private.active_balance_admission(a)).id is not null,
    'canDecide',manage,'canDefer',defer,'targets',targets);
end;$$;

create or replace function private.guard_bal_schedule_window()
returns trigger language plpgsql security definer set search_path='' as $$
declare a public.bal_assignments;
begin
  if new.version=old.version and (new.status,new.professional_id,new.starts_at,new.ends_at) is not distinct from
    (old.status,old.professional_id,old.starts_at,old.ends_at) then return new;end if;
  a:=private.schedule_balance_assignment(old.care_recipient_id,old.id,null);
  if a.id is null then return new;end if;
  if new.status='published' and new.professional_id=a.professional_id and new.starts_at<=a.starts_at and new.ends_at>=a.ends_at then
    -- The same assignment and admission stay valid. Only its source version moves.
    if new.version<>old.version then
      update public.bal_assignments set shift_version=new.version where id=a.id;
    end if;
    return new;
  end if;
  raise exception 'balance schedule impact requires family deferral or reassignment' using errcode='PT409';
end;$$;

create function private.prepare_schedule_balance_impact(p_patient uuid,p_action text,p_shift public.scheduled_shifts,
  p_series uuid,p_cutoff date,p_worker uuid,p_start timestamptz,p_end timestamptz,p_impact jsonb)
returns public.bal_assignments language plpgsql set search_path='' as $$
declare a public.bal_assignments; source public.scheduled_shifts; target public.scheduled_shifts;
  decision text:=p_impact->>'decision'; target_id uuid:=(p_impact->>'targetShiftId')::uuid;
begin
  a:=private.schedule_balance_assignment(p_patient,p_shift.id,p_series);
  if a.id is not null then
    select * into strict source from public.scheduled_shifts where id=a.shift_id and care_recipient_id=p_patient;
    if p_cutoff is not null and (source.starts_at at time zone source.timezone)::date<p_cutoff then a:=null;end if;
    if p_action='change' and (p_worker,p_start,p_end)=(source.professional_id,source.starts_at,source.ends_at) then a:=null;end if;
  end if;
  if a.id is null and p_impact is null then return null;end if;
  if a.id is null or p_impact is null or (p_impact->>'assignmentId')::uuid is distinct from a.id
    or (p_impact->>'assignmentVersion')::integer is distinct from a.version
    or (p_impact->>'sourceVersion')::integer is distinct from a.shift_version then
    raise exception 'balance schedule impact requires family deferral or reassignment' using errcode='PT409';
  end if;
  if not private.bal_family_authority(p_patient,'bal.schedule.manage')
    or (decision='defer' and not private.bal_family_authority(p_patient,'bal.defer.approve')) then
    raise exception 'family balance scheduling authorization required' using errcode='42501';
  end if;
  if decision is null or decision not in ('keep','assign','defer') or jsonb_typeof(p_impact->'reason') is distinct from 'string'
    or length(btrim(p_impact->>'reason')) not between 3 and 1000
    or (p_impact-array['decision','assignmentId','assignmentVersion','sourceVersion','targetShiftId','targetShiftVersion','reason'])<>'{}' then
    raise exception 'invalid balance schedule decision' using errcode='22023';
  end if;
  if decision='keep' then
    if p_action<>'change' or p_worker<>a.professional_id or p_start>a.starts_at or p_end<a.ends_at
      or target_id is not null or p_impact ? 'targetShiftVersion' then
      raise exception 'balance schedule target changed' using errcode='PT409';
    end if;
    return a;
  end if;
  select * into target from public.scheduled_shifts where care_recipient_id=p_patient and id=target_id for share;
  if not found or target.status<>'published' or target.version is distinct from (p_impact->>'targetShiftVersion')::integer
    or (p_series is not null and target.series_id=p_series and (target.starts_at at time zone target.timezone)::date>=p_cutoff) then
    raise exception 'balance schedule target changed' using errcode='PT409';
  end if;
  if target.id=a.shift_id then
    if p_action<>'change' or decision<>'assign' or p_worker=a.professional_id then
      raise exception 'balance schedule target changed' using errcode='PT409';
    end if;
    target.professional_id:=p_worker;target.starts_at:=p_start;target.ends_at:=p_end;
  end if;
  if target.ends_at<=now() or target.starts_at<(select min(original_start) from public.bal_obligations where cycle_id=a.cycle_id)
    or not private.schedule_worker(p_patient,target.professional_id) or not private.member_can(p_patient,target.professional_id,'bal.count')
    or (decision='assign' and target.ends_at>a.ends_at) or (decision='defer' and target.starts_at<a.ends_at) then
    raise exception 'balance schedule target changed' using errcode='PT409';
  end if;
  update public.bal_assignments set status=case when decision='defer' then 'deferred' else 'invalidated' end,version=version+1 where id=a.id;
  update private.balance_count_admissions set discarded_at=clock_timestamp() where assignment_id=a.id and discarded_at is null;
  return a;
end;$$;

create function private.record_schedule_balance_impact(p_patient uuid,p_assignment public.bal_assignments,p_impact jsonb,p_key uuid)
returns void language plpgsql set search_path='' as $$
declare decision text:=p_impact->>'decision'; reason text:=btrim(p_impact->>'reason'); next_assignment uuid;
  target public.scheduled_shifts; deferral public.bal_deferrals; details jsonb;
begin
  if p_assignment.id is null then return;end if;
  if decision='keep' then
    next_assignment:=p_assignment.id;
  else
    select * into strict target from public.scheduled_shifts where id=(p_impact->>'targetShiftId')::uuid and care_recipient_id=p_patient;
    next_assignment:=private.bal_assign(p_patient,p_assignment.cycle_id,target.id,case when p_assignment.kind='recount' then 'recount'
      when decision='defer' then 'deferred' else 'transfer' end);
    if decision='defer' then
      insert into public.bal_deferrals(care_recipient_id,cycle_id,assignment_id,assignment_version,target_shift_id,target_shift_version,target_snapshot,
        reason,requested_by,status,decided_by,decision_reason,decided_at)
      values(p_patient,p_assignment.cycle_id,p_assignment.id,p_assignment.version,target.id,target.version,private.schedule_shift_snapshot(target),
        reason,auth.uid(),'approved',auth.uid(),reason,now()) returning * into deferral;
      update public.bal_obligations set effective_due=greatest(effective_due,target.ends_at) where cycle_id=p_assignment.cycle_id and state='pending';
      perform private.bal_event(p_patient,p_assignment.cycle_id,next_assignment,'bal.cycle.deferred',reason,to_jsonb(deferral),'deferral:'||deferral.id||':approved');
    end if;
  end if;
  details:=jsonb_build_object('decision',decision,'priorAssignment',to_jsonb(p_assignment),
    'assignment',(select to_jsonb(a) from public.bal_assignments a where a.id=next_assignment),
    'scheduleCommandKey',p_key);
  perform private.bal_event(p_patient,p_assignment.cycle_id,next_assignment,'bal.cycle.schedule_impact',reason,details,'schedule-impact:'||p_key);
end;$$;

-- Extend the existing schedule command, private review, and recovery paths in place.
do $$
declare command text:=pg_get_functiondef('public.schedule_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
  source text:=pg_get_functiondef('private.schedule_resource_source(uuid,text,uuid)'::regprocedure);
  validation text:=pg_get_functiondef('private.validate_schedule_resource_fields(text,jsonb,jsonb)'::regprocedure);
  intent text:=pg_get_functiondef('private.schedule_resource_intent(private.schedule_resource_preparations)'::regprocedure);
  patch record; definition text;
begin
  for patch in select * from (values
    ('command','cutoff date;is_stale boolean;', 'cutoff date;is_stale boolean; balance_assignment public.bal_assignments;'),
    ('command',$old$ req:=jsonb_build_object('action',p_action,'body',p_body,'version',p_version);$old$,
      $new$ if p_action in ('change','cancel','end_series','decide_change') then
    perform pg_advisory_xact_lock(hashtextextended('bal:'||p_patient,0));
  end if;
  req:=jsonb_build_object('action',p_action,'body',p_body,'version',p_version);$new$),
    ('command',' update public.shift_series set ended_on=cutoff',
      $new$ balance_assignment:=private.prepare_schedule_balance_impact(p_patient,p_action,null,ser.id,cutoff,null,null,null,p_body->'balanceImpact');
  update public.shift_series set ended_on=cutoff$new$),
    ('command',$old$and status in ('published','proposed');$old$,
      $new$and status in ('published','proposed');
  perform private.record_schedule_balance_impact(p_patient,balance_assignment,p_body->'balanceImpact',p_key);$new$),
    ('command',$old$'reason',proposal.reason),gen_random_uuid(),proposal.shift_version);$old$,
      $new$'reason',proposal.reason)||case when p_body ? 'balanceImpact' then jsonb_build_object('balanceImpact',p_body->'balanceImpact') else '{}'::jsonb end,gen_random_uuid(),proposal.shift_version);$new$),
    ('command',' update public.scheduled_shifts set professional_id=worker',
      $new$ balance_assignment:=private.prepare_schedule_balance_impact(p_patient,p_action,s,null,null,worker,
    coalesce((p_body->>'startsAt')::timestamptz,s.starts_at),coalesce((p_body->>'endsAt')::timestamptz,s.ends_at),p_body->'balanceImpact');
  update public.scheduled_shifts set professional_id=worker$new$),
    ('command','where id=s.id returning * into s;',
      $new$where id=s.id returning * into s;
  perform private.record_schedule_balance_impact(p_patient,balance_assignment,p_body->'balanceImpact',p_key);$new$),
    ('source','source_version integer;h text;', 'source_version integer;h text;impact jsonb;'),
    ('source',$old$ v:=(target->>'version')::integer;$old$,
      $new$ if p_purpose in ('schedule_shift_edit','schedule_series_end','schedule_change_approve') then
    impact:=private.schedule_balance_impact(p_patient,p_purpose,target);
    if impact is not null then
      target:=target||jsonb_build_object('balanceImpact',impact);
      if p_purpose='schedule_shift_edit' then w:=jsonb_set(w,'{shifts,0}',target);
      elsif p_purpose='schedule_series_end' then w:=jsonb_set(w,'{series,0}',target);
      else w:=jsonb_set(w,'{changes,0}',target);end if;
    end if;
  end if;
  v:=(target->>'version')::integer;$new$),
    ('validation','expected text[];form text', 'expected text[]; impact jsonb:=f->''balanceImpact''; form text'),
    ('validation',$old$ if (f-expected)<>'{}' or not(f ?& expected) then$old$,
      $new$ if impact is not null then
    if not (p_purpose in ('schedule_series_end','schedule_change_approve') or p_purpose='schedule_shift_edit' and op in ('change','cancel'))
      or jsonb_typeof(impact) is distinct from 'object'
      or (impact-array['decision','assignmentId','assignmentVersion','sourceVersion','targetShiftId','targetShiftVersion','reason'])<>'{}'
      or not(impact ?& array['decision','assignmentId','assignmentVersion','sourceVersion','reason'])
      or (impact ? 'targetShiftId') is distinct from (impact ? 'targetShiftVersion')
      or jsonb_typeof(impact->'decision') is distinct from 'string' or impact->>'decision' not in ('keep','assign','defer')
      or jsonb_typeof(impact->'reason') is distinct from 'string' or private.bal_comment_units(impact->>'reason')>1000
      or (impact->>'assignmentId')::uuid is null or coalesce((impact->>'assignmentVersion')::integer,0)<1
      or coalesce((impact->>'sourceVersion')::integer,0)<1
      or (impact ? 'targetShiftId' and ((impact->>'targetShiftId')::uuid is null or coalesce((impact->>'targetShiftVersion')::integer,0)<1)) then
      raise exception 'invalid balance schedule preparation' using errcode='22023';
    end if;
  end if;
  if (f-'balanceImpact'-expected)<>'{}' or not(f ?& expected) then$new$),
    ('validation',$old$ for r in select * from jsonb_each(f) loop$old$,
      $new$ for r in select * from jsonb_each(f-'balanceImpact') loop$new$),
    ('intent',$old$ return jsonb_build_object('action',a,'body',b);$old$,
      $new$ if f ? 'balanceImpact' then
    b:=b||jsonb_build_object('balanceImpact',jsonb_set(f->'balanceImpact','{reason}',to_jsonb(btrim(f#>>'{balanceImpact,reason}'))));
  end if;
  return jsonb_build_object('action',a,'body',b);$new$)
  ) as edits(routine,anchor,body) loop
    definition:=case patch.routine when 'command' then command when 'source' then source when 'validation' then validation else intent end;
    if (length(definition)-length(replace(definition,patch.anchor,'')))/length(patch.anchor)<>1 then
      raise exception 'schedule balance migration could not extend % at %',patch.routine,patch.anchor;
    end if;
    definition:=replace(definition,patch.anchor,patch.body);
    case patch.routine when 'command' then command:=definition;when 'source' then source:=definition;
      when 'validation' then validation:=definition;else intent:=definition;end case;
  end loop;
  execute command;execute source;execute validation;execute intent;
end;$$;

revoke all on function private.schedule_balance_assignment(uuid,uuid,uuid),private.schedule_balance_impact(uuid,text,jsonb),
  private.prepare_schedule_balance_impact(uuid,text,public.scheduled_shifts,uuid,date,uuid,timestamptz,timestamptz,jsonb),
  private.record_schedule_balance_impact(uuid,public.bal_assignments,jsonb,uuid) from public,anon,authenticated,service_role;

-- An admission can start while a schedule change is being reviewed. Compare
-- the reviewed reference under both locks, before applying either operation.
do $balance_reference_lock$
declare definition text:=pg_get_functiondef('public.commit_schedule_resource_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid)'::regprocedure);
  anchor text:='perform pg_advisory_xact_lock(hashtextextended(''schedule:''||p_patient,0));';
begin
  if (length(definition)-length(replace(definition,anchor,'')))/length(anchor)<>1 then
    raise exception 'schedule resource confirmation lock contract drift';
  end if;
  execute replace(definition,anchor,anchor||$lock$
  if p_purpose in ('schedule_shift_edit','schedule_series_end','schedule_change_approve') then
    perform pg_advisory_xact_lock(hashtextextended('bal:'||p_patient,0));
  end if;
  $lock$);
end;
$balance_reference_lock$;
