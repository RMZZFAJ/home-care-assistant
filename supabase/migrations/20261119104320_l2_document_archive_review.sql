-- A candidate retains the reviewed source and issuance identity without
-- changing the operational document. Only a verified PDF can seal the archive.
alter table private.initial_document_pdf_requests
  add column purpose text not null default 'initial' check (purpose in ('initial','archive'));
alter table private.initial_document_pdf_requests drop constraint initial_document_pdf_requests_document_id_key;
create unique index one_initial_document_pdf_request on private.initial_document_pdf_requests(document_id)
  where purpose='initial';

create table private.document_archive_attempts (
  id uuid primary key references private.initial_document_pdf_requests(id),
  document_id uuid not null references public.operational_documents(id),
  source_version integer not null,
  reference_hash text not null check (reference_hash~'^[a-f0-9]{64}$'),
  previous_state text not null check (previous_state in ('completed','cancelled')),
  mode text not null check (mode in ('policy','early','other')),
  reason text not null,
  prepared_at timestamptz not null default clock_timestamp(),
  prepared_by uuid not null references public.profiles(id),
  prepared_name text not null,
  command_key uuid not null,
  archived_at timestamptz,
  issuance_id uuid unique references private.pdf_issuances(id),
  decision text check (decision in ('confirm','reverse')),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id),
  decision_key uuid,
  decision_reason text,
  unique (prepared_by,command_key),
  unique (decided_by,decision_key),
  check ((archived_at is null)=(issuance_id is null)),
  check ((decision is null)=(decided_at is null) and (decision is null)=(decided_by is null)
    and (decision is null)=(decision_key is null) and (decision is null)=(decision_reason is null)),
  check (decision is null or archived_at is not null)
);
create unique index one_active_document_archive on private.document_archive_attempts(document_id)
  where archived_at is not null and decision is distinct from 'reverse';
alter table private.document_archive_attempts enable row level security;
revoke all on private.document_archive_attempts from public,anon,authenticated,service_role;

create function private.document_archive_active(p_document uuid) returns boolean
language sql volatile security definer set search_path='' as $body$
  select exists(select 1 from private.document_archive_attempts
    where document_id=p_document and archived_at is not null and decision is distinct from 'reverse');
$body$;

create function private.require_document_unarchived(p_document uuid) returns void
language plpgsql security definer set search_path='' as $body$
declare patient uuid;
begin
  select care_recipient_id into strict patient from public.operational_documents where id=p_document;
  perform pg_advisory_xact_lock(hashtextextended('stock:'||patient,0));
  if private.document_archive_active(p_document) then
    raise exception 'archived document is read only' using errcode='PT409'; end if;
end;
$body$;

create function private.archive_pdf_visible(p_request uuid) returns boolean
language sql stable security definer set search_path='' as $body$
  select p_request is null or not exists(select 1 from private.document_archive_attempts
    where id=p_request and archived_at is null);
$body$;

create function private.document_archive_attempt_view(a private.document_archive_attempts) returns jsonb
language sql stable set search_path='' as $body$
  select jsonb_build_object('id',a.id,'documentId',a.document_id,'sourceVersion',a.source_version,
    'previousState',a.previous_state,'mode',a.mode,'reason',a.reason,'preparedAt',a.prepared_at,'actorName',a.prepared_name,
    'archivedAt',a.archived_at,'issuanceId',a.issuance_id,'decision',a.decision);
$body$;

