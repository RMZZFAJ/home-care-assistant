-- An extra still uses the same catalogue identity, quantity and stock command.
-- Legacy drafts keep their stages and need no conversion.
create function private.require_supply_catalogue_extras(p_content jsonb, p_payload jsonb)
returns void language plpgsql set search_path = '' as $$
begin
  if array(
    select value from jsonb_array_elements_text(coalesce(p_content#>'{form,extraProductIds}', '[]'::jsonb)) order by value
  ) is distinct from array(
    select line->>'productId' from jsonb_array_elements(p_payload->'lines') line
    where line#>>'{metadata,catalogueExtra}' = 'true' order by line->>'productId'
  ) then
    raise exception 'catalogue extras differ from the private draft' using errcode = '22023';
  end if;
end;
$$;

-- Transfer drafts already record an extra flag per material. Include that
-- classification when committing a transfer, including an older client's draft.
create function private.transfer_with_catalogue_extras(p_content jsonb, p_body jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_set(p_body, '{lines}', (
    select jsonb_agg(case when p_content->'fields'->>(line->>'productId' || ':transferExtra') = '1'
      then line || '{"catalogueExtra":true}'::jsonb else line end order by position)
    from jsonb_array_elements(p_body->'lines') with ordinality as entry(line, position)
  ));
$$;

revoke all on function private.require_supply_catalogue_extras(jsonb,jsonb),
  private.transfer_with_catalogue_extras(jsonb,jsonb) from public, anon, authenticated, service_role;

do $migration$
declare
  definition text;
  anchor text;
begin
  definition := pg_get_functiondef('private.creation_draft_navigation_valid(jsonb,text,text,jsonb)'::regprocedure);
  anchor := $old$when p_kind in ('COM','ENT') then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','notes','review'])$old$;
  if strpos(definition, anchor) = 0 then raise exception 'supply navigation anchor missing'; end if;
  execute replace(definition, anchor, replace(anchor, $old$'notes','review'$old$, $new$'notes','review','extras'$new$));

  definition := pg_get_functiondef('private.validate_supply_draft(jsonb,text,uuid)'::regprocedure);
  anchor := $old$'manualQuantities','requestFulfillments'])$old$;
  if strpos(definition, anchor) = 0 then raise exception 'supply draft fields anchor missing'; end if;
  definition := replace(definition, anchor, $new$'manualQuantities','requestFulfillments','extraProductIds'])$new$);
  anchor := $old$  for k,v in select * from jsonb_each(f->'quantities') loop$old$;
  if strpos(definition, anchor) = 0 then raise exception 'supply draft quantity anchor missing'; end if;
  execute replace(definition, anchor, $new$
  if f ? 'extraProductIds' then
    if jsonb_typeof(f->'extraProductIds') is distinct from 'array' then
      raise exception 'invalid catalogue extras' using errcode = '22023';
    end if;
    if jsonb_array_length(f->'extraProductIds') > 1000
      or (select count(distinct extra) from jsonb_array_elements(f->'extraProductIds') extra)
        <> jsonb_array_length(f->'extraProductIds')
      or exists (
        select 1 from jsonb_array_elements(f->'extraProductIds') extra
        where not private.creation_draft_text(extra, 120) or length(extra#>>'{}') = 0
          or not (f->'quantities' ? (extra#>>'{}'))
      ) then
      raise exception 'invalid catalogue extra selection' using errcode = '22023';
    end if;
  end if;
$new$ || anchor);

  definition := pg_get_functiondef('public.commit_supply_draft(uuid,integer,uuid,jsonb,uuid)'::regprocedure);
  anchor := $old$  outcome:=public.create_supply_document(d.care_recipient_id,d.kind,p_body->'payload',p_key,false);$old$;
  if strpos(definition, anchor) = 0 then raise exception 'supply creation confirmation anchor missing'; end if;
  definition := replace(definition, anchor, $new$  perform private.require_supply_catalogue_extras(d.content,p_body->'payload');
$new$ || anchor);
  anchor := $old$  outcome:=public.revise_and_submit_supply_document(p_target,p_body->'payload',p_key,$old$;
  if strpos(definition, anchor) = 0 then raise exception 'supply revision confirmation anchor missing'; end if;
  definition := replace(definition, anchor, $new$  perform private.require_supply_catalogue_extras(d.content,p_body->'payload');
$new$ || anchor);
  anchor := $old$  outcome:=public.create_transfer_declaration(d.care_recipient_id,p_body->'body',p_key);$old$;
  if strpos(definition, anchor) = 0 then raise exception 'transfer confirmation anchor missing'; end if;
  execute replace(definition, anchor, $new$  outcome:=public.create_transfer_declaration(d.care_recipient_id,
    private.transfer_with_catalogue_extras(d.content,p_body->'body'),p_key);$new$);

  definition := pg_get_functiondef('public.create_transfer_declaration(uuid,jsonb,uuid)'::regprocedure);
  anchor := $old$k not in ('productId','quantity'))$old$;
  if strpos(definition, anchor) = 0 then raise exception 'transfer line validation anchor missing'; end if;
  definition := replace(definition, anchor, $new$k not in ('productId','quantity','catalogueExtra'))
     or (x ? 'catalogueExtra' and x->'catalogueExtra' is distinct from 'true'::jsonb)$new$);
  anchor := $old$jsonb_build_object('inactiveAtDeclaration',not p.is_active));$old$;
  if strpos(definition, anchor) = 0 then raise exception 'transfer line metadata anchor missing'; end if;
  execute replace(definition, anchor, $new$jsonb_build_object('inactiveAtDeclaration',not p.is_active)
    || case when x->'catalogueExtra' = 'true'::jsonb then '{"catalogueExtra":"true"}'::jsonb else '{}'::jsonb end);$new$);
end;
$migration$;
