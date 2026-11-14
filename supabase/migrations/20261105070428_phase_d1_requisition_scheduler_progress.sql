begin;

-- Private operational progress, distinct from the BAL and legacy reminder
-- cursors. No user or service client can edit cursor/diagnostic state.
create table private.requisition_scheduler_progress (
  singleton boolean primary key default true check(singleton),
  last_patient uuid,
  updated_at timestamptz not null default now()
);
insert into private.requisition_scheduler_progress(singleton) values(true);
create table private.operational_scheduler_failures (
  document_id uuid primary key references public.operational_documents(id),
  care_recipient_id uuid not null references public.care_recipients(id),
  document_type text not null check(document_type in ('REQ','ENT')),
  source_fingerprint text not null,
  sqlstate text not null,
  attempts integer not null default 1 check(attempts>0),
  first_failure_at timestamptz not null default now(),
  last_failure_at timestamptz not null default now(),
  next_retry_at timestamptz not null,
  resolved_at timestamptz
);
alter table private.requisition_scheduler_progress enable row level security;
alter table private.operational_scheduler_failures enable row level security;
revoke all on private.requisition_scheduler_progress,private.operational_scheduler_failures from public,anon,authenticated,service_role;
alter table private.scheduler_health add column failed_candidates integer not null default 0;
alter table private.scheduler_health add column unresolved_candidates integer not null default 0;

create function private.scheduler_policy_integer(p_policy jsonb,p_name text,p_default integer,p_min integer,p_max integer)
returns integer language plpgsql immutable set search_path='' as $$
declare value text; amount integer;
begin
  if jsonb_typeof(p_policy) is distinct from 'object' then raise exception 'invalid scheduler policy' using errcode='22023';end if;
  if not p_policy ? p_name then return p_default;end if;
  value:=p_policy->>p_name;
  if value is null or value !~ '^[0-9]{1,4}$' then raise exception 'invalid scheduler policy' using errcode='22023';end if;
  amount:=value::integer;
  if amount not between p_min and p_max then raise exception 'invalid scheduler policy' using errcode='22023';end if;
  return amount;
end;$$;

-- Selection itself must not abort on malformed legacy policy. An invalid
-- candidate is due for isolated diagnosis, never silently treated as healthy.
create function private.requisition_scheduler_due(p_state public.requisition_lifecycle)
returns timestamptz language plpgsql stable security definer set search_path='' as $$
declare days integer;
begin
  days:=private.scheduler_policy_integer(p_state.policy,'archiveDays',7,1,365);
  perform private.scheduler_policy_integer(p_state.policy,'reminderRepeatHours',24,1,720);
  if p_state.completed_at is null or not coalesce(private.science_satisfied(p_state.requisition_id),false) then return p_state.next_reminder_at;end if;
  if not p_state.manual_archive_required then return p_state.completed_at+make_interval(days=>days);end if;
  return null;
exception when others then return '-infinity'::timestamptz;
end;$$;

create view private.operational_scheduler_candidates with(security_invoker=true) as
with candidates as (
  select s.care_recipient_id,s.requisition_id document_id,'REQ'::text document_type,
    private.requisition_scheduler_due(s) due,md5(s.policy::text) source_fingerprint
  from public.requisition_lifecycle s
  join public.requisitions r on r.id=s.requisition_id and not r.is_historical and r.status<>'cancelled'
  join public.operational_documents d on d.id=s.requisition_id and d.type='REQ' and d.status not in ('cancelled','archived')
  join public.care_recipients p on p.id=s.care_recipient_id and p.is_active
  where s.archived_at is null
  union all
  select d.care_recipient_id,d.id,'ENT',d.updated_at+interval '24 hours',md5(d.payload::text)
  from public.operational_documents d
  join public.care_recipients p on p.id=d.care_recipient_id and p.is_active
  where d.type='ENT' and d.status='pending_receipt'
)
select c.* from candidates c
left join private.operational_scheduler_failures f on f.document_id=c.document_id
where c.due<=now() and (f.document_id is null or f.resolved_at is not null or f.next_retry_at<=now() or f.source_fingerprint<>c.source_fingerprint);
revoke all on private.operational_scheduler_candidates from public,anon,authenticated,service_role;

create or replace function public.v4_lifecycle_schedule() returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  s public.requisition_lifecycle;d public.operational_documents;c record;
  cursor_patient uuid;patients uuid[];patient_id uuid;per_patient integer;
  n integer:=0;archived integer:=0;failed integer:=0;scanned integer:=0;
  archive_days integer;repeat_hours integer;failure_state text;
