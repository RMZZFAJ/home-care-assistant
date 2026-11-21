-- REQ retains its explicitly configurable archive capability under the
-- administrator rule. Read models and write gates expose the same limitation.
do $migration$
declare definition text; signature text; anchor text;
begin
  foreach signature in array array['private.document_archive_reference(uuid)','private.lock_document_archive(uuid)',
    'public.commit_document_archive(uuid,uuid)','public.decide_document_archive(uuid,uuid,integer,text,text,text)'] loop
    definition:=pg_get_functiondef(signature::regprocedure);
    anchor:='private.can_decide_document_follow_up(d,''reopen'')';
    if strpos(definition,anchor)=0 then raise exception 'REQ archive authority anchor missing'; end if;
    execute replace(definition,anchor,'('||anchor||
      ' and (d.type<>''REQ'' or private.can(d.care_recipient_id,''req.archive'')))');
  end loop;

  definition:=pg_get_functiondef('private.require_document_unarchived(uuid)'::regprocedure);
  anchor:='if private.document_archive_active(p_document) then';
  if strpos(definition,anchor)=0 then raise exception 'legacy archive write guard anchor missing'; end if;
  execute replace(definition,anchor,'if private.document_archive_active(p_document) or exists(
    select 1 from public.requisition_lifecycle where requisition_id=p_document and archived_at is not null
  ) then');

  definition:=pg_get_functiondef('public.document_progress(uuid,text,integer,integer)'::regprocedure);
  anchor:='''canPublish'',private.can(d.care_recipient_id,''document.progress.create'')';
  if strpos(definition,anchor)=0 then raise exception 'archive progress read guard anchor missing'; end if;
  execute replace(definition,anchor,anchor||
    ' and not private.document_archive_active(d.id) and not exists(select 1 from public.requisition_lifecycle where requisition_id=d.id and archived_at is not null)');
end;
$migration$;
