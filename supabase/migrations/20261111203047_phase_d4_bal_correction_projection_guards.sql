-- Qualify the aggregate columns against the PL/pgSQL acts variable and
-- index each recount's masked application lines once before expanding materials.
do $$declare definition text;needle text;begin
 definition:=pg_get_functiondef('private.bal_correction_facts(uuid,integer)'::regprocedure);
 needle:='select coalesce(jsonb_object_agg(product,acts),''{}''::jsonb) into by_product from grouped;';
 if position(needle in definition)=0 then raise exception 'BAL correction aggregate contract drift';end if;
 definition:=replace(definition,needle,'select coalesce(jsonb_object_agg(g.product,g.acts),''{}''::jsonb) into by_product from grouped g;');
 needle:=$old$ ), counted as (
  select c.*,l.line,coalesce((select jsonb_object_agg(a->>'lineId',a)
   from jsonb_array_elements(c.application->'lines') a),'{}'::jsonb) as application_lines
  from counts c cross join lateral jsonb_array_elements(c.body->'lines') l(line)
 ), grouped as ($old$;
 if position(needle in definition)=0 then raise exception 'BAL correction line map contract drift';end if;
 definition:=replace(definition,needle,$new$ ), mapped as materialized (
  select c.*,coalesce((select jsonb_object_agg(a->>'lineId',a)
   from jsonb_array_elements(c.application->'lines') a),'{}'::jsonb) as application_lines from counts c
 ), counted as (
  select m.*,l.line from mapped m cross join lateral jsonb_array_elements(m.body->'lines') l(line)
 ), grouped as ($new$);
 execute definition;
end;$$;
