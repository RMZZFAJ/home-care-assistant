begin;

-- Carry the identity chosen by the counted catalogue lines into the new
-- version. Later catalogue changes cannot affect an earlier recount.
create function private.balance_extra_catalogue_links(
  p_patient uuid, p_previous jsonb, p_payload jsonb, p_workflow jsonb
) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  links jsonb := coalesce(p_workflow->'balanceExtraCatalogueLinks', '{}'::jsonb);
  extra jsonb;
  retained jsonb;
  product text;
  matches bigint;
begin
  if exists (
    select 1 from jsonb_array_elements(coalesce(p_payload->'balanceExtras', '[]')) x
    where links ? (x->>'id')
  ) then
    raise exception 'incorporated BAL extra cannot be reused' using errcode = '22023';
  end if;

  for extra in select value from jsonb_array_elements(coalesce(p_previous->'balanceExtras', '[]')) loop
    select value into retained from jsonb_array_elements(coalesce(p_payload->'balanceExtras', '[]'))
      where value->>'id' = extra->>'id';
    if found then
      if (retained - 'quantity') is distinct from (extra - 'quantity') then
        raise exception 'previous BAL extra identity changed' using errcode = '22023';
      end if;
      continue;
    end if;

    select count(distinct match), min(match) into matches, product
      from private.balance_catalogue_matches(p_patient, extra->>'name') match
      where exists (select 1 from jsonb_array_elements(p_payload->'lines') line where line->>'productId' = match);
    if matches = 1 then
      links := links || jsonb_build_object(extra->>'id', product);
    end if;
  end loop;

  return case when links = '{}'::jsonb then links
    else jsonb_build_object('balanceExtraCatalogueLinks', links) end;
end;
$$;

revoke all on function private.balance_extra_catalogue_links(uuid,jsonb,jsonb,jsonb)
  from public,anon,authenticated,service_role;

