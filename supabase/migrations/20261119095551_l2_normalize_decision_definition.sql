-- Normalize the preserved function body before the follow-up migration
-- locates multiline anchors. Existing installations may have CRLF bodies.
do $migration$
declare
  definition text := pg_get_functiondef('public.execute_document_decision(uuid,uuid,jsonb)'::regprocedure);
  normalized text := replace(definition, chr(13) || chr(10), chr(10));
begin
  if normalized is distinct from definition then
    execute normalized;
  end if;
end;
$migration$;
