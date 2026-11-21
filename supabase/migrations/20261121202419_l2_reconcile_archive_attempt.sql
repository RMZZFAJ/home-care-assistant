-- A closed key records only the proven absence of an official act. No form
-- fields are persisted by recovery. Existing archive rows remain the receipts.
create table private.closed_document_archive_keys (
  actor_id uuid not null references public.profiles(id),
  key uuid not null,
  command_kind text not null check (command_kind in ('archive','decision')),
  document_id uuid not null references public.operational_documents(id),
  closed_at timestamptz not null default clock_timestamp(),
  primary key (actor_id, key, command_kind)
);
alter table private.closed_document_archive_keys enable row level security;
revoke all on private.closed_document_archive_keys from public, anon, authenticated, service_role;

create function private.require_archive_key_open(p_actor uuid, p_key uuid, p_kind text)
returns void language plpgsql stable set search_path='' as $body$
begin
  if exists(select 1 from private.closed_document_archive_keys k
    where k.actor_id=p_actor and k.key=p_key and k.command_kind=p_kind) then
    raise exception 'archive command was reconciled without an act' using errcode='PT409';
  end if;
end;
$body$;

create function public.settle_document_archive(p_document uuid, p_key uuid, p_action text)
returns jsonb language plpgsql security definer set search_path='' as $body$
declare
  actor uuid:=auth.uid();
  kind text;
  d public.operational_documents;
  a private.document_archive_attempts;
  closed_document uuid;
  reviewed jsonb;
  identity jsonb;
begin
  if actor is null or private.auth_session() is null then
    raise exception 'active identity required' using errcode='42501';
  end if;
  if p_document is null or p_key is null or p_action is null or p_action not in ('archive','confirm','reverse') then
    raise exception 'invalid archive recovery' using errcode='22023';
  end if;
  identity:=jsonb_build_object('documentId',p_document,'key',p_key,'action',p_action);
  kind:=case when p_action='archive' then 'archive' else 'decision' end;

  -- Match the existing command lock order. Commit uses the same document row
  -- lock and must consult the fence before sealing a prepared archive.
  perform pg_advisory_xact_lock(hashtextextended(
    case kind when 'archive' then 'archive-command:' else 'archive-decision:' end||actor||':'||p_key,0));
  d:=private.lock_document_archive(p_document);

  select k.document_id into closed_document from private.closed_document_archive_keys k
    where k.actor_id=actor and k.key=p_key and k.command_kind=kind;
  if found then
    if closed_document<>p_document then raise exception 'archive command scope differs' using errcode='22023'; end if;
    return identity||jsonb_build_object('state','not_applied');
  end if;

  if p_action='archive' then
    select * into a from private.document_archive_attempts attempt
      where attempt.prepared_by=actor and attempt.command_key=p_key;
  else
    select * into a from private.document_archive_attempts attempt
      where attempt.decided_by=actor and attempt.decision_key=p_key;
  end if;
  if a.id is not null then
    if a.document_id<>p_document or (p_action<>'archive' and a.decision is distinct from p_action) then
      raise exception 'archive command scope differs' using errcode='22023';
    end if;
    if a.archived_at is not null then
      return identity||jsonb_build_object('state','applied','archive',private.document_archive_attempt_view(a));
    end if;
    reviewed:=private.document_archive_reference(p_document);
    if a.source_version=d.version and a.reference_hash=reviewed->>'referenceHash' and (reviewed->>'canArchive')::boolean then
      return identity||jsonb_build_object('state','prepared','archive',private.document_archive_attempt_view(a));
    end if;
  end if;

  insert into private.closed_document_archive_keys(actor_id,key,command_kind,document_id)
    values(actor,p_key,kind,p_document);
  perform private.lock_document_archive(p_document);
  return identity||jsonb_build_object('state','not_applied');
end;
$body$;

do $migration$
declare definition text; signature text; anchor text; kind text;
begin
  foreach signature in array array['public.prepare_document_archive(uuid,uuid,integer,text,text,text)',
    'public.decide_document_archive(uuid,uuid,integer,text,text,text)'] loop
    definition:=pg_get_functiondef(signature::regprocedure);
    anchor:='d:=private.lock_document_archive(p_document);';
    kind:=case when position('prepare_document_archive' in signature)>0 then 'archive' else 'decision' end;
    if position(anchor in definition)=0 then raise exception 'archive command lock anchor missing'; end if;
    execute replace(definition,anchor,anchor||format(' perform private.require_archive_key_open(auth.uid(),p_key,%L);',kind));
  end loop;

  definition:=pg_get_functiondef('public.commit_document_archive(uuid,uuid)'::regprocedure);
  anchor:='if a.archived_at is not null then return private.document_archive_attempt_view(a); end if;';
  if position(anchor in definition)=0 then raise exception 'archive commit receipt anchor missing'; end if;
  execute replace(definition,anchor,anchor||' perform private.require_archive_key_open(a.prepared_by,a.command_key,''archive'');');
end;
$migration$;

revoke all on function private.require_archive_key_open(uuid,uuid,text),
  public.settle_document_archive(uuid,uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.settle_document_archive(uuid,uuid,text) to authenticated;
notify pgrst,'reload schema';
