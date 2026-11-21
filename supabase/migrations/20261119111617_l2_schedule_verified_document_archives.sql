-- Scheduled archives use the same private PDF reservation and sealing as
-- administrator archives. A system archive has no human preparer.
alter table private.document_archive_attempts
  alter column prepared_by drop not null,
  add column superseded_at timestamptz,
  add constraint system_archive_policy check (prepared_by is not null or mode='policy'),
  add constraint superseded_archive_is_private check (superseded_at is null or (prepared_by is null and archived_at is null));

create unique index one_scheduled_archive_per_reference
  on private.document_archive_attempts(document_id,reference_hash)
  where prepared_by is null and superseded_at is null;

create function private.document_follow_up_state(d public.operational_documents,l public.requisition_lifecycle)
returns text language sql stable set search_path='' as $body$
  select case
    when l.archived_at is not null or private.document_archive_active(d.id) then 'archived'
    when d.status='cancelled' and (d.type='REQ' or d.workflow_data#>>'{documentFollowUp,physicalStatus}' is distinct from 'cancelled') then 'cancelled'
    when l.completed_at is not null and d.status<>'cancelled' then 'completed'
    when d.type<>'REQ' and d.workflow_data#>>'{documentFollowUp,state}'='completed' then 'completed'
    when d.workflow_data#>>'{documentFollowUp,state}'='reopened' then 'reopened'
    when d.status='cancelled' then 'cancelled'
    else 'open'
  end;
$body$;

-- This reference has no caller-dependent permissions or private note content.
-- The last note identity detects changes that do not advance the version.
create function private.scheduled_archive_reference(d public.operational_documents)
returns table(condition text,due_at timestamptz,reference_hash text)
language plpgsql stable set search_path='' as $body$
declare l public.requisition_lifecycle; days integer; closed_at timestamptz;
  last_reversal timestamptz; last_note uuid;
begin
  if d.kind not in ('REQ','COM','ENT','DEV') or d.protocol is null
    or not exists(select 1 from public.care_recipients where id=d.care_recipient_id and is_active) then return; end if;
  if d.kind='REQ' then
    select * into l from public.requisition_lifecycle where requisition_id=d.id;
    if not found or exists(select 1 from public.requisitions where id=d.id and is_historical) then return; end if;
  end if;
  condition:=private.document_follow_up_state(d,l);
  if condition='cancelled' then
    select e.created_at into closed_at from public.document_events e
    where e.document_id=d.id and e.body->>'status'='cancelled'
      and e.action in ('req.status','com.cancel','ent.cancel','ent.consent_cancel')
    order by e.version desc limit 1;
  elsif condition='completed' and d.kind='REQ' then
    if l.manual_archive_required or not coalesce(private.science_satisfied(d.id),false) then return; end if;
    closed_at:=l.completed_at;
  elsif condition='completed' then
    closed_at:=(d.workflow_data#>>'{documentFollowUp,recordedAt}')::timestamptz;
  end if;
  if closed_at is null then return; end if;
  begin
    select private.scheduler_policy_integer(s.settings,'archiveDays',7,1,365) into days
      from public.patient_settings s where s.care_recipient_id=d.care_recipient_id;
  exception when invalid_parameter_value then
    return;
  end;
  days:=coalesce(days,7);
  select a.decided_at into last_reversal from private.document_archive_attempts a
    where a.document_id=d.id and a.decision='reverse' order by a.decided_at desc limit 1;
  due_at:=greatest(closed_at,last_reversal)+make_interval(days=>days);
  select id into last_note from private.document_progress_notes where document_id=d.id
    order by recorded_at desc,id desc limit 1;
  reference_hash:=encode(extensions.digest(
    jsonb_build_array(d.id,d.version,condition,days,closed_at,last_reversal,last_note)::text,'sha256'),'hex');
  return next;
end;
$body$;

create function private.seal_document_archive(d public.operational_documents,a private.document_archive_attempts)
returns jsonb language plpgsql set search_path='' as $body$
declare artifact_id uuid; facts jsonb;
begin
  select p.id into artifact_id from private.pdf_issuances p where p.initial_request_id=a.id
    and p.document_id=d.id and p.version=a.source_version and p.state='ready' and p.validation->'accepted'='true'::jsonb;
  if not found then raise exception 'verified consolidated PDF required' using errcode='PT409'; end if;
  a.archived_at:=clock_timestamp();
  a.issuance_id:=artifact_id;
  facts:=private.document_archive_attempt_view(a);
  if d.type='REQ' then
    update public.requisition_lifecycle
      set archived_at=a.archived_at,archived_by=a.prepared_by,archive_reason=a.reason where requisition_id=d.id;
  end if;
  update public.operational_documents set version=version+1,
    workflow_data=workflow_data||jsonb_build_object('documentArchive',facts) where id=d.id;
  perform private.record_document_event(d.id,lower(d.type)||case when a.prepared_by is null
    then '.archived.automatic' else '.archived.manual' end,facts,a.command_key);
  update private.document_archive_attempts set archived_at=a.archived_at,issuance_id=artifact_id where id=a.id;
  return facts;
end;
$body$;

create function public.claim_scheduled_document_archives(p_limit integer)
returns setof uuid language plpgsql security definer set search_path='' as $body$
declare candidate record; d public.operational_documents; reviewed record; request_id uuid;
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then
    raise exception 'archive worker required' using errcode='42501'; end if;
  if p_limit is null or p_limit not between 1 and 10 then
    raise exception 'invalid archive batch size' using errcode='22023'; end if;

  for candidate in
    with candidates as materialized (
      select doc.id,doc.care_recipient_id,ref.due_at
      from public.operational_documents doc
      left join public.requisition_lifecycle l on l.requisition_id=doc.id
      cross join lateral private.scheduled_archive_reference(doc) ref
      where doc.kind in ('REQ','COM','ENT','DEV') and doc.protocol is not null and l.archived_at is null
        and (doc.status='cancelled' or l.completed_at is not null or doc.workflow_data#>>'{documentFollowUp,state}'='completed')
        and ref.due_at<=now()
        and not exists(select 1 from private.document_archive_attempts a where a.document_id=doc.id
          and a.reference_hash=ref.reference_hash and a.prepared_by is null and a.superseded_at is null)
      order by ref.due_at,doc.id limit p_limit
    )
    select * from candidates order by care_recipient_id,id
  loop
    if not pg_try_advisory_xact_lock(hashtextextended('stock:'||candidate.care_recipient_id,0)) then continue; end if;
    select * into d from public.operational_documents where id=candidate.id for update;
    if not found then continue; end if;
    select * into reviewed from private.scheduled_archive_reference(d);
    if not found or reviewed.due_at>now() or exists(
      select 1 from private.document_archive_attempts a where a.document_id=d.id and a.reference_hash=reviewed.reference_hash
        and a.prepared_by is null and a.superseded_at is null
    ) then continue; end if;
    insert into private.initial_document_pdf_requests(document_id,version,purpose)
      values(d.id,d.version,'archive') returning id into request_id;
    insert into private.document_archive_attempts(id,document_id,source_version,reference_hash,previous_state,mode,reason,prepared_name,command_key)
      values(request_id,d.id,d.version,reviewed.reference_hash,reviewed.condition,'policy','Política padrão','Sistema',request_id);
  end loop;

  return query
    with due as (
      select q.id from private.initial_document_pdf_requests q
      join private.document_archive_attempts a on a.id=q.id
      left join private.pdf_issuances p on p.initial_request_id=q.id
      where a.prepared_by is null and a.archived_at is null and a.superseded_at is null
        and q.next_attempt_at<=now() and (p.lease_until is null or p.lease_until<=now())
      order by q.next_attempt_at,q.id limit p_limit for update of q skip locked
    )
    update private.initial_document_pdf_requests q set next_attempt_at=now()+interval '2 minutes'
    from due where q.id=due.id returning q.id;
end;
$body$;

create function public.commit_scheduled_document_archive(p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $body$
declare d public.operational_documents; a private.document_archive_attempts; reviewed record; patient uuid;
begin
  if auth.jwt()->>'role' is distinct from 'service_role' then
    raise exception 'archive worker required' using errcode='42501'; end if;
  select doc.care_recipient_id into patient from private.document_archive_attempts attempt
  join public.operational_documents doc on doc.id=attempt.document_id
  where attempt.id=p_request and attempt.prepared_by is null;
  if not found then raise exception 'scheduled archive unavailable' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('stock:'||patient,0));
  select * into strict a from private.document_archive_attempts where id=p_request for update;
  if a.archived_at is not null then return private.document_archive_attempt_view(a); end if;
  if a.superseded_at is not null then return null; end if;
  select * into strict d from public.operational_documents where id=a.document_id for update;
  perform 1 from public.care_recipients where id=patient for share;
  perform 1 from public.patient_settings where care_recipient_id=patient for share;
  select * into reviewed from private.scheduled_archive_reference(d);
  if not found or reviewed.due_at>now() or d.version<>a.source_version
    or reviewed.reference_hash is distinct from a.reference_hash then
    update private.document_archive_attempts set superseded_at=clock_timestamp() where id=a.id;
    return null;
  end if;
  return private.seal_document_archive(d,a);
end;
$body$;

do $migration$
declare definition text; body_start integer; body_end integer; anchor text;
begin
  definition:=pg_get_functiondef('private.document_follow_up_reference(uuid)'::regprocedure);
  body_start:=strpos(definition,'state:=case');
  body_end:=strpos(definition,'if state=''cancelled'' then');
  if body_start=0 or body_end<=body_start then raise exception 'follow-up state anchor missing'; end if;
  execute overlay(definition placing 'state:=private.document_follow_up_state(d,lifecycle); ' from body_start for body_end-body_start);

  definition:=pg_get_functiondef('private.document_archive_attempt_view(private.document_archive_attempts)'::regprocedure);
  anchor:='''archivedAt'',a.archived_at';
  if strpos(definition,anchor)=0 then raise exception 'archive origin projection anchor missing'; end if;
  execute replace(definition,anchor,'''automatic'',a.prepared_by is null,'||anchor);

  definition:=replace(pg_get_functiondef('public.commit_document_archive(uuid,uuid)'::regprocedure),E'\r\n',E'\n');
  definition:=replace(definition,'artifact private.pdf_issuances;','facts jsonb;');
  body_start:=strpos(definition,'select * into artifact');
  body_end:=strpos(definition,'if private.auth_session()');
  if body_start=0 or body_end<=body_start then raise exception 'manual archive seal anchor missing'; end if;
  definition:=overlay(definition placing 'facts:=private.seal_document_archive(d,a); ' from body_start for body_end-body_start);
  anchor:=E'  return private.document_archive_attempt_view(a);\nend;';
  if strpos(definition,anchor)=0 then raise exception 'manual archive return anchor missing'; end if;
  execute replace(definition,anchor,E'  return facts;\nend;');

  definition:=pg_get_functiondef('private.requisition_scheduler_due(public.requisition_lifecycle)'::regprocedure);
  anchor:='if not p_state.manual_archive_required then return p_state.completed_at+make_interval(days=>days);end if;';
  if strpos(definition,anchor)=0 then raise exception 'legacy archive selection anchor missing'; end if;
  execute replace(definition,anchor,'');

  definition:=pg_get_functiondef('public.v4_lifecycle_schedule()'::regprocedure);
  body_start:=strpos(definition,'if s.completed_at is not null and not s.manual_archive_required');
  body_end:=strpos(definition,'elsif (s.completed_at is null');
  if body_start=0 or body_end<=body_start then raise exception 'legacy archive write anchor missing'; end if;
  execute overlay(definition placing 'if ' from body_start for body_end-body_start+6);

  definition:=pg_get_viewdef('private.document_progress_facts'::regclass,false);
  anchor:='''com.archived.manual''::text';
  if strpos(definition,anchor)=0 then raise exception 'scheduled archive timeline anchor missing'; end if;
  execute 'create or replace view private.document_progress_facts as '||replace(definition,anchor,
    anchor||', ''com.archived.automatic''::text, ''ent.archived.automatic''::text');
end;
$migration$;

revoke all on function private.document_follow_up_state(public.operational_documents,public.requisition_lifecycle),
  private.scheduled_archive_reference(public.operational_documents),
  private.seal_document_archive(public.operational_documents,private.document_archive_attempts),
  public.claim_scheduled_document_archives(integer),public.commit_scheduled_document_archive(uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.claim_scheduled_document_archives(integer),public.commit_scheduled_document_archive(uuid) to service_role;
