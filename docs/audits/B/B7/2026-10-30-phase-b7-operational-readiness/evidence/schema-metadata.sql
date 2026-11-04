begin read only;
set local statement_timeout = '15s';
select jsonb_build_object(
  'database_version', current_setting('server_version'),
  'statement_timeout', current_setting('statement_timeout'),
  'lock_timeout', current_setting('lock_timeout'),
  'migrations', (select jsonb_build_object('count',count(*),'latest',max(version),'versions',jsonb_agg(version order by version)) from supabase_migrations.schema_migrations),
  'extensions', (select jsonb_agg(x order by name) from(select extname name,extversion version from pg_extension where extname in('pg_cron','pg_net','supabase_vault','pgcrypto','btree_gist'))x),
  'routines', (select jsonb_agg(x order by schema,name,signature) from(select n.nspname schema,p.proname name,pg_get_function_identity_arguments(p.oid) signature,md5(pg_get_functiondef(p.oid)) definition_md5,md5(replace(pg_get_functiondef(p.oid),chr(13)||chr(10),chr(10))) normalized_md5 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.prokind in('f','p'))x)
) metadata;
rollback;
