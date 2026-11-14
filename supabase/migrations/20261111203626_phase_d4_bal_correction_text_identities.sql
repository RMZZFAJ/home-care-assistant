-- Catalogue product identities are text (including patient-prefixed IDs),
-- never necessarily UUIDs. Compare their exact frozen identity, not their label.
do $$declare definition text;needle text;begin
 definition:=pg_get_functiondef('private.bal_correction_facts(uuid,integer)'::regprocedure);
 needle:=$old$where coalesce(line->>'product_id','')~*'^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'$old$;
 if position(needle in definition)=0 then raise exception 'BAL target identity contract drift';end if;
 definition:=replace(definition,needle,$new$where jsonb_typeof(line->'product_id')='string' and nullif(line->>'product_id','') is not null$new$);
 needle:=$old$if source_line is null or coalesce(source_line->>'product_id','')!~*'^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then$old$;
 if position(needle in definition)=0 then raise exception 'BAL source identity contract drift';end if;
 definition:=replace(definition,needle,$new$if source_line is null or jsonb_typeof(source_line->'product_id') is distinct from 'string' or nullif(source_line->>'product_id','') is null then$new$);
 execute definition;
end;$$;
