-- An intentional CAS or reference rejection must reach PostgREST as a
-- deterministic conflict, rather than a retryable serialization failure.
do $$
declare
  v_definition text := pg_get_functiondef('public.catalogue_preparation_command(uuid,text,text,text,text,uuid,uuid,integer,jsonb,text)'::regprocedure);
  v_message text;
  v_old text;
begin
  foreach v_message in array array['stale catalogue preparation revision', 'stale catalogue preparation reference'] loop
    v_old := format('raise exception %L using errcode = ''40001'';', v_message);
    if length(v_definition) - length(replace(v_definition, v_old, '')) <> length(v_old) then
      raise exception 'unexpected catalogue preparation conflict definition';
    end if;
    v_definition := replace(v_definition, v_old, format('raise exception %L using errcode = ''PT409'';', v_message));
  end loop;
  execute v_definition;
end;
$$;

-- The established adoption endpoint calls upsert, which takes the patient
-- stock lock before the catalogue lock. Preserve that order at both entrypoints.
do $$
declare
  v_definition text := replace(pg_get_functiondef('private.adopt_catalogue_model(uuid,text)'::regprocedure), E'\r\n', E'\n');
  v_lock text := '  perform pg_advisory_xact_lock(hashtextextended(''catalogue:'' || p_patient, 0));';
begin
  if length(v_definition) - length(replace(v_definition, v_lock, '')) <> length(v_lock) then
    raise exception 'unexpected catalogue adoption lock definition';
  end if;
  execute replace(v_definition, v_lock,
    '  perform pg_advisory_xact_lock(hashtextextended(''stock:'' || p_patient, 0));' || E'\n' ||
    v_lock || E'\n' || '  perform private.require_cap(p_patient, ''catalog.manage'');');
end;
$$;
