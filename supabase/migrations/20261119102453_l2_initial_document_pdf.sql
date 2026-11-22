-- The official event queues generation. The signed artifact stays in the
-- existing issuance pipeline, with a distinct system principal and cutoff.
create table private.initial_document_pdf_requests (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique,
  version integer not null,
  requested_at timestamptz not null default clock_timestamp(),
  next_attempt_at timestamptz not null default clock_timestamp(),
  foreign key(document_id,version) references public.document_events(document_id,version)
);
create index initial_document_pdf_due on private.initial_document_pdf_requests(next_attempt_at,id);
alter table private.initial_document_pdf_requests enable row level security;
revoke all on private.initial_document_pdf_requests from public,anon,authenticated,service_role;

alter table private.pdf_issuances
  add column initial_request_id uuid unique references private.initial_document_pdf_requests(id);
alter table private.pdf_issuances drop constraint pdf_principal;
alter table private.pdf_issuances add constraint pdf_principal check (
  (notification_id is null and initial_request_id is null and requested_by is not null and requested_session is not null)
  or (num_nonnulls(notification_id,initial_request_id)=1 and requested_by is null and requested_session is null)
);

create table private.initial_pdf_authority (
  backend_pid integer not null,
  transaction_id bigint not null,
  request_id uuid not null,
  document_id uuid not null,
  primary key(backend_pid,transaction_id)
);
alter table private.initial_pdf_authority enable row level security;
revoke all on private.initial_pdf_authority from public,anon,authenticated,service_role;

create function private.has_initial_pdf_authority(p_document uuid,p_request uuid default null)
returns boolean language sql stable security definer set search_path='' as $body$
  select auth.role()='service_role' and exists(
    select 1 from private.initial_pdf_authority a
    where a.backend_pid=pg_backend_pid() and a.transaction_id=txid_current()
      and a.document_id=p_document and (p_request is null or a.request_id=p_request)
  );
$body$;

create function private.enqueue_initial_document_pdf() returns trigger
language plpgsql security definer set search_path='' as $body$
declare source_version integer;
begin
  if new.action not in ('req.issued','com.issued','com.submit','ent.issued','ent.submit','bal.issued','bal.submit')
    or nullif(new.body->>'protocol','') is null
    or coalesce((new.body->>'isHistorical')::boolean,false)
    or exists(
      select 1 from public.document_events e where e.document_id=new.document_id
        and e.version<new.version and nullif(e.body->>'protocol','') is not null
    ) then return new; end if;

  source_version:=new.version;
  if new.action='req.issued' then
    -- The earlier AFTER trigger applies previously authorized tacit science.
    -- Later manual acknowledgements cannot move this documentary cutoff.
    select greatest(source_version,max(e.version)) into source_version
    from public.document_events e
    where e.document_id=new.document_id and e.version>new.version
      and e.action in ('req.science_recorded','req.science_satisfied')
      and e.body#>>'{event,mode}'='tacit';
  end if;
  insert into private.initial_document_pdf_requests(document_id,version)
  values(new.document_id,source_version)
  on conflict(document_id) do nothing;
  return new;
end;
$body$;
create trigger zz_enqueue_initial_document_pdf after insert on public.document_events
for each row execute function private.enqueue_initial_document_pdf();

create function public.claim_initial_document_pdfs(p_limit integer) returns setof uuid
language plpgsql security definer set search_path='' as $body$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'PDF worker required' using errcode='42501'; end if;
  if p_limit is null or p_limit not between 1 and 10 then
    raise exception 'invalid PDF batch size' using errcode='22023'; end if;
  return query
    with due as (
      select q.id from private.initial_document_pdf_requests q
      left join private.pdf_issuances p on p.initial_request_id=q.id
      where q.next_attempt_at<=clock_timestamp() and coalesce(p.state,'reserved')<>'ready'
        and (p.lease_until is null or p.lease_until<=clock_timestamp())
      order by q.next_attempt_at,q.id limit p_limit for update of q skip locked
    )
    update private.initial_document_pdf_requests q set next_attempt_at=clock_timestamp()+interval '2 minutes'
      from due where q.id=due.id returning q.id;
end;
$body$;

