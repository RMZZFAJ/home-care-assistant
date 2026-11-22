-- Only new acts carry numbered observations. Legacy notes and issued bytes remain intact.
create function private.normalized_issuance_observations(p_items jsonb, p_preparing boolean)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare item jsonb; observation text; normalized jsonb := '[]'::jsonb;
begin
  if p_items is null then return null; end if;
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'issuance observations must be an array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'too many issuance observations' using errcode = '22023';
  end if;
  for item in select value from jsonb_array_elements(p_items) loop
    observation := btrim(item#>>'{}', U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
    if jsonb_typeof(item) <> 'string'
      or private.bal_comment_units(case when p_preparing then item#>>'{}' else observation end) > 1000
      or (not p_preparing and observation = '') then
      raise exception 'invalid issuance observation' using errcode = '22023';
    end if;
    normalized := normalized || jsonb_build_array(observation);
  end loop;
  return normalized;
end;
$$;

create function private.require_issuance_observations(p_saved jsonb, p_confirmed jsonb)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if private.normalized_issuance_observations(p_saved, false)
    is distinct from private.normalized_issuance_observations(p_confirmed, false) then
    raise exception 'issuance observations differ from the private draft' using errcode = '22023';
  end if;
end;
$$;

revoke all on function private.normalized_issuance_observations(jsonb,boolean),
  private.require_issuance_observations(jsonb,jsonb) from public, anon, authenticated, service_role;

do $migration$
declare definition text; anchor text; target regprocedure;
begin
  definition := pg_get_functiondef('private.validate_supply_draft(jsonb,text,uuid)'::regprocedure);
  anchor := $old$if (p_content-array['documentVersion','fields','divergentIds','materials'])<>'{}'::jsonb$old$;
  if strpos(definition, anchor) = 0 then raise exception 'transfer draft fields anchor missing'; end if;
  definition := replace(definition, anchor, $new$
  if p_content ? 'observations' then
    if p_purpose not in ('transfer_declare_family','transfer_declare_team') then
      raise exception 'only transfer declarations have original observations here' using errcode = '22023';
    end if;
    perform private.normalized_issuance_observations(p_content->'observations', true);
  end if;
  if (p_content-array['documentVersion','fields','divergentIds','materials','observations'])<>'{}'::jsonb$new$);
  anchor := $old$'requestFulfillments','extraProductIds'])$old$;
  if strpos(definition, anchor) = 0 then raise exception 'supply draft fields anchor missing'; end if;
  definition := replace(definition, anchor, $new$'requestFulfillments','extraProductIds','observations'])$new$);
  anchor := $old$  if f ? 'extraProductIds' then$old$;
  if strpos(definition, anchor) = 0 then raise exception 'supply draft validation anchor missing'; end if;
  execute replace(definition, anchor, $new$  perform private.normalized_issuance_observations(f->'observations', true);
$new$ || anchor);

  foreach target in array array['public.v3_create_supply_document(uuid,text,jsonb,uuid,boolean)'::regprocedure,
    'public.v3_revise_supply_document(uuid,jsonb,uuid,integer,boolean)'::regprocedure] loop
    definition := pg_get_functiondef(target);
    anchor := $old$ p_payload:=private.supply_source_payload(p_payload);$old$;
    if strpos(definition, anchor) = 0 then raise exception 'supply issue payload anchor missing for %', target; end if;
    execute replace(definition, anchor, anchor || $new$
 if p_payload ? 'observations' then
   if p_type not in ('COM','ENT') then raise exception 'invalid document type for issuance observations' using errcode = '22023'; end if;
   p_payload := jsonb_set(p_payload, '{observations}', private.normalized_issuance_observations(p_payload->'observations', false));
 end if;$new$);
  end loop;

  definition := pg_get_functiondef('public.commit_supply_draft(uuid,integer,uuid,jsonb,uuid)'::regprocedure);
  anchor := $old$  perform private.require_supply_catalogue_extras(d.content,p_body->'payload');$old$;
  if strpos(definition, anchor) = 0 then raise exception 'supply review confirmation anchor missing'; end if;
  definition := replace(definition, anchor, anchor || $new$
  perform private.require_issuance_observations(d.content#>'{form,observations}',p_body#>'{payload,observations}');$new$);
  anchor := $old$  outcome:=public.create_transfer_declaration(d.care_recipient_id,$old$;
  if strpos(definition, anchor) = 0 then raise exception 'transfer review confirmation anchor missing'; end if;
  execute replace(definition, anchor, $new$  perform private.require_issuance_observations(d.content->'observations',p_body#>'{body,observations}');
$new$ || anchor);

  definition := pg_get_functiondef('public.create_transfer_declaration(uuid,jsonb,uuid)'::regprocedure);
  anchor := $old$'reason','lines','mode'))$old$;
  if strpos(definition, anchor) = 0 then raise exception 'transfer issue fields anchor missing'; end if;
  definition := replace(definition, anchor, $new$'reason','lines','mode','observations'))$new$);
  anchor := $old$   or jsonb_typeof(p_body->'reason') is distinct from 'string' or length(trim(p_body->>'reason'))<3 or private.bal_comment_units(p_body->>'reason')>1000$old$;
  if strpos(definition, anchor) = 0 then raise exception 'transfer issue reason anchor missing'; end if;
  definition := replace(definition, anchor, $new$   or (p_body ? 'observations' and not direct)
   or jsonb_typeof(p_body->'reason') is distinct from 'string' or private.bal_comment_units(p_body->>'reason')>1000
   or (length(trim(p_body->>'reason'))<3 and not (direct and p_body ? 'observations' and p_body->>'reason' = ''))$new$);
  anchor := $old$,'lines',p_body->'lines'),case when direct then 'draft' else 'transfer_pending' end)$old$;
  if strpos(definition, anchor) = 0 then raise exception 'transfer source payload anchor missing'; end if;
  execute replace(definition, anchor, $new$,'lines',p_body->'lines') || case when p_body ? 'observations' then
   jsonb_build_object('observations',private.normalized_issuance_observations(p_body->'observations',false)) else '{}'::jsonb end,
   case when direct then 'draft' else 'transfer_pending' end)$new$);
end;
$migration$;
