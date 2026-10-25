-- SQLSTATE 40001 is reserved for genuine serialization failures. PostgREST
-- versions may automatically retry that state, so deliberate business conflicts
-- must use a non-retryable exception while preserving the safe API message map.
-- https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions
do $$declare v_fn record;v_def text;v_pattern text:='using[[:space:]]+errcode[[:space:]]*=[[:space:]]*''40001''';begin
 for v_fn in select p.oid from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
 where n.nspname in ('public','private') and p.prokind='f' and p.prosrc~*v_pattern loop
 v_def:=pg_get_functiondef(v_fn.oid);
 execute regexp_replace(v_def,v_pattern,'using errcode=''P0001''','gi');
 end loop;
end;$$;
