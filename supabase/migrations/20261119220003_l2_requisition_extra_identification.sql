-- Keep the original identity proposed by the requester. Linking it to the
-- catalogue remains a separate authorized act and never counts stock here.
alter table public.requisition_items
  add column extra_details text
    check (extra_details is null or (
      product_id is null and char_length(extra_details) between 1 and 400
    ));

create function private.validate_req_extra_identification(p_identity jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare details text;
begin
  if jsonb_typeof(p_identity) is distinct from 'object'
    or (p_identity-array['category','unit','details']) <> '{}'::jsonb
    or coalesce(p_identity->>'category','') not in ('medicamentos','higiene','dieta')
    or coalesce(p_identity->>'unit','') not in ('unidade','pacote','frasco','tubo','comprimido','par','caixa')
    or (p_identity ? 'details' and jsonb_typeof(p_identity->'details') is distinct from 'string')
  then
    raise exception 'invalid REQ extra identification' using errcode='22023';
  end if;
  details := regexp_replace(p_identity->>'details', '^[[:space:]]+|[[:space:]]+$', '', 'g');
  if char_length(details) > 400 then
    raise exception 'invalid REQ extra identification details' using errcode='22023';
  end if;
  return jsonb_build_object('category',p_identity->>'category','unit',p_identity->>'unit')
    || case when coalesce(details,'') = '' then '{}'::jsonb else jsonb_build_object('details',details) end;
end;
$$;

revoke all on function private.validate_req_extra_identification(jsonb) from public, anon, authenticated;

do $migration$
declare definition text; updated text; anchor text;
begin
  definition := pg_get_functiondef('private.validate_creation_draft(text,jsonb,uuid)'::regprocedure);
  anchor := $old$'id','name','currentStock','stockObservation','stockObservationAt','urgent'$old$;
  if strpos(definition, anchor) = 0 then raise exception 'REQ extra draft fields anchor missing'; end if;
  updated := replace(definition, anchor, anchor || ',''identification''');
  anchor := $old$raise exception 'invalid REQ draft extra' using errcode='22023';end if;$old$;
  if strpos(updated, anchor) = 0 then raise exception 'REQ extra draft validation anchor missing'; end if;
  execute replace(updated, anchor, anchor || $new$
   if x ? 'identification' then perform private.validate_req_extra_identification(x->'identification'); end if;$new$);

  definition := pg_get_functiondef('public.commit_creation_draft(uuid,integer,uuid,jsonb,uuid)'::regprocedure);
  anchor := $old$'customName','currentStock','stockObservation','stockObservationAt','urgent'$old$;
  if strpos(definition, anchor) = 0 then raise exception 'REQ extra confirmation fields anchor missing'; end if;
  updated := replace(definition, anchor, anchor || ',''identification''');
  anchor := $old$  extra:=p_body->'remainingNeed';$old$;
  if strpos(updated, anchor) = 0 then raise exception 'REQ extra confirmation anchor missing'; end if;
  execute replace(updated, anchor, $new$
  if array(
    select pair from jsonb_array_elements(d.content->'extraItems') saved
    cross join lateral jsonb_build_array(trim(saved->>'name'), private.validate_req_extra_identification(saved->'identification')) pair
    where saved ? 'identification' order by pair
  ) is distinct from array(
    select pair from jsonb_array_elements(p_body->'extraItems') confirmed
    cross join lateral jsonb_build_array(trim(confirmed->>'customName'), private.validate_req_extra_identification(confirmed->'identification')) pair
    where confirmed ? 'identification' order by pair
  ) then raise exception 'stale private draft revision' using errcode='PT409'; end if;
$new$ || anchor);

  definition := pg_get_functiondef('private.submit_requisition_core(uuid,uuid,text,jsonb,jsonb,jsonb,uuid,integer,text)'::regprocedure);
  anchor := $old$'customName','currentStock','stockObservation','stockObservationAt','urgent'$old$;
  if strpos(definition, anchor) = 0 then raise exception 'REQ extra remaining need fields anchor missing'; end if;
  updated := replace(definition, anchor, anchor || ',''identification''');
  anchor := $old$'urgent',(z->>'urgent')::boolean) order by trim(z->>'customName'),(z->>'currentStock')::numeric,(z->>'urgent')::boolean,private.requisition_stock_observation(z),private.requisition_observation_time(z)$old$;
  if strpos(updated, anchor) = 0 then raise exception 'REQ extra canonical intent anchor missing'; end if;
  updated := replace(updated, anchor, $new$'urgent',(z->>'urgent')::boolean)
    || case when z ? 'identification' then jsonb_build_object('identification',private.validate_req_extra_identification(z->'identification')) else '{}'::jsonb end
    order by trim(z->>'customName'),(z->>'currentStock')::numeric,(z->>'urgent')::boolean,private.requisition_stock_observation(z),private.requisition_observation_time(z),z->'identification'$new$);
  anchor := $old$insert into public.requisition_items(requisition_id,custom_name,current_stock,stock_observation,stock_observation_at,stock_observation_time_source,urgent,product_name_snapshot,snapshot_source)$old$;
  if strpos(updated, anchor) = 0 then raise exception 'REQ extra insert columns anchor missing'; end if;
  updated := replace(updated, anchor, $new$insert into public.requisition_items(requisition_id,custom_name,current_stock,stock_observation,stock_observation_at,stock_observation_time_source,urgent,product_name_snapshot,snapshot_source,category_snapshot,unit_snapshot,extra_details)$new$);
  anchor := $old$trim(z->>'customName'),'persisted' from jsonb_array_elements(p_extra_items) z;$old$;
  if strpos(updated, anchor) = 0 then raise exception 'REQ extra insert values anchor missing'; end if;
  execute replace(updated, anchor, $new$trim(z->>'customName'),'persisted',
    z#>>'{identification,category}',z#>>'{identification,unit}',
    case when z ? 'identification' then private.validate_req_extra_identification(z->'identification')->>'details' end
    from jsonb_array_elements(p_extra_items) z;$new$);
end;
$migration$;
