create table private.balance_count_admissions (
  id uuid primary key default gen_random_uuid(),
  care_recipient_id uuid not null references public.care_recipients(id),
  professional_id uuid not null references public.profiles(id),
  assignment_id uuid not null references public.bal_assignments(id),
  assignment_version integer not null check (assignment_version>0),
  document_id uuid references public.operational_documents(id),
  initial_document_version integer,
  document_version integer,
  admitted_at timestamptz not null,
  discarded_at timestamptz,
  check ((document_id is null) = (document_version is null)),
  check ((document_id is null) = (initial_document_version is null))
);
create unique index balance_count_admission_slot on private.balance_count_admissions(assignment_id,assignment_version)
  where discarded_at is null;
create index balance_count_admission_assignment_fk on private.balance_count_admissions(assignment_id);
create index balance_count_admission_patient_fk on private.balance_count_admissions(care_recipient_id);
create index balance_count_admission_professional_fk on private.balance_count_admissions(professional_id);
create index balance_count_admission_document_fk on private.balance_count_admissions(document_id);
alter table private.balance_count_admissions enable row level security;
revoke all on private.balance_count_admissions from public,anon,authenticated,service_role;

create function private.active_balance_admission(p public.bal_assignments)
returns private.balance_count_admissions language sql stable set search_path='' as $$
  select a from private.balance_count_admissions a
  join public.bal_cycles c on c.id=p.cycle_id and c.care_recipient_id=p.care_recipient_id
  join public.scheduled_shifts s on s.id=p.shift_id and s.care_recipient_id=p.care_recipient_id
  join public.care_recipients patient on patient.id=p.care_recipient_id and patient.is_active
  left join public.operational_documents d on d.id=c.document_id and d.care_recipient_id=p.care_recipient_id and d.type='BAL'
  where p.status='active' and a.discarded_at is null
    and a.assignment_id=p.id and a.assignment_version=p.version
    and a.care_recipient_id=p.care_recipient_id and a.professional_id=p.professional_id
    and a.admitted_at>=p.starts_at and a.admitted_at<p.ends_at
    and c.document_id is not distinct from a.document_id and d.version is not distinct from a.document_version
    and s.status='published' and s.version=p.shift_version and s.professional_id=p.professional_id
    and private.schedule_worker(p.care_recipient_id,p.professional_id)
    and private.member_can(p.care_recipient_id,p.professional_id,'bal.count')
$$;
create function private.balance_admission_view(a private.balance_count_admissions) returns jsonb
language sql stable set search_path='' as $$
  select case when a.id is not null then jsonb_build_object(
    'id',a.id,'assignmentId',a.assignment_id,'assignmentVersion',a.assignment_version,
    'documentId',a.document_id,'documentVersion',a.document_version,'admittedAt',a.admitted_at
  ) end
$$;

