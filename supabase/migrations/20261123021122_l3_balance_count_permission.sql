begin;

create table private.balance_count_permissions (
  id uuid primary key default gen_random_uuid(),
  care_recipient_id uuid not null references public.care_recipients(id),
  assignment_id uuid not null,
  assignment_version integer not null,
  requested_by uuid not null references public.profiles(id),
  requester_name text not null,
  responsible_name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null check (char_length(reason) between 3 and 1000),
  created_at timestamptz not null default clock_timestamp(),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by uuid references public.profiles(id),
  decider_name text,
  decision_note text check (char_length(decision_note) <= 1000),
  decided_at timestamptz,
  new_assignment_id uuid,
  foreign key (care_recipient_id,assignment_id) references public.bal_assignments(care_recipient_id,id),
  foreign key (care_recipient_id,new_assignment_id) references public.bal_assignments(care_recipient_id,id),
  check ((status = 'pending') = (decided_by is null and decider_name is null and decided_at is null)),
  check ((status = 'approved') = (new_assignment_id is not null))
);
alter table private.balance_count_permissions enable row level security;
revoke all on private.balance_count_permissions from public,anon,authenticated,service_role;
create index balance_permission_history on private.balance_count_permissions(care_recipient_id,created_at desc);
create unique index balance_permission_pending on private.balance_count_permissions(assignment_id,assignment_version,requested_by) where status='pending';
create trigger balance_permission_invalidate after insert or update on private.balance_count_permissions
  for each row execute function private.invalidate_workspace();

create function private.balance_permission_admin(p_patient uuid) returns boolean
language sql stable set search_path='' as $$
  select private.can(p_patient,'bal.schedule.manage') and exists(
    select 1 from public.care_recipient_memberships m where m.care_recipient_id=p_patient
      and m.user_id=auth.uid() and m.status='active' and m.role='admin')
$$;

create function private.balance_permission_source(a public.bal_assignments) returns boolean
language sql stable set search_path='' as $$
  select a.id is not null and a.status='active' and a.ends_at>statement_timestamp()
    and exists(select 1 from public.care_recipients p where p.id=a.care_recipient_id and p.is_active)
    and exists(select 1 from public.bal_cycles c where c.id=a.cycle_id and c.state='open')
    and exists(select 1 from public.scheduled_shifts s where s.id=a.shift_id and s.care_recipient_id=a.care_recipient_id
      and s.version=a.shift_version and s.status='published' and s.professional_id=a.professional_id)
    and (private.active_balance_admission(a)).id is null
$$;

create function private.balance_permission_targets(a public.bal_assignments,p_user uuid) returns jsonb
language sql stable set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'version',s.version,'startsAt',s.starts_at,'endsAt',s.ends_at,'type',t.name)
    order by s.starts_at,s.id),'[]'::jsonb)
  from public.scheduled_shifts s join public.shift_types t on t.id=s.shift_type_id
  where s.care_recipient_id=a.care_recipient_id and s.professional_id=p_user and s.status='published'
    and s.starts_at between a.starts_at and greatest(a.starts_at,statement_timestamp()) and s.ends_at=a.ends_at
    and private.schedule_worker(a.care_recipient_id,p_user) and private.member_can(a.care_recipient_id,p_user,'bal.count')
$$;

create function private.balance_permission_hash(p_value jsonb) returns text
language sql immutable set search_path='' as $$
  select encode(extensions.digest(p_value::text,'sha256'),'hex')
$$;

create function private.balance_permission_request(a public.bal_assignments) returns jsonb
language sql stable set search_path='' as $$
  select case when a.professional_id<>auth.uid() and private.balance_permission_source(a)
      and private.schedule_worker(a.care_recipient_id,auth.uid()) and private.can(a.care_recipient_id,'bal.count')
    then jsonb_build_object('assignmentId',a.id,'version',a.version,'startsAt',a.starts_at,'endsAt',a.ends_at,
      'responsibleName',(select full_name from public.profiles where id=a.professional_id),
      'alreadyPending',exists(select 1 from private.balance_count_permissions r where r.assignment_id=a.id
        and r.assignment_version=a.version and r.requested_by=auth.uid() and r.status='pending'),
      'referenceHash',private.balance_permission_hash(to_jsonb(a)||jsonb_build_object('requester',auth.uid()))) end
$$;

