begin read only;
select jsonb_build_object(
 'tables',(select jsonb_agg(jsonb_build_object('name',c.relname,'rls',c.relrowsecurity,'force',c.relforcerowsecurity) order by c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'),
 'policies',(select jsonb_agg(jsonb_build_object('table',tablename,'name',policyname,'command',cmd,'roles',roles,'using',qual,'check',with_check) order by tablename,policyname) from pg_policies where schemaname='public'),
 'functions',(select jsonb_agg(jsonb_build_object('name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),'definer',p.prosecdef,'settings',p.proconfig,'hash',md5(replace(pg_get_functiondef(p.oid),chr(13)||chr(10),chr(10)))) order by p.proname,pg_get_function_identity_arguments(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')),
 'constraints',(select jsonb_agg(jsonb_build_object('table',c.relname,'name',k.conname,'definition',pg_get_constraintdef(k.oid),'validated',k.convalidated) order by c.relname,k.conname) from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'),
 'indexes',(select jsonb_agg(jsonb_build_object('table',tablename,'name',indexname,'definition',indexdef) order by tablename,indexname) from pg_indexes where schemaname='public'),
 'client_grants',(select jsonb_agg(jsonb_build_object('table',table_name,'grantee',grantee,'privilege',privilege_type) order by table_name,grantee,privilege_type) from information_schema.table_privileges where table_schema='public' and grantee in ('anon','authenticated','PUBLIC')),
 'defaults',(select jsonb_agg(jsonb_build_object('creator',r.rolname,'schema',coalesce(n.nspname,'all'),'type',a.defaclobjtype,'acl',a.defaclacl::text) order by r.rolname,coalesce(n.nspname,'all'),a.defaclobjtype) from pg_default_acl a join pg_roles r on r.oid=a.defaclrole left join pg_namespace n on n.oid=a.defaclnamespace where r.rolname='postgres' and (n.nspname='public' or a.defaclnamespace=0)),
 'security',jsonb_build_object(
   'unvalidated',(select count(*) from pg_constraint k join pg_namespace n on n.oid=k.connamespace where n.nspname='public' and not k.convalidated),
   'client_dml',(select count(*) from information_schema.table_privileges where table_schema='public' and grantee in ('anon','authenticated','PUBLIC') and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER')),
   'anonymous_select',(select count(*) from information_schema.table_privileges where table_schema='public' and grantee='anon' and privilege_type='SELECT'),
   'unsafe_definer_search_path',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and not exists(select 1 from unnest(p.proconfig) c where c like 'search_path=%')),
   'unmatched_items',(select count(*) from public.requisition_items i left join public.care_recipient_products p on p.care_recipient_id=i.care_recipient_id and p.product_id=i.product_id where i.product_id is not null and p.product_id is null),
   'cross_parent_items',(select count(*) from public.requisition_items i join public.requisitions r on r.id=i.requisition_id where i.care_recipient_id<>r.care_recipient_id),
   'global_admin_count_consistent',(select active_count=(select count(*) from public.profiles where role='admin' and status='active' and global_scope) from public.global_admin_guard),
   'balance_view_options',(select reloptions from pg_class where oid='public.current_stock_balances'::regclass),
   'temporary_hash_bridge',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and obj_description(p.oid,'pg_proc')='HCA temporary migration digest bridge; removed by 032')
 )
) as metadata;
commit;