create function public.admit_balance_count(p_patient uuid,p_assignment uuid,p_version integer,p_document uuid,p_document_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  assignment public.bal_assignments;
  shift public.scheduled_shifts;
  admission private.balance_count_admissions;
  target uuid;
  document_version integer;
  admitted_in_window_at timestamptz;
begin
  perform private.require_cap(p_patient,'bal.count');
  perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
  perform pg_advisory_xact_lock(hashtextextended('bal:'||p_patient,0));
  select * into assignment from public.bal_assignments a
    where a.id=p_assignment and a.care_recipient_id=p_patient for update;
  if not found or assignment.status<>'active' or assignment.version is distinct from p_version
    or assignment.professional_id is distinct from auth.uid() then
    raise exception 'balance shift authorization required' using errcode='42501'; end if;
  select * into shift from public.scheduled_shifts s where s.id=assignment.shift_id for share;
  select c.document_id into strict target from public.bal_cycles c where c.id=assignment.cycle_id for update;
  if target is not null then
    select d.version into strict document_version from public.operational_documents d
      where d.id=target and d.type='BAL' and d.care_recipient_id=p_patient for share;
  end if;
  if target is distinct from p_document or document_version is distinct from p_document_version then
    raise exception 'stale balance count subject' using errcode='PT409'; end if;
  perform private.require_cap(p_patient,'bal.count');
  if shift.status is distinct from 'published' or shift.version is distinct from assignment.shift_version
    or shift.professional_id is distinct from assignment.professional_id
    or not private.schedule_worker(p_patient,auth.uid())
    or not exists(select 1 from public.care_recipients where id=p_patient and is_active) then
    raise exception 'balance shift authorization required' using errcode='42501'; end if;
  admission:=private.active_balance_admission(assignment);
  if admission.id is not null then return private.balance_admission_view(admission); end if;
  admitted_in_window_at:=clock_timestamp();
  if admitted_in_window_at<assignment.starts_at or admitted_in_window_at>=assignment.ends_at then
    raise exception 'balance shift authorization required' using errcode='42501'; end if;
  -- An independently changed target version requires a new in-window start.
  update private.balance_count_admissions set discarded_at=admitted_in_window_at
    where assignment_id=p_assignment and assignment_version=p_version and discarded_at is null;
  insert into private.balance_count_admissions(care_recipient_id,professional_id,assignment_id,
    assignment_version,document_id,initial_document_version,document_version,admitted_at)
  values(p_patient,auth.uid(),p_assignment,p_version,target,document_version,document_version,admitted_in_window_at)
  returning * into admission;
  return private.balance_admission_view(admission);
end
$$;

create function private.retire_discarded_balance_admission()
returns trigger language plpgsql set search_path='' as $$
begin
  if old.state='active' and new.state='discarded' and old.kind='BAL'
    and old.content#>>'{context,mode}'='scheduled' then
    perform pg_advisory_xact_lock(hashtextextended('bal:'||old.care_recipient_id,0));
    update private.balance_count_admissions set discarded_at=clock_timestamp()
    where discarded_at is null and professional_id=old.owner_id and care_recipient_id=old.care_recipient_id
      and document_id is not distinct from old.target_document_id
      and document_version is not distinct from (old.content#>>'{context,documentVersion}')::integer
      and assignment_id=(old.content#>>'{context,assignmentId}')::uuid
      and assignment_version=(old.content#>>'{context,assignmentVersion}')::integer;
  end if;
  return new;
end
$$;
create trigger retire_discarded_balance_admission after update of state on private.creation_drafts
for each row execute function private.retire_discarded_balance_admission();

create or replace function private.bal_count_context(p_patient uuid,p_document uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  a public.bal_assignments;
  c public.bal_cycles;
  s public.scheduled_shifts;
  admission private.balance_count_admissions;
  at_time timestamptz;
  admission_id uuid := nullif(p_payload#>>'{balanceAssignment,admissionId}','')::uuid;
begin
  perform private.require_cap(p_patient,'bal.count');
  perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
  perform pg_advisory_xact_lock(hashtextextended('bal:'||p_patient,0));
  if p_payload#>>'{balanceAssignment,referenceRevision}' is distinct from private.team_revision(p_patient)::text then
    raise exception 'inventory reference changed' using errcode='P0001'; end if;
  select * into a from public.bal_assignments
    where care_recipient_id=p_patient and id=(p_payload#>>'{balanceAssignment,id}')::uuid for update;
  if not found or a.status<>'active' or a.version is distinct from (p_payload#>>'{balanceAssignment,version}')::integer
    or a.professional_id is distinct from auth.uid() then
    raise exception 'balance shift authorization required' using errcode='42501'; end if;
  select * into s from public.scheduled_shifts where id=a.shift_id for share;
  if s.status is distinct from 'published' or s.version is distinct from a.shift_version or s.professional_id is distinct from a.professional_id then
    raise exception 'stale balance assignment' using errcode='PT409'; end if;
  select * into strict c from public.bal_cycles where id=a.cycle_id for update;
  if c.document_id is distinct from p_document then
    raise exception 'existing balance document requires revision' using errcode='P0001'; end if;
  perform private.require_cap(p_patient,'bal.count');
  if not private.schedule_worker(p_patient,auth.uid())
    or not exists(select 1 from public.care_recipients where id=p_patient and is_active) then
    raise exception 'balance shift authorization required' using errcode='42501'; end if;
  at_time:=clock_timestamp();
  admission:=private.active_balance_admission(a);
  if at_time<a.starts_at or (admission_id is not null and admission.id is distinct from admission_id)
    or (at_time>=a.ends_at and admission_id is null) then
    raise exception 'balance shift authorization required' using errcode='42501'; end if;
  return jsonb_build_object('cycleId',c.id,'assignmentId',a.id,'assignmentVersion',a.version,
    'shiftId',s.id,'shiftType',(select name from public.shift_types where id=s.shift_type_id),
    'professionalId',a.professional_id,'professionalName',(select full_name from public.profiles where id=a.professional_id),
    'startsAt',a.starts_at,'endsAt',a.ends_at,'timezone',s.timezone,'countedAt',at_time,
    'weeks',coalesce((select jsonb_agg(week_start order by week_start) from public.bal_obligations where cycle_id=c.id),'[]'::jsonb),'kind',a.kind)
    ||case when admission_id is not null then jsonb_build_object('admissionId',admission.id,'admittedAt',admission.admitted_at) else '{}'::jsonb end;
end
$$;

do $migration$
declare change record;definition text;
begin
  for change in select * from (values
    ('public.balance_workspace(uuid)',
      '''available'',v_available,''assignment''',
      '''available'',v_available,''admission'',case when v_a.professional_id=auth.uid() and private.can(p_patient,''bal.count'') then private.balance_admission_view(private.active_balance_admission(v_a)) end,''assignment'''),
    ('private.process_bal_patient(uuid,timestamptz)',
      'if v_a.ends_at<=p_now then',
      'if v_a.ends_at<=p_now and (private.active_balance_admission(v_a)).id is null then'),
    ('private.process_bal_recounts(uuid,timestamptz)',
      'if a.ends_at>p_now and s.status=',
      'if (a.ends_at>p_now or (private.active_balance_admission(a)).id is not null) and s.status='),
    ('public.revise_supply_document(uuid,jsonb,uuid,integer,boolean)',
      'if p_recount then perform private.finish_bal_count(p_id,v_context);end if;',
      'if p_recount then perform private.finish_bal_count(p_id,v_context);
       elsif v_context ? ''admissionId'' then
        update private.balance_count_admissions set document_version=(v_result->>''version'')::integer
        where id=(v_context->>''admissionId'')::uuid and document_id=p_id and discarded_at is null;
       end if;'),
    ('public.revise_supply_document(uuid,jsonb,uuid,integer,boolean)',
      '(v_context->>''endsAt'')::timestamptz<=clock_timestamp()',
      '((v_context->>''endsAt'')::timestamptz<=clock_timestamp() and not (v_context ? ''admissionId''))')
  ) edits(signature,anchor,patched)
  loop
    definition:=pg_get_functiondef(change.signature::regprocedure);
    if position(change.anchor in definition)=0 then
      raise exception 'L3 balance admission contract drift: %',change.signature; end if;
    execute replace(definition,change.anchor,change.patched);
  end loop;
end
$migration$;

revoke all on function private.active_balance_admission(public.bal_assignments),
  private.balance_admission_view(private.balance_count_admissions),private.retire_discarded_balance_admission(),
  public.admit_balance_count(uuid,uuid,integer,uuid,integer)
  from public,anon,authenticated,service_role;
grant execute on function public.admit_balance_count(uuid,uuid,integer,uuid,integer) to authenticated;
