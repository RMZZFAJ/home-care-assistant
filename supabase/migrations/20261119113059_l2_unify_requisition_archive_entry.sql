-- An old request can recover its own already-recorded result. Every new
-- archive must begin with the reviewed source and the consolidated PDF.
create or replace function public.archive_requisition(p_id uuid,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $body$
declare d public.operational_documents;
begin
  d:=private.lock_document_archive(p_id);
  if d.kind<>'REQ' then raise exception 'requisition unavailable' using errcode='42501'; end if;
  if exists(select 1 from public.requisition_lifecycle where requisition_id=p_id
    and archived_at is not null and archived_by=auth.uid() and archive_reason=btrim(p_reason)) then
    return public.requisition_progress(p_id);
  end if;
  raise exception 'consolidated archive review required' using errcode='PT409';
end;
$body$;

drop function public.v4_review_archive_requisition(uuid,text);

create or replace function private.requisition_archive_task(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $body$
  select exists(
    select 1 from public.requisition_lifecycle s
      join public.operational_documents d on d.id=s.requisition_id and d.kind='REQ'
      join public.requisitions r on r.id=d.id and not r.is_historical
    where d.id=p_id and d.protocol is not null and d.status not in ('draft','cancelled')
      and s.archived_at is null and s.completed_at is not null
      and private.can_decide_document_follow_up(d,'reopen') and private.can(d.care_recipient_id,'req.archive')
  );
$body$;

-- Old decision and draft commands continue to replay stored receipts.
-- Neither entry can create a fresh receipt for a legacy archive.
do $migration$
declare definition text:=pg_get_functiondef('public.execute_document_decision(uuid,uuid,jsonb)'::regprocedure);
  anchor text:='elsif action=''archive'' then outcome:=public.archive_requisition(p_document,body->>''reason'');';
begin
  if strpos(definition,anchor)=0 then raise exception 'legacy archive decision anchor missing'; end if;
  execute replace(definition,anchor,
    'elsif action=''archive'' then raise exception ''consolidated archive review required'' using errcode=''PT409'';');

  definition:=pg_get_functiondef('public.commit_supply_draft(uuid,integer,uuid,jsonb,uuid)'::regprocedure);
  anchor:='if d.purpose=''archive'' then outcome:=public.archive_requisition(p_target,p_body#>>''{body,reason}'');';
  if strpos(definition,anchor)=0 then raise exception 'legacy archive draft anchor missing'; end if;
  execute replace(definition,anchor,
    'if d.purpose=''archive'' then raise exception ''consolidated archive review required'' using errcode=''PT409'';');
end;
$migration$;

revoke all on function public.archive_requisition(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.archive_requisition(uuid,text) to authenticated;
