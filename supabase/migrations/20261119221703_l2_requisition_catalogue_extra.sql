-- A catalogue extra is still a single addressed requisition line. Its
-- presentation and identifying details do not affect stock or fulfilment.
alter table public.requisition_items add column catalogue_extra jsonb
  check (catalogue_extra is null or (product_id is not null and jsonb_typeof(catalogue_extra) = 'object'));

create function private.validate_req_catalogue_extra(p_extra jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare details text;
begin
  if jsonb_typeof(p_extra) is distinct from 'object'
    or (p_extra - 'details') <> '{}'::jsonb
    or (p_extra ? 'details' and jsonb_typeof(p_extra->'details') is distinct from 'string')
  then
    raise exception 'invalid REQ catalogue extra' using errcode='22023';
  end if;
  details := regexp_replace(p_extra->>'details', '^[[:space:]]+|[[:space:]]+$', '', 'g');
  if private.bal_comment_units(details) > 400 then
    raise exception 'invalid REQ catalogue extra details' using errcode='22023';
  end if;
  return case when coalesce(details,'') = '' then '{}'::jsonb else jsonb_build_object('details',details) end;
end;
$$;

revoke all on function private.validate_req_catalogue_extra(jsonb) from public, anon, authenticated;

do $migration$
declare definition text; anchor text;
begin
  definition := pg_get_functiondef('private.validate_creation_draft(text,jsonb,uuid)'::regprocedure);
  anchor := $old$'productId','productName','category','unit','currentStock','stockObservation','stockObservationAt','urgent','repeatReason','stockReference'$old$;
  if strpos(definition, anchor) = 0 then raise exception 'REQ catalogue extra draft fields anchor missing'; end if;
  definition := replace(definition, anchor, anchor || ',''catalogueExtra''');
  anchor := $old$raise exception 'invalid REQ draft line' using errcode='22023';end if;$old$;
  if strpos(definition, anchor) = 0 then raise exception 'REQ catalogue extra draft validation anchor missing'; end if;
  execute replace(definition, anchor, anchor || $new$
   if x ? 'catalogueExtra' then perform private.validate_req_catalogue_extra(x->'catalogueExtra'); end if;$new$);

  definition := pg_get_functiondef('public.commit_creation_draft(uuid,integer,uuid,jsonb,uuid)'::regprocedure);
  anchor := $old$'productId','currentStock','stockObservation','stockObservationAt','urgent','repeatReason','stockReference'$old$;
  if strpos(definition, anchor) = 0 then raise exception 'REQ catalogue extra confirmation fields anchor missing'; end if;
  definition := replace(definition, anchor, anchor || ',''catalogueExtra''');
  anchor := $old$  extra:=p_body->'remainingNeed';$old$;
  if strpos(definition, anchor) = 0 then raise exception 'REQ catalogue extra revision anchor missing'; end if;
  execute replace(definition, anchor, $new$
  if array(
    select jsonb_build_array(line->>'productId',private.validate_req_catalogue_extra(line->'catalogueExtra'))
    from jsonb_array_elements(d.content->'lines') line where line ? 'catalogueExtra' order by line->>'productId'
  ) is distinct from array(
    select jsonb_build_array(line->>'productId',private.validate_req_catalogue_extra(line->'catalogueExtra'))
    from jsonb_array_elements(p_body->'lines') line where line ? 'catalogueExtra' order by line->>'productId'
  ) then raise exception 'stale private draft revision' using errcode='PT409'; end if;
$new$ || anchor);

  definition := pg_get_functiondef('private.submit_requisition_core(uuid,uuid,text,jsonb,jsonb,jsonb,uuid,integer,text)'::regprocedure);
  anchor := $old$'productId','currentStock','stockObservation','stockObservationAt','urgent','repeatReason','stockReference'$old$;
  if strpos(definition, anchor) = 0 then raise exception 'REQ catalogue extra remaining need fields anchor missing'; end if;
  definition := replace(definition, anchor, anchor || ',''catalogueExtra''');
  anchor := $old$case when z ? 'stockReference' then jsonb_build_object('stockReference',z->'stockReference') else '{}'::jsonb end$old$;
  if strpos(definition, anchor) = 0 then raise exception 'REQ catalogue extra intent anchor missing'; end if;
  definition := replace(definition, anchor, anchor || $new$
    || case when z ? 'catalogueExtra' then jsonb_build_object('catalogueExtra',private.validate_req_catalogue_extra(z->'catalogueExtra')) else '{}'::jsonb end$new$);
  anchor := $old$insert into public.requisition_items(requisition_id,product_id,current_stock,stock_observation,stock_observation_at,stock_observation_time_source,urgent,product_name_snapshot,category_snapshot,unit_snapshot,snapshot_source)$old$;
  if strpos(definition, anchor) = 0 then raise exception 'REQ catalogue extra insert columns anchor missing'; end if;
  definition := replace(definition, anchor, replace(anchor, 'snapshot_source)', 'snapshot_source,catalogue_extra)'));
  anchor := $old$c.name,c.category::text,c.unit,'persisted' from jsonb_array_elements(p_lines) z$old$;
  if strpos(definition, anchor) = 0 then raise exception 'REQ catalogue extra insert values anchor missing'; end if;
  execute replace(definition, anchor, $new$c.name,c.category::text,c.unit,'persisted',
    case when z ? 'catalogueExtra' then private.validate_req_catalogue_extra(z->'catalogueExtra') end
    from jsonb_array_elements(p_lines) z$new$);
end;
$migration$;
