-- Unknown historical origin remains unknown. New official issuance is explicit.
create function private.require_purchase_origin(p_payload jsonb) returns void
language plpgsql immutable set search_path='' as $$begin
 if jsonb_typeof(p_payload->'origin') is distinct from 'string' or p_payload->>'origin' not in ('purchase','donation') then
  raise exception 'purchase origin required' using errcode='22023';
 end if;
end;$$;
revoke all on function private.require_purchase_origin(jsonb) from public,anon,authenticated,service_role;

do $migration$
declare definition text;anchor text;begin
 definition:=pg_get_functiondef('public.v3_create_supply_document(uuid,text,jsonb,uuid,boolean)'::regprocedure);
 anchor:=E' if not p_draft then\n perform private.emit_document(d.id);';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'purchase origin create anchor mismatch';end if;
 execute replace(definition,anchor,E' if not p_draft then\n if p_type=''COM'' then perform private.require_purchase_origin(p_payload);end if;\n perform private.emit_document(d.id);');
 definition:=pg_get_functiondef('public.audited_legacy_supply_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
 anchor:='perform private.emit_document(p_id);';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'purchase origin submit anchor mismatch';end if;
 execute replace(definition,anchor,E'if d.type=''COM'' then perform private.require_purchase_origin(d.payload);end if;\n '||anchor);
end;$migration$;