begin
  if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'worker authorization required' using errcode='42501';end if;
  perform pg_advisory_xact_lock(hashtextextended('hca:operational-scheduler',0));
  select last_patient into strict cursor_patient from private.requisition_scheduler_progress where singleton for update;
  patients:=array(select care_recipient_id from (select distinct care_recipient_id from private.operational_scheduler_candidates) p
    order by case when cursor_patient is null or care_recipient_id>cursor_patient then 0 else 1 end,care_recipient_id limit 25);
  -- Preserve the common stock-lock order even when candidate rotation wraps.
  for patient_id in select unnest(patients) order by 1 loop
    perform pg_advisory_xact_lock(hashtextextended('stock:'||patient_id,0));
  end loop;
  per_patient:=greatest(1,100/greatest(1,cardinality(patients)));
  foreach patient_id in array patients loop
    for c in select * from private.operational_scheduler_candidates where care_recipient_id=patient_id order by due,document_id limit per_patient loop
      scanned:=scanned+1;
      begin
        select * into d from public.operational_documents where id=c.document_id for update;
        if not found or not exists(select 1 from public.care_recipients where id=patient_id and is_active) then continue;end if;
        if c.document_type='REQ' then
          if d.status in ('cancelled','archived') or exists(select 1 from public.requisitions where id=d.id and (is_historical or status='cancelled')) then continue;end if;
          select * into strict s from public.requisition_lifecycle where requisition_id=d.id for update;
          if s.archived_at is not null then continue;end if;
          archive_days:=private.scheduler_policy_integer(s.policy,'archiveDays',7,1,365);
          repeat_hours:=private.scheduler_policy_integer(s.policy,'reminderRepeatHours',24,1,720);
          perform private.refresh_requisition_lifecycle(d.id);
          select * into strict s from public.requisition_lifecycle where requisition_id=d.id;
          if s.completed_at is not null and not s.manual_archive_required and coalesce(private.science_satisfied(d.id),false)
            and now()>=s.completed_at+make_interval(days=>archive_days) then
            update public.requisition_lifecycle set archived_at=now(),archive_reason='Prazo automático após conclusão e ciência válidas' where requisition_id=d.id;
            update public.operational_documents set version=version+1 where id=d.id;
            perform private.record_document_event(d.id,'req.archived.automatic',jsonb_build_object('scheduled',true),gen_random_uuid());
            archived:=archived+1;
          elsif (s.completed_at is null or not coalesce(private.science_satisfied(d.id),false)) and s.next_reminder_at<=now() then
            update public.requisition_lifecycle set next_reminder_at=now()+make_interval(hours=>repeat_hours),reminders=reminders+1 where requisition_id=d.id;
            update public.operational_documents set version=version+1 where id=d.id;
            perform private.record_document_event(d.id,'req.reminder',jsonb_build_object('sciencePending',not coalesce(private.science_satisfied(d.id),false)),gen_random_uuid());
            n:=n+1;
          end if;
        elsif d.status='pending_receipt' and d.updated_at<now()-interval '24 hours' then
          update public.operational_documents set version=version+1,updated_at=now() where id=d.id;
          perform private.record_document_event(d.id,'ent.reminder','{"scheduled":true}',gen_random_uuid());
          n:=n+1;
        end if;
        update private.operational_scheduler_failures set resolved_at=clock_timestamp() where document_id=d.id and resolved_at is null;
      exception when others then
        get stacked diagnostics failure_state=returned_sqlstate;
        insert into private.operational_scheduler_failures(document_id,care_recipient_id,document_type,source_fingerprint,sqlstate,next_retry_at)
        values(c.document_id,patient_id,c.document_type,c.source_fingerprint,failure_state,now()+interval '1 hour')
        on conflict(document_id) do update set source_fingerprint=excluded.source_fingerprint,sqlstate=excluded.sqlstate,
          attempts=private.operational_scheduler_failures.attempts+1,last_failure_at=now(),next_retry_at=excluded.next_retry_at,resolved_at=null;
        failed:=failed+1;
      end;
    end loop;
  end loop;
  if cardinality(patients)>0 then update private.requisition_scheduler_progress set last_patient=patients[cardinality(patients)],updated_at=clock_timestamp() where singleton;end if;
  insert into private.scheduler_health(singleton,last_run,processed,failed_candidates,unresolved_candidates)
    values(true,now(),n+archived,failed,(select count(*) from private.operational_scheduler_failures where resolved_at is null))
    on conflict(singleton) do update set last_run=excluded.last_run,processed=excluded.processed,failed_candidates=excluded.failed_candidates,unresolved_candidates=excluded.unresolved_candidates;
  return jsonb_build_object('reminders',n,'archived',archived,'lifecycleCandidates',scanned,'lifecyclePatients',cardinality(patients),'failedCandidates',failed);
end;$$;

revoke all on function private.scheduler_policy_integer(jsonb,text,integer,integer,integer),private.requisition_scheduler_due(public.requisition_lifecycle),public.v4_lifecycle_schedule() from public,anon,authenticated,service_role;
-- Only the existing allowlisted run_operational_schedule RPC enters the chain.
notify pgrst,'reload schema';
commit;
