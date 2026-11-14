-- Keep human-readable item identity in a private preparation. These labels
-- never authorize or enter the official opinion: bind them to its frozen line.
do $$declare definition text;needle text;begin
 definition:=replace(pg_get_functiondef('private.require_bal_document_draft_intent(uuid,text,jsonb,jsonb)'::regprocedure),E'\r\n',E'\n');
 needle:='declare fields jsonb:=p_content->''fields'';expected jsonb;items jsonb;';
 if position(needle in definition)=0 then raise exception 'unexpected BAL private opinion declaration';end if;
 definition:=replace(definition,needle,needle||'field record;opinion jsonb;line public.document_lines;');
 needle:=$old$  select coalesce(jsonb_agg(jsonb_build_object('lineId',substr(key,6))||value::jsonb order by key),'[]'::jsonb)
   into items from jsonb_each_text(fields) where key like 'item:%';$old$;
 if position(needle in definition)=0 then raise exception 'unexpected BAL private item projection';end if;
 definition:=replace(definition,needle,$new$
  items:='[]'::jsonb;
  for field in select key,value from jsonb_each_text(fields) where key like 'item:%' order by key loop
   opinion:=field.value::jsonb;
   if jsonb_typeof(opinion) is distinct from 'object'
    or (opinion-array['result','forwarding','comment','materialName','unit'])<>'{}'::jsonb then
    raise exception 'invalid private balance item opinion' using errcode='22023';end if;
   select * into line from public.document_lines where document_id=p_id and id::text=substr(field.key,6);
   if not found then raise exception 'private balance item belongs to another count' using errcode='22023';end if;
   if (opinion ? 'materialName' and opinion->'materialName' is distinct from to_jsonb(line.name_snapshot))
    or (opinion ? 'unit' and opinion->'unit' is distinct from to_jsonb(line.unit_snapshot)) then
    raise exception 'private balance item labels differ from frozen count' using errcode='22023';end if;
   items:=items||jsonb_build_array(jsonb_build_object('lineId',line.id)||(opinion-array['materialName','unit']));
  end loop;
$new$);
 execute definition;
end;$$;
