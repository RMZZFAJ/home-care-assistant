begin;
do $$begin
 if exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
 where n.nspname in ('public','private') and p.prokind='f' and p.prosrc~*'using[[:space:]]+errcode[[:space:]]*=[[:space:]]*''40001''') then
 raise exception 'Deliberate business conflicts must not request automatic serialization retries';end if;
end;$$;
select 'passed: explicit business conflicts do not request serialization retries';
rollback;
