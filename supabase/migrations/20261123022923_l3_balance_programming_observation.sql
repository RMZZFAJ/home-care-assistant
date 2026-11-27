begin;

alter table public.bal_regimes
  add column observation text check (char_length(observation) between 1 and 1000);

do $migration$
declare
  definition text;
  anchor text;
begin
  definition := pg_get_functiondef('public.balance_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
  anchor := $old$ if length(v_reason)<3 or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_body->>'timezone') then raise exception 'reason and valid timezone required';end if;$old$;
  if strpos(definition, anchor) = 0 then raise exception 'balance programming validation drift'; end if;
  definition := replace(definition, anchor, $new$
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=p_body->>'timezone') then
   raise exception 'valid balance timezone required' using errcode='22023';
 end if;
 if p_body ? 'observation' and (jsonb_typeof(p_body->'observation') is distinct from 'string'
    or char_length(p_body->>'observation')>1000) then
   raise exception 'invalid balance programming observation' using errcode='22023';
 end if;
 v_reason:=btrim(v_reason,E' \t\n\r');
 if p_body ? 'reason' and (jsonb_typeof(p_body->'reason') is distinct from 'string'
    or char_length(v_reason) not between 3 and 1000) then
   raise exception 'invalid balance programming reason' using errcode='22023';
 end if;
 if v_r.enabled and (p_body->>'enabled')::boolean=false and char_length(v_reason)<3 then
   raise exception 'balance pause reason required' using errcode='22023';
 end if;
 v_reason:=coalesce(nullif(v_reason,''),'Programação de balanços registrada');
$new$);
  anchor := $old$starts_on,activated_at,updated_by)
 values(p_patient,(p_body->>'enabled')::boolean,p_body->>'timezone',(p_body->>'weekday')::integer,(p_body->>'shiftTypeId')::uuid,(p_body->>'professionalId')::uuid,(p_body->>'startsOn')::date,case when (p_body->>'enabled')::boolean then now() end,auth.uid())$old$;
  if strpos(definition, anchor) = 0 then raise exception 'balance programming insert drift'; end if;
  definition := replace(definition, anchor, $new$starts_on,activated_at,updated_by,observation)
 values(p_patient,(p_body->>'enabled')::boolean,p_body->>'timezone',(p_body->>'weekday')::integer,(p_body->>'shiftTypeId')::uuid,(p_body->>'professionalId')::uuid,(p_body->>'startsOn')::date,case when (p_body->>'enabled')::boolean then now() end,auth.uid(),
 nullif(btrim(p_body->>'observation',E' \t\n\r'),''))$new$);
  anchor := $old$version=public.bal_regimes.version+1,updated_by=auth.uid(),updated_at=now() returning * into v_r;$old$;
  if strpos(definition, anchor) = 0 then raise exception 'balance programming update drift'; end if;
  execute replace(definition, anchor, $new$version=public.bal_regimes.version+1,updated_by=auth.uid(),updated_at=now(),
 observation=case when p_body ? 'observation' then excluded.observation else public.bal_regimes.observation end
 returning * into v_r;$new$);

  definition := pg_get_functiondef('public.execute_balance_decision(uuid,uuid,uuid,jsonb)'::regprocedure);
  anchor := $old$ fields:=jsonb_build_object('reason',b->>'reason');$old$;
  if strpos(definition, anchor) = 0 then raise exception 'balance programming receipt drift'; end if;
  execute replace(definition, anchor, $new$ fields:=jsonb_strip_nulls(jsonb_build_object('reason',b->>'reason'));
 if purpose='configure' and b ? 'observation' then
  fields:=fields||jsonb_build_object('observation',b->>'observation');
 end if;$new$);
end;
$migration$;

commit;
