set local search_path=public;
do $$begin
  if encode(digest('abc'::text,'sha256'),'hex')<>'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' then
    raise exception 'migration bridge changed canonical hash';
  end if;
  if obj_description('public.digest(text,text)'::regprocedure,'pg_proc')='HCA temporary migration digest bridge; removed by 032'
    and has_function_privilege('authenticated','public.digest(text,text)','EXECUTE') then
    raise exception 'migration-only bridge is exposed to clients';
  end if;
end;$$;
select 'hosted migration search_path regression passed';
