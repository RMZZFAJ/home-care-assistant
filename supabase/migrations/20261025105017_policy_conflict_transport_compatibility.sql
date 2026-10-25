-- Preserve the V4 public HTTP conflict contract after deliberate conflicts
-- stopped using the PostgreSQL serialization-retry SQLSTATE.
do $$
declare definition text;
begin
 definition := pg_get_functiondef('public.configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text)'::regprocedure);
 if position('exception when sqlstate ''40001'' then' in definition) = 0 then
  raise exception 'Expected policy conflict handler not found';
 end if;
 execute replace(definition, 'exception when sqlstate ''40001'' then', 'exception when sqlstate ''P0001'' then');
end;
$$;