create function private.balance_permission_view(r private.balance_count_permissions,a public.bal_assignments) returns jsonb
language sql stable set search_path='' as $$
  select jsonb_build_object('id',r.id,'requesterName',r.requester_name,'responsibleName',r.responsible_name,
    'startsAt',r.starts_at,'endsAt',r.ends_at,'reason',r.reason,'createdAt',r.created_at,'status',r.status,
    'deciderName',r.decider_name,'decidedAt',r.decided_at,'decisionNote',r.decision_note,
    'decision',case when private.balance_permission_admin(r.care_recipient_id) and r.requested_by<>auth.uid() and r.status='pending'
      then jsonb_build_object('targets',eligibility.targets,'referenceHash',private.balance_permission_hash(
        jsonb_build_object('request',to_jsonb(r),'assignment',to_jsonb(a),'targets',eligibility.targets,'decider',auth.uid()))) end)
  from lateral (select case when private.balance_permission_source(a) and a.version=r.assignment_version
    then private.balance_permission_targets(a,r.requested_by) else '[]'::jsonb end as targets) eligibility
$$;

create function private.balance_permission_workspace(p_patient uuid,a public.bal_assignments) returns jsonb
language sql stable set search_path='' as $$
  select jsonb_build_object('request',private.balance_permission_request(a),'history',coalesce((
    select jsonb_agg(private.balance_permission_view(r,s) order by (r.status='pending') desc,r.created_at desc)
    from (select p.* from private.balance_count_permissions p where p.care_recipient_id=p_patient
      and (p.requested_by=auth.uid() or private.balance_permission_admin(p_patient))
      order by (p.status='pending') desc,p.created_at desc limit 50) r
    join public.bal_assignments s on s.care_recipient_id=r.care_recipient_id and s.id=r.assignment_id),'[]'::jsonb))
$$;

-- Uses the same result ledger and reconciliation lock as other short BAL decisions.
create function private.execute_balance_permission(p_patient uuid,p_target uuid,p_key uuid,p_intention jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare
  a public.bal_assignments; r private.balance_count_permissions; saved private.balance_decision_results;
  action text:=p_intention->>'action'; body jsonb:=p_intention->'body'; current_view jsonb; native jsonb;
  target public.scheduled_shifts; person text; note text; new_assignment uuid; approved boolean;
begin
  if private.auth_session() is null or p_key is null or p_target is null then
    raise exception 'active identity and command key required' using errcode='42501'; end if;
  perform private.require_cap(p_patient,'bal.read');
  perform pg_advisory_xact_lock(hashtextextended('balance-decision:'||auth.uid()||':'||p_key,0));
  select * into saved from private.balance_decision_results where actor_id=auth.uid() and key=p_key;
  if found then
    if saved.patient_id<>p_patient or saved.target_id<>p_target then raise exception 'command scope differs' using errcode='22023'; end if;
    if saved.state='not_applied' then raise exception 'command settled without an act' using errcode='PT409'; end if;
    if saved.intention is distinct from p_intention then raise exception 'command key already bound' using errcode='22023'; end if;
    return private.balance_decision_result_view(saved);
  end if;
  if p_intention->>'domain' is distinct from 'balance_workspace' or jsonb_typeof(body) is distinct from 'object'
    or (p_intention-array['domain','action','body','expectedVersion','referenceHash'])<>'{}'::jsonb
    or coalesce(p_intention->>'referenceHash','')!~'^[a-f0-9]{64}$' then
    raise exception 'invalid balance permission command' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('bal:'||p_patient,0));
  select full_name into person from public.profiles where id=auth.uid();
  if action='request_count_permission' then
    if (body-array['reason'])<>'{}'::jsonb or jsonb_typeof(body->'reason') is distinct from 'string'
      or char_length(btrim(body->>'reason')) not between 3 and 1000 then raise exception 'invalid permission reason' using errcode='22023'; end if;
    select * into a from public.bal_assignments where id=p_target and care_recipient_id=p_patient for update;
    current_view:=private.balance_permission_request(a);
    if current_view is null or a.ends_at<=clock_timestamp() or (current_view->>'alreadyPending')::boolean
      or current_view->'version' is distinct from p_intention->'expectedVersion'
      or current_view->>'referenceHash' is distinct from p_intention->>'referenceHash' then
      raise exception 'balance permission request no longer available' using errcode='PT409'; end if;
    insert into private.balance_count_permissions(care_recipient_id,assignment_id,assignment_version,requested_by,requester_name,responsible_name,starts_at,ends_at,reason)
      values(p_patient,a.id,a.version,auth.uid(),person,current_view->>'responsibleName',a.starts_at,a.ends_at,btrim(body->>'reason')) returning * into r;
    if not private.schedule_worker(p_patient,auth.uid()) or not private.can(p_patient,'bal.count') then raise exception 'permission requester changed' using errcode='42501'; end if;
  elsif action='decide_count_permission' then
    if not private.balance_permission_admin(p_patient) then raise exception 'patient administrator required' using errcode='42501'; end if;
    if (body-array['approve','note','shiftId','shiftVersion'])<>'{}'::jsonb or jsonb_typeof(body->'approve') is distinct from 'boolean'
      or jsonb_typeof(body->'note') is distinct from 'string' or char_length(body->>'note')>1000
      or p_intention->'expectedVersion' is distinct from '0'::jsonb then raise exception 'invalid permission decision' using errcode='22023'; end if;
    approved:=(body->>'approve')::boolean; note:=btrim(body->>'note');
    select * into r from private.balance_count_permissions where id=p_target and care_recipient_id=p_patient for update;
    if not found or r.requested_by=auth.uid() then raise exception 'balance permission unavailable' using errcode='42501'; end if;
    select * into a from public.bal_assignments where id=r.assignment_id and care_recipient_id=p_patient for update;
    current_view:=private.balance_permission_view(r,a)->'decision';
    if r.status<>'pending' or current_view->>'referenceHash' is distinct from p_intention->>'referenceHash' then
      raise exception 'balance permission changed before confirmation' using errcode='PT409'; end if;
    if approved then
      if not exists(select 1 from jsonb_array_elements(current_view->'targets') t
        where t->'id'=body->'shiftId' and t->'version'=body->'shiftVersion') then
        raise exception 'balance permission requires a compatible real shift' using errcode='PT409'; end if;
      select * into strict target from public.scheduled_shifts where care_recipient_id=p_patient and id=(body->>'shiftId')::uuid for share;
      if target.version<>(body->>'shiftVersion')::integer or target.ends_at<=clock_timestamp()
        or not exists(select 1 from jsonb_array_elements(private.balance_permission_targets(a,r.requested_by)) t
          where t->'id'=body->'shiftId' and t->'version'=body->'shiftVersion') then
        raise exception 'balance permission shift changed' using errcode='PT409'; end if;
      update public.bal_assignments set status='invalidated',version=version+1 where id=a.id;
      new_assignment:=private.bal_assign(p_patient,a.cycle_id,target.id,case when a.kind='recount' then 'recount' else 'transfer' end);
    elsif body ?| array['shiftId','shiftVersion'] then raise exception 'refusal cannot assign a shift' using errcode='22023'; end if;
    update private.balance_count_permissions set status=case when approved then 'approved' else 'rejected' end,
      decided_by=auth.uid(),decider_name=person,decision_note=note,decided_at=clock_timestamp(),new_assignment_id=new_assignment
      where id=r.id returning * into r;
    if not private.balance_permission_admin(p_patient) then raise exception 'permission decider changed' using errcode='42501'; end if;
  else raise exception 'invalid balance permission action' using errcode='22023'; end if;
  native:=jsonb_build_object('requestId',r.id,'status',r.status,'assignmentId',r.new_assignment_id);
  insert into private.balance_decision_results(actor_id,key,patient_id,target_id,state,intention,result)
    values(auth.uid(),p_key,p_patient,p_target,'applied',p_intention,native) returning * into saved;
  perform private.require_cap(p_patient,'bal.read');
  return private.balance_decision_result_view(saved);
