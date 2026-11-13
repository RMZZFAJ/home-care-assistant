begin;
-- Preserve the already-applied local introduction while closing SQL NULL input semantics.
do $$
declare definition text:=pg_get_functiondef('public.prepare_web_push_test(uuid,uuid,uuid,text)'::regprocedure);
 needle text:='if p_token is null then raise exception ''invalid push test token'';end if;';
begin
 if position(needle in definition)=0 then raise exception 'push test input guard source differs';end if;
 execute replace(definition,needle,'if p_token is null or coalesce(p_key_version,'''') !~ ''^[A-Za-z0-9_.-]{1,80}$'' then raise exception ''invalid push test token'';end if;');
end;$$;
commit;
