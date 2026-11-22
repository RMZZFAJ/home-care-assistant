begin;
-- A deliberate optimistic-version refusal is not a transient serialization
-- failure. PostgREST 14 can retry 40001 indefinitely, obscuring the refusal.
-- Keep 146 immutable and replace only its two explicit CAS branches.
do $$
declare definition text;needle text:='raise exception ''version conflict'' using errcode=''40001'';';
begin
 definition:=pg_get_functiondef('public.operations_command(text,text,uuid,integer,jsonb,uuid)'::regprocedure);
 if (length(definition)-length(replace(definition,needle,'')))/length(needle)<>2 then raise exception 'unexpected operations CAS baseline';end if;
 execute replace(definition,needle,'raise exception ''operations version conflict'' using errcode=''PT409'';');
end;$$;
notify pgrst,'reload schema';
commit;
