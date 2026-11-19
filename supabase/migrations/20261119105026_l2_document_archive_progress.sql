-- Pending preparations stay private. Only effective archive and review acts
-- belong to the shared document timeline.
do $migration$
declare
  definition text:=pg_get_viewdef('private.document_progress_facts'::regclass,false);
  anchor text:='''ent.follow_up_reopened''::text';
begin
  if strpos(definition,anchor)=0 then raise exception 'archive timeline anchor missing'; end if;
  execute 'create or replace view private.document_progress_facts as '||replace(definition,anchor,anchor||
    ', ''com.archived.manual''::text, ''ent.archived.manual''::text, ''req.archive_confirmed''::text, ''com.archive_confirmed''::text, ''ent.archive_confirmed''::text, ''req.archive_reverted''::text, ''com.archive_reverted''::text, ''ent.archive_reverted''::text');
end;
$migration$;