create function public.initial_document_pdf_status(p_document uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $body$
declare result jsonb;
begin
  perform private.require_pdf_document(p_document);
  select jsonb_build_object('id',q.id,'documentId',q.document_id,'version',q.version,
    'state',coalesce(p.state,'reserved'),'issuanceId',p.id,'lastError',p.last_error)
  into result from private.initial_document_pdf_requests q
  left join private.pdf_issuances p on p.initial_request_id=q.id
  where q.document_id=p_document;
  return result;
end;
$body$;

create function public.initial_document_pdf(p_request uuid,p_action text,p_args jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $body$
declare q private.initial_document_pdf_requests; e public.document_events; r private.pdf_issuances;
  result jsonb; new_id uuid;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'PDF worker required' using errcode='42501'; end if;
  select * into q from private.initial_document_pdf_requests where id=p_request for update;
  if not found then raise exception 'initial PDF request unavailable' using errcode='42501'; end if;
  insert into private.initial_pdf_authority values(pg_backend_pid(),txid_current(),q.id,q.document_id)
  on conflict(backend_pid,transaction_id) do update set request_id=excluded.request_id,document_id=excluded.document_id;
  select * into r from private.pdf_issuances where initial_request_id=q.id;
  if p_action='reserve' then
    if p_args is distinct from '{}'::jsonb then
      raise exception 'invalid initial PDF request' using errcode='22023'; end if;
    if r.id is null then
      select * into strict e from public.document_events where document_id=q.document_id and version=q.version;
      new_id:=gen_random_uuid();
      insert into private.pdf_issuances(id,document_id,version,care_recipient_id,requested_by,requested_name,requested_session,
        idempotency_key,request_hash,verification_code,renderer_revision,representation,source_hash,snapshot,object_path,initial_request_id)
      values(new_id,e.document_id,e.version,e.care_recipient_id,null,'Sistema · emissão inicial',null,q.id,
        encode(extensions.digest(jsonb_build_array('initial-document-pdf',q.id,e.document_id,e.version)::text,'sha256'),'hex'),
        upper(encode(extensions.gen_random_bytes(16),'hex')),16,'operational',e.content_hash,e.body,
        'issuances/'||e.document_id||'/'||new_id||'.pdf',q.id) returning * into r;
    end if;
  elsif coalesce(p_action in ('read','stage','complete'),false) then
    if r.id is null or p_args->>'p_id' is distinct from r.id::text then
      raise exception 'initial PDF issuance unavailable' using errcode='42501'; end if;
  else
    raise exception 'invalid initial PDF command' using errcode='22023';
  end if;
  if p_action in ('reserve','read') then result:=public.pdf_issuance(r.id);
  elsif p_action='stage' then result:=public.pdf_issuance_stage(r.id,p_args->>'p_token',p_args->>'p_step',p_args->>'p_error');
  else result:=public.complete_pdf_issuance(r.id,p_args->>'p_token',p_args->>'p_hash',(p_args->>'p_size')::integer,
    p_args->'p_validation',p_args->>'p_key_version',p_args->>'p_trust_revision'); end if;
  delete from private.initial_pdf_authority where backend_pid=pg_backend_pid() and transaction_id=txid_current();
  return result;
end;
$body$;

do $pipeline$
declare definition text; signature text; anchor text;
begin
  definition:=pg_get_functiondef('private.require_pdf_document(uuid)'::regprocedure);
  anchor:='not private.has_pdf_notification_authority(d.id)';
  if strpos(definition,anchor)=0 then raise exception 'PDF document authority anchor missing'; end if;
  execute replace(definition,anchor,anchor||' and not private.has_initial_pdf_authority(d.id)');

  foreach signature in array array['private.document_pdf_presentation(uuid,integer,jsonb)','private.document_pdf_lifecycle(uuid,integer)'] loop
    definition:=pg_get_functiondef(signature::regprocedure);
    anchor:='if private.has_pdf_notification_authority(p_id)';
    if strpos(definition,anchor)=0 then raise exception 'PDF source authority anchor missing'; end if;
    execute replace(definition,anchor,anchor||' or private.has_initial_pdf_authority(p_id)');
  end loop;

  definition:=pg_get_functiondef('private.require_pdf_issuance_access(private.pdf_issuances)'::regprocedure);
  anchor:='r.notification_id is not null and private.has_pdf_notification_authority(r.document_id,r.notification_id)';
  if strpos(definition,anchor)=0 then raise exception 'PDF read authority anchor missing'; end if;
  execute replace(definition,anchor,anchor||' or r.initial_request_id is not null and private.has_initial_pdf_authority(r.document_id,r.initial_request_id)');

  foreach signature in array array['private.require_pdf_lease(uuid,text)','public.complete_pdf_issuance(uuid,text,text,integer,jsonb,text,text)'] loop
    definition:=pg_get_functiondef(signature::regprocedure);
    anchor:='(notification_id is not null and private.has_pdf_notification_authority(document_id,notification_id))';
    if strpos(definition,anchor)=0 then raise exception 'PDF write authority anchor missing'; end if;
    execute replace(definition,anchor,anchor||' or (initial_request_id is not null and private.has_initial_pdf_authority(document_id,initial_request_id))');
  end loop;

  definition:=pg_get_functiondef('private.guard_pdf_issuance()'::regprocedure);
  anchor:='new.notification_id is distinct from old.notification_id';
  if strpos(definition,anchor)=0 then raise exception 'PDF immutable principal anchor missing'; end if;
  execute replace(definition,anchor,anchor||' or new.initial_request_id is distinct from old.initial_request_id');
end;
$pipeline$;

revoke all on function private.has_initial_pdf_authority(uuid,uuid),private.enqueue_initial_document_pdf()
  from public,anon,authenticated,service_role;
revoke all on function public.claim_initial_document_pdfs(integer),public.initial_document_pdf_status(uuid),
  public.initial_document_pdf(uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.claim_initial_document_pdfs(integer),public.initial_document_pdf(uuid,text,jsonb) to service_role;
grant execute on function public.initial_document_pdf_status(uuid) to authenticated;
notify pgrst,'reload schema';
