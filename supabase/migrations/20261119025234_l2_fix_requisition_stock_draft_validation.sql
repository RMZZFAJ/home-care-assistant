-- Remove keys from the nested object, after extracting it from the draft line.
do $migration$
declare
  definition text := pg_get_functiondef('private.validate_creation_draft(text,jsonb,uuid)'::regprocedure);
  previous_expression constant text := $expr$(x->'stockReference'-array['token','quantity'])$expr$;
begin
  if strpos(definition, previous_expression) = 0 then
    raise exception 'Missing requisition draft stock reference validation';
  end if;
  execute replace(definition, previous_expression, $expr$((x->'stockReference')-array['token','quantity'])$expr$);
end;
$migration$;
