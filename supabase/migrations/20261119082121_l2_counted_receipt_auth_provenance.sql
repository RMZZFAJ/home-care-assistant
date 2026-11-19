-- The enclosing receipt command writes provenance before invoking validation.
-- Preserve that trusted label in the event and keep the existing provider path.
do $migration$
declare
  definition text := pg_get_functiondef('private.validate_counted_receipt(public.operational_documents,jsonb)'::regprocedure);
  anchor text := $old$or p_body - 'countedReceipt' <> '{}'::jsonb then$old$;
begin
  if strpos(definition, anchor) = 0 then raise exception 'counted receipt provenance anchor missing'; end if;
  execute replace(definition, anchor, $new$or p_body->>'securityLevel' is distinct from 'authenticated_session'
    or p_body - array['countedReceipt','securityLevel'] <> '{}'::jsonb then$new$);
end;
$migration$;
