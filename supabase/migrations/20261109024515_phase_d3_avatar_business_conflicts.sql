-- A deterministic business conflict must not use serialization_failure (40001),
-- which PostgREST 14 retries as a transient transaction failure.
do $migration$
declare target regprocedure; src text;
begin
 foreach target in array array[
  'public.begin_my_avatar_change(uuid,text,integer,text,integer)'::regprocedure,
  'public.prepare_avatar_change(uuid,text,integer)'::regprocedure,
  'public.verify_avatar_change(uuid,text,integer,uuid)'::regprocedure,
  'public.finish_my_avatar_change(uuid)'::regprocedure,
  'public.abandon_my_avatar_change(uuid)'::regprocedure
 ] loop
  src:=pg_get_functiondef(target);
  if position('errcode=''40001''' in src)=0 then raise exception 'Avatar conflict guard drift: %',target;end if;
  execute replace(src,'errcode=''40001''','errcode=''P0001''');
 end loop;
end;
$migration$;
notify pgrst,'reload schema';