end;$$;

do $$
declare definition text; anchor text;
begin
  definition:=pg_get_functiondef('public.balance_workspace(uuid)'::regprocedure);
  anchor:=$old$'recountRecovery',private.bal_recount_recovery(p_patient)$old$;
  if strpos(definition,anchor)=0 then raise exception 'balance workspace projection drift'; end if;
  execute replace(definition,anchor,anchor||$new$,'countPermissions',private.balance_permission_workspace(p_patient,v_a)$new$);
  definition:=pg_get_functiondef('public.execute_balance_decision(uuid,uuid,uuid,jsonb)'::regprocedure);
  anchor:=$old$ perform private.require_balance_preparation_scope(p_patient,purpose,p_target);$old$;
  if strpos(definition,anchor)=0 then raise exception 'balance decision contract drift'; end if;
  execute replace(definition,anchor,$new$ if purpose in ('request_count_permission','decide_count_permission') then
    return private.execute_balance_permission(p_patient,p_target,p_key,p_intention); end if;
$new$||anchor);
end;$$;

revoke all on function private.balance_permission_admin(uuid),private.balance_permission_source(public.bal_assignments),
  private.balance_permission_targets(public.bal_assignments,uuid),private.balance_permission_hash(jsonb),
  private.balance_permission_request(public.bal_assignments),private.balance_permission_view(private.balance_count_permissions,public.bal_assignments),
  private.balance_permission_workspace(uuid,public.bal_assignments),private.execute_balance_permission(uuid,uuid,uuid,jsonb)
  from public,anon,authenticated,service_role;

commit;