create function private.document_archive_reference(p_document uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $body$
declare d public.operational_documents; a private.document_archive_attempts; follow_up jsonb; result jsonb;
  days integer; actor_allowed boolean; condition text; last_progress uuid;
begin
  select * into d from public.operational_documents where id=p_document;
  if not found then raise exception 'document unavailable' using errcode='42501'; end if;
  perform private.require_cap(d.care_recipient_id,lower(d.type)||'.read');
  follow_up:=private.document_follow_up_reference(p_document);
  select * into a from private.document_archive_attempts
    where document_id=p_document and archived_at is not null and decision is distinct from 'reverse';
  select private.scheduler_policy_integer(s.settings,'archiveDays',7,1,365) into days
    from public.patient_settings s where s.care_recipient_id=d.care_recipient_id;
  days:=coalesce(days,7);
  actor_allowed:=private.auth_session() is not null and private.can_decide_document_follow_up(d,'reopen');
  condition:=follow_up->>'state';
  select n.id into last_progress from private.document_progress_notes n where n.document_id=p_document
    order by n.recorded_at desc,n.id desc limit 1;
  result:=jsonb_build_object(
    'documentId',d.id,'patientId',d.care_recipient_id,'version',d.version,'condition',condition,
    'archiveDays',days,'archive',case when a.id is not null then private.document_archive_attempt_view(a) end,
    'canArchive',actor_allowed and d.kind in ('REQ','COM','ENT','DEV') and d.protocol is not null
      and condition in ('completed','cancelled') and a.id is null
      and not exists(select 1 from public.requisitions where id=d.id and is_historical),
    'canDecide',actor_allowed and a.id is not null and a.decision is null);
  return result||jsonb_build_object('referenceHash',encode(extensions.digest(
    jsonb_build_array(result,follow_up->>'referenceHash',last_progress)::text,'sha256'),'hex'));
end;
$body$;

create function public.document_archive_reference(p_document uuid) returns jsonb
language sql stable security definer set search_path='' as $body$
  select private.document_archive_reference(p_document);
$body$;

create function private.lock_document_archive(p_document uuid) returns public.operational_documents
language plpgsql security definer set search_path='' as $body$
declare d public.operational_documents;
begin
  select * into d from public.operational_documents where id=p_document;
  if not found or private.auth_session() is null or not private.can_decide_document_follow_up(d,'reopen') then
    raise exception 'patient administrator required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('stock:'||d.care_recipient_id,0));
  select * into strict d from public.operational_documents where id=p_document for update;
  if private.auth_session() is null or not private.can_decide_document_follow_up(d,'reopen') then
    raise exception 'patient administrator required' using errcode='42501'; end if;
  return d;
end;
$body$;

create function public.prepare_document_archive(p_document uuid,p_key uuid,p_version integer,p_reference text,p_mode text,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $body$
declare d public.operational_documents; a private.document_archive_attempts; reviewed jsonb; note text; request_id uuid;
begin
  if p_key is null or p_version is null or p_mode is null or p_mode not in ('policy','early','other')
    or p_reference is null or p_reference!~'^[a-f0-9]{64}$' then
    raise exception 'invalid archive review' using errcode='22023'; end if;
  note:=case p_mode when 'policy' then 'Política padrão' when 'early' then 'Arquivamento antecipado' else btrim(coalesce(p_reason,'')) end;
  if length(note)<3 or private.bal_comment_units(note)>1000 or p_mode<>'other' and coalesce(p_reason,'')<>'' then
    raise exception 'invalid archive reason' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('archive-command:'||auth.uid()||':'||p_key,0));
  d:=private.lock_document_archive(p_document);
  select * into a from private.document_archive_attempts where prepared_by=auth.uid() and command_key=p_key;
  if found then
    if (a.document_id,a.source_version,a.reference_hash,a.mode,a.reason) is distinct from (p_document,p_version,p_reference,p_mode,note) then
      raise exception 'archive command key reused with another intention' using errcode='22023'; end if;
    return private.document_archive_attempt_view(a);
  end if;
  reviewed:=private.document_archive_reference(p_document);
  if d.version<>p_version or reviewed->>'referenceHash' is distinct from p_reference or not (reviewed->>'canArchive')::boolean then
    raise exception 'archive review changed' using errcode='PT409'; end if;
  insert into private.initial_document_pdf_requests(document_id,version,purpose) values(p_document,d.version,'archive') returning id into request_id;
  insert into private.document_archive_attempts(id,document_id,source_version,reference_hash,previous_state,mode,reason,prepared_by,prepared_name,command_key)
  values(request_id,p_document,d.version,p_reference,reviewed->>'condition',p_mode,note,auth.uid(),
    coalesce((select nullif(full_name,'') from public.profiles where id=auth.uid()),'Nome não preservado'),p_key) returning * into a;
  return private.document_archive_attempt_view(a);
end;
$body$;

create function public.commit_document_archive(p_document uuid,p_request uuid) returns jsonb
language plpgsql security definer set search_path='' as $body$
declare d public.operational_documents; a private.document_archive_attempts; artifact private.pdf_issuances; reviewed jsonb;
begin
  d:=private.lock_document_archive(p_document);
  select * into a from private.document_archive_attempts where id=p_request and document_id=p_document and prepared_by=auth.uid() for update;
  if not found then raise exception 'archive request unavailable' using errcode='42501'; end if;
  if a.archived_at is not null then return private.document_archive_attempt_view(a); end if;
  reviewed:=private.document_archive_reference(p_document);
  if d.version<>a.source_version or reviewed->>'referenceHash' is distinct from a.reference_hash or not (reviewed->>'canArchive')::boolean then
    raise exception 'archive review changed' using errcode='PT409'; end if;
  select * into artifact from private.pdf_issuances where initial_request_id=a.id and document_id=p_document
    and version=a.source_version and state='ready' and validation->'accepted'='true'::jsonb;
  if not found then raise exception 'verified consolidated PDF required' using errcode='PT409'; end if;
  a.archived_at:=clock_timestamp();
  a.issuance_id:=artifact.id;
  if d.type='REQ' then
    update public.requisition_lifecycle set archived_at=a.archived_at,archived_by=auth.uid(),archive_reason=a.reason where requisition_id=p_document;
  end if;
  update public.operational_documents set version=version+1,
    workflow_data=workflow_data||jsonb_build_object('documentArchive',private.document_archive_attempt_view(a)) where id=p_document;
  perform private.record_document_event(p_document,lower(d.type)||'.archived.manual',private.document_archive_attempt_view(a),a.command_key);
  update private.document_archive_attempts set archived_at=a.archived_at,issuance_id=a.issuance_id where id=a.id;
  if private.auth_session() is null or not private.can_decide_document_follow_up(d,'reopen') then
    raise exception 'patient administrator required' using errcode='42501'; end if;
  return private.document_archive_attempt_view(a);
end;
$body$;

create function public.decide_document_archive(p_document uuid,p_key uuid,p_version integer,p_reference text,p_action text,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $body$
declare d public.operational_documents; a private.document_archive_attempts; reviewed jsonb; note text:=btrim(coalesce(p_reason,''));
begin
  if p_key is null or p_action is null or p_action not in ('confirm','reverse') or p_version is null
    or p_reference is null or p_reference!~'^[a-f0-9]{64}$'
    or p_action='reverse' and (length(note)<3 or private.bal_comment_units(note)>1000)
    or p_action='confirm' and note<>'' then raise exception 'invalid archive decision' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('archive-decision:'||auth.uid()||':'||p_key,0));
  d:=private.lock_document_archive(p_document);
  select * into a from private.document_archive_attempts where decided_by=auth.uid() and decision_key=p_key;
  if found then
    if (a.document_id,a.decision,a.decision_reason) is distinct from (p_document,p_action,note) then
      raise exception 'archive decision key reused with another intention' using errcode='22023'; end if;
    return private.document_archive_attempt_view(a);
  end if;
  reviewed:=private.document_archive_reference(p_document);
  if d.version<>p_version or reviewed->>'referenceHash' is distinct from p_reference or not (reviewed->>'canDecide')::boolean then
    raise exception 'archive decision reference changed' using errcode='PT409'; end if;
  update private.document_archive_attempts set decision=p_action,decided_at=clock_timestamp(),decided_by=auth.uid(),
    decision_key=p_key,decision_reason=note
  where id=(reviewed#>>'{archive,id}')::uuid returning * into strict a;
  if d.type='REQ' and p_action='reverse' then
    update public.requisition_lifecycle set archived_at=null,archived_by=null,archive_reason=null where requisition_id=p_document;
  end if;
  update public.operational_documents set version=version+1,workflow_data=case p_action
    when 'reverse' then workflow_data-'documentArchive'
    else workflow_data||jsonb_build_object('documentArchive',private.document_archive_attempt_view(a)) end
  where id=p_document;
  perform private.record_document_event(p_document,lower(d.type)||case p_action when 'confirm' then '.archive_confirmed' else '.archive_reverted' end,
    private.document_archive_attempt_view(a)||jsonb_build_object('decisionReason',note,'decidedAt',a.decided_at),p_key);
  if private.auth_session() is null or not private.can_decide_document_follow_up(d,'reopen') then
    raise exception 'patient administrator required' using errcode='42501'; end if;
  return private.document_archive_attempt_view(a);
end;
$body$;

create function private.freeze_archive_pdf_facts() returns trigger
language plpgsql security definer set search_path='' as $body$
declare a private.document_archive_attempts;
begin
  if new.initial_request_id is null then return new; end if;
  select * into a from private.document_archive_attempts where id=new.initial_request_id;
  if found then
    if (a.document_id,a.source_version) is distinct from (new.document_id,new.version) then
      raise exception 'archive PDF source changed' using errcode='23514'; end if;
    new.snapshot:=new.snapshot||jsonb_build_object('archiveFacts',jsonb_build_object(
      'id',a.id,'documentId',a.document_id,'sourceVersion',a.source_version,'previousState',a.previous_state,
      'mode',a.mode,'reason',a.reason,'actorName',a.prepared_name,'reviewedAt',a.prepared_at));
  end if;
  return new;
end;
$body$;
create trigger zzzzzzzzz_freeze_archive_pdf before insert on private.pdf_issuances
for each row execute function private.freeze_archive_pdf_facts();

do $migration$
declare definition text; signature text; anchor text; suffix text;
begin
  definition:=pg_get_functiondef('private.enqueue_initial_document_pdf()'::regprocedure);
  anchor:='on conflict(document_id) do nothing';
  if strpos(definition,anchor)=0 then raise exception 'initial PDF enqueue anchor missing'; end if;
  execute replace(definition,anchor,'on conflict(document_id) where purpose=''initial'' do nothing');

  definition:=pg_get_functiondef('public.claim_initial_document_pdfs(integer)'::regprocedure);
  anchor:='where q.next_attempt_at';
  if strpos(definition,anchor)=0 then raise exception 'initial PDF claim anchor missing'; end if;
  execute replace(definition,anchor,'where q.purpose=''initial'' and q.next_attempt_at');

  definition:=pg_get_functiondef('public.initial_document_pdf_status(uuid)'::regprocedure);
  anchor:='where q.document_id=p_document';
  if strpos(definition,anchor)=0 then raise exception 'initial PDF status anchor missing'; end if;
  execute replace(definition,anchor,anchor||' and q.purpose=''initial''');

  definition:=pg_get_functiondef('public.initial_document_pdf(uuid,text,jsonb)'::regprocedure);
  anchor:='''Sistema · emissão inicial''';
  if strpos(definition,anchor)=0 then raise exception 'system PDF principal anchor missing'; end if;
  execute replace(definition,anchor,'case q.purpose when ''archive'' then ''Sistema · PDF consolidado'' else '||anchor||' end');

  definition:=pg_get_functiondef('private.document_follow_up_reference(uuid)'::regprocedure);
  anchor:='when lifecycle.archived_at is not null then';
  if strpos(definition,anchor)=0 then raise exception 'archive follow-up projection anchor missing'; end if;
  execute replace(definition,anchor,'when lifecycle.archived_at is not null or private.document_archive_active(p_id) then');

  definition:=pg_get_functiondef('private.record_document_event(uuid,text,jsonb,uuid)'::regprocedure);
  anchor:='select * into strict d from public.operational_documents where id=p_id for update;';
  if strpos(definition,anchor)=0 then raise exception 'archive event guard anchor missing'; end if;
  execute replace(definition,anchor,anchor||$body$
  if private.document_archive_active(p_id) and p_action not in ('req.archive_confirmed','com.archive_confirmed','ent.archive_confirmed') then
    raise exception 'archived document is read only' using errcode='PT409'; end if;
  $body$);

  definition:=pg_get_functiondef('public.document_progress_publish(uuid,uuid,jsonb)'::regprocedure);
  anchor:='insert into private.document_progress_notes';
  if strpos(definition,anchor)=0 then raise exception 'archive progress guard anchor missing'; end if;
  execute replace(definition,anchor,'perform private.require_document_unarchived(p_document); '||anchor);

  foreach signature in array array['public.reserve_pdf_issuance(uuid,uuid,integer)','public.reserve_pdf_expanded_issuance(uuid,uuid,jsonb,integer)'] loop
    definition:=pg_get_functiondef(signature::regprocedure);
    anchor:='if d.protocol is null then';
    if strpos(definition,anchor)=0 then raise exception 'archive PDF reservation guard anchor missing'; end if;
    execute replace(definition,anchor,'perform private.require_document_unarchived(p_document); '||anchor);
  end loop;

  definition:=pg_get_functiondef('private.require_pdf_issuance_access(private.pdf_issuances)'::regprocedure);
  anchor:='then return;end if;';
  if strpos(definition,anchor)=0 then raise exception 'archive PDF read guard anchor missing'; end if;
  execute replace(definition,anchor,anchor||' if not private.archive_pdf_visible(r.initial_request_id) then raise exception ''issuance unavailable'' using errcode=''42501'';end if;');

  foreach signature in array array['public.pdf_issuance_public(text,text)','public.pdf_verification_details(text,boolean)',
    'public.pdf_issuances(uuid,timestamptz,uuid,integer)','public.pdf_archive(uuid,integer,timestamptz,text,text,integer)'] loop
    definition:=pg_get_functiondef(signature::regprocedure);
    anchor:=case signature
      when 'public.pdf_issuance_public(text,text)' then 'where state=''ready'' and case'
      when 'public.pdf_verification_details(text,boolean)' then 'where verification_code=p_code and state=''ready'''
      when 'public.pdf_issuances(uuid,timestamptz,uuid,integer)' then 'where document_id=p_document and private.pdf_expansion_visible'
      else 'where r.document_id=p_document and r.renderer_revision in (16,17)' end;
    suffix:=case signature
      when 'public.pdf_issuance_public(text,text)' then 'where state=''ready'' and private.archive_pdf_visible(initial_request_id) and case'
      when 'public.pdf_verification_details(text,boolean)' then anchor||' and private.archive_pdf_visible(initial_request_id)'
      when 'public.pdf_issuances(uuid,timestamptz,uuid,integer)' then 'where document_id=p_document and private.archive_pdf_visible(r.initial_request_id) and private.pdf_expansion_visible'
      else anchor||' and private.archive_pdf_visible(r.initial_request_id)' end;
    if strpos(definition,anchor)=0 then raise exception 'archive PDF list or verification anchor missing'; end if;
    execute replace(definition,anchor,suffix);
  end loop;
end;
$migration$;

revoke all on function private.document_archive_active(uuid),private.require_document_unarchived(uuid),private.archive_pdf_visible(uuid),
  private.document_archive_attempt_view(private.document_archive_attempts),private.document_archive_reference(uuid),
  private.lock_document_archive(uuid),private.freeze_archive_pdf_facts(),public.document_archive_reference(uuid),
  public.prepare_document_archive(uuid,uuid,integer,text,text,text),public.commit_document_archive(uuid,uuid),
  public.decide_document_archive(uuid,uuid,integer,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.document_archive_reference(uuid),public.prepare_document_archive(uuid,uuid,integer,text,text,text),
  public.commit_document_archive(uuid,uuid),public.decide_document_archive(uuid,uuid,integer,text,text,text) to authenticated;
notify pgrst,'reload schema';
