-- Preserve the applied preparation migration and qualify the slot predicate
-- against its table, independently of the PL/pgSQL result-state variable.
do $$
declare
  definition text:=pg_get_functiondef('public.administrative_preparation_command(uuid,text,text,uuid,text,uuid,uuid,integer,jsonb,text)'::regprocedure);
  old_predicate text:='and subject_id is not distinct from p_subject and state in (''active'',''consumed'') for update;';
begin
  if length(definition)-length(replace(definition,old_predicate,''))<>length(old_predicate) then
    raise exception 'unexpected administrative slot definition';
  end if;
  execute replace(definition,old_predicate,
    'and subject_id is not distinct from p_subject and administrative_preparations.state in (''active'',''consumed'') for update;');
end;
$$;
