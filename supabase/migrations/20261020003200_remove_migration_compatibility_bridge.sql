-- Runtime hash functions already declare public,extensions explicitly.
-- Remove only our bridge, preserving pgcrypto when it lives in public.
do $migration$
begin
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='digest' and p.oid=to_regprocedure('public.digest(text,text)')
      and obj_description(p.oid,'pg_proc')='HCA temporary migration digest bridge; removed by 032'
      and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')) then
    drop function public.digest(text,text);
  end if;
end;
$migration$;
