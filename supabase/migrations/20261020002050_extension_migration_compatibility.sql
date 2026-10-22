-- Hosted login roles can omit `extensions` from their session search_path.
-- Preserve the already-tested/applied 021 file while bridging its top-level hash.
do $migration$
declare v_schema text;
begin
  if to_regprocedure('public.digest(text,text)') is null then
    select n.nspname into v_schema from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto';
    if v_schema is null then raise exception 'pgcrypto must be installed before the transaction migration';end if;
    execute format('create function public.digest(text,text) returns bytea language sql immutable strict parallel safe set search_path=pg_catalog as $bridge$ select %I.digest($1,$2) $bridge$',v_schema);
    comment on function public.digest(text,text) is 'HCA temporary migration digest bridge; removed by 032';
    revoke all on function public.digest(text,text) from public,anon,authenticated;
  end if;
end;
$migration$;
