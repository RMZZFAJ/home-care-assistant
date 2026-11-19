do $migration$
declare
  definition text := pg_get_viewdef('private.document_progress_facts'::regclass,false);
  anchor text := '''ent.fulfillment_reviewed''::text';
begin
  if strpos(definition,anchor)=0 then
    raise exception 'delivery review progress anchor missing';
  end if;
  execute 'create or replace view private.document_progress_facts as '||
    replace(definition,anchor,anchor||', ''ent.request_fulfillment_review''::text');
end;
$migration$;