do $migration$
declare
  definition text := pg_get_functiondef('public.v3_revise_supply_document(uuid,jsonb,uuid,integer,boolean)'::regprocedure);
  anchor text := $old$workflow_data=case when type='BAL' then workflow_data||jsonb_build_object('referenceRevision'$old$;
begin
  if strpos(definition, anchor) = 0 then raise exception 'BAL recount identity contract drift'; end if;
  execute replace(definition, anchor, $new$workflow_data=case when type='BAL' then workflow_data
   || case when p_recount and (d.status <> 'draft' or p_payload#>>'{balanceContext,kind}' is not distinct from 'recount')
      then private.balance_extra_catalogue_links(p_patient,d.payload,p_payload,d.workflow_data)
      else '{}'::jsonb end
   || jsonb_build_object('referenceRevision'$new$);
end;
$migration$;

create or replace function private.bal_correction_facts(p_id uuid, p_version integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  d public.operational_documents;
  e public.document_events;
  by_identity jsonb;
  review jsonb;
  item jsonb;
  identity text;
  acts jsonb;
  result jsonb := '[]'::jsonb;
begin
  select * into strict d from public.operational_documents where id = p_id and type = 'BAL';
  if not private.has_pdf_notification_authority(p_id) and not private.has_initial_pdf_authority(p_id) then
    perform private.require_cap(d.care_recipient_id, 'bal.read');
  end if;
  select * into e from public.document_events where document_id = p_id and version = p_version;
  if not found then return result; end if;

  with counts as materialized (
    select x.id, x.version, x.actor_id, x.actor_name, x.created_at, x.body,
      (x.body#>>'{workflow,countVersion}')::integer as count_no,
      private.bal_application_facts(p_id, (x.body#>>'{workflow,countVersion}')::integer, p_version,
        exists(select 1 from public.document_events applied
          where applied.document_id = p_id and applied.version <= p_version
            and applied.body#>>'{workflow,countVersion}' = x.body#>>'{workflow,countVersion}'
            and nullif(applied.body#>>'{workflow,appliedAt}', '') is not null)) as application
    from public.document_events x
    where x.document_id = p_id and x.version <= p_version and x.action = 'bal.recount'
      and coalesce(x.body#>>'{workflow,countVersion}', '') ~ '^[1-9][0-9]{0,8}$'
  ), mapped as materialized (
    select c.*, coalesce((select jsonb_object_agg(a->>'lineId', a)
      from jsonb_array_elements(c.application->'lines') a), '{}'::jsonb) as application_lines
    from counts c
  ), catalogue as materialized (
    select m.id, m.version, m.actor_id, m.actor_name, m.created_at, m.count_no,
      m.body#>'{workflow,balanceExtraCatalogueLinks}' as extra_links,
      l->>'product_id' as product,
      jsonb_build_object('id',l->'id','name',l->'name_snapshot','unit',l->'unit_snapshot','quantity',l->>'quantity') as line,
      case when m.application->>'state' <> 'applied' then m.application
        when m.application_lines ? (l->>'id') then (m.application-'lines') ||
          jsonb_build_object('lines',jsonb_build_array(m.application_lines->(l->>'id')))
        else jsonb_build_object('state','unavailable','lines','[]'::jsonb) end as application
    from mapped m
    cross join lateral jsonb_array_elements(m.body->'lines') l
    where jsonb_typeof(l->'product_id') = 'string' and nullif(l->>'product_id', '') is not null
  ), indexed as (
    select 'product:' || c.product as lookup_key, c.id, c.version, c.actor_id, c.actor_name, c.created_at, c.count_no, c.line, c.application
    from catalogue c
    union all
    select 'extra:' || link.key, c.id, c.version, c.actor_id, c.actor_name, c.created_at, c.count_no, c.line, c.application
    from catalogue c
    cross join lateral jsonb_each_text(coalesce(c.extra_links, '{}'::jsonb)) link
    where link.value = c.product
    union all
    select 'extra:' || (x->>'id'), c.id, c.version, c.actor_id, c.actor_name, c.created_at, c.count_no,
      x,
      jsonb_build_object('state','not_applied','lines','[]'::jsonb)
    from counts c
    cross join lateral jsonb_array_elements(coalesce(c.body#>'{payload,balanceExtras}', '[]')) x
  ), grouped as (
    select i.lookup_key, jsonb_agg(jsonb_build_object(
      'eventId',i.id,'documentId',p_id,'version',i.version,'countVersion',i.count_no,
      'actorId',i.actor_id,'actorName',nullif(i.actor_name,''),'recordedAt',i.created_at,
      'line',i.line,'application',i.application
    ) order by i.version) as acts
    from indexed i group by i.lookup_key
  )
  select coalesce(jsonb_object_agg(g.lookup_key,g.acts),'{}'::jsonb) into by_identity from grouped g;

  for review in select value from jsonb_array_elements(coalesce(e.body#>'{balanceReviews,reviews}', '[]')) loop
    for item in select value from jsonb_array_elements(coalesce(review->'item_results', '[]')) where value->>'result' = 'difference' loop
      select 'product:' || (value->>'product_id') into identity
        from jsonb_array_elements(review#>'{reviewed_snapshot,lines}')
        where value->>'id' = item->>'lineId'
          and jsonb_typeof(value->'product_id') = 'string' and nullif(value->>'product_id', '') is not null;
      if identity is null and exists (
        select 1 from jsonb_array_elements(review#>'{reviewed_snapshot,extras}') where value->>'id' = item->>'lineId'
      ) then identity := 'extra:' || (item->>'lineId'); end if;

      select coalesce(jsonb_agg(value order by (value->>'version')::integer),'[]'::jsonb) into acts
        from jsonb_array_elements(coalesce(by_identity->identity, '[]'))
        where (value->>'countVersion')::integer > (review->>'count_version')::integer
          and (value->>'version')::integer > (review->>'reviewed_document_version')::integer;
      result := result || jsonb_build_array(jsonb_build_object(
        'reviewId',review->'id','sourceLineId',item->'lineId',
        'sourceState',case when identity is null then 'unavailable' else 'known' end,'acts',acts
      ));
    end loop;
  end loop;
  return result;
end;
$$;

commit;
