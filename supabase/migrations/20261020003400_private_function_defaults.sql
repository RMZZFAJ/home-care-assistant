-- PostgreSQL adds per-schema defaults to global defaults. A schema-level
-- REVOKE cannot remove the built-in PUBLIC EXECUTE grant for future functions.
-- Only future functions created by the application migration owner are affected.
alter default privileges for role postgres revoke execute on functions from public;

-- Preserve all explicit anon/authenticated/service grants and extension ACLs.
-- In particular, trigger functions need no caller EXECUTE grant at invocation.
do $$declare f record;begin
  for f in select p.oid::regprocedure signature from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
      and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')
  loop execute format('revoke all privileges on function %s from public',f.signature);end loop;
end;$$;
