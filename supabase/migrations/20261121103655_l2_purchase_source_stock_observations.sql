-- The purchase wizard opts in to the additional facts. The original source
-- projection remains available to installed clients and mixed deployments.
create function public.purchase_source_observation_options(
  p_patient uuid, p_filter text, p_search text, p_page integer,
  p_ids uuid[], p_product text default null
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  base jsonb;
  show_family_stock boolean;
begin
  if p_ids is null then
    raise exception 'purchase source observations require selected sources' using errcode = '22023';
  end if;

  base := public.supply_source_options(p_patient,'COM',p_filter,p_search,p_page,p_ids,p_product);
  show_family_stock := private.can(p_patient,'stock.family.read');

  return (with choices as (
    select (choice.document->>'id')::uuid as document_id, choice.document, choice.position
    from jsonb_array_elements(base->'data') with ordinality as choice(document,position)
  ), materials as materialized (
    select c.document_id, source.material, source.position,
      jsonb_build_object('quantity',trim_scale(i.current_stock)::text,'mode',i.stock_observation,
        'unit',i.unit_snapshot,'observedAt',i.stock_observation_at,
        'timeSource',i.stock_observation_time_source) as observation
    from choices c
    cross join lateral jsonb_array_elements(c.document->'materials') with ordinality as source(material,position)
    join public.requisition_items i on i.id=(source.material->>'lineId')::uuid
      and i.requisition_id=c.document_id and i.care_recipient_id=p_patient
    where c.document->>'type'='REQ'
  ), selected_products as (
    select distinct material->>'productId' as product_id from materials
  )
  select jsonb_set(base,'{data}',coalesce((
    select jsonb_agg(case when r.id is null then c.document else c.document || jsonb_build_object(
      'requesterName',r.requester_name_snapshot,'materials',coalesce((
        select jsonb_agg(m.material || jsonb_build_object('observation',m.observation) order by m.position)
        from materials m where m.document_id=c.document_id
      ),'[]'::jsonb)
    ) end order by c.position)
    from choices c
    left join public.requisitions r on r.id=c.document_id and r.care_recipient_id=p_patient
      and c.document->>'type'='REQ'
  ),'[]'::jsonb))
  || case when show_family_stock then jsonb_build_object('familyStock',coalesce((
    select jsonb_object_agg(product_id,trim_scale(private.stock_quantity(p_patient,product_id,'FAMILY'))::text)
    from selected_products
  ),'{}'::jsonb)) else '{}'::jsonb end);
end;
$$;

revoke all on function public.purchase_source_observation_options(uuid,text,text,integer,uuid[],text)
  from public, anon, authenticated, service_role;
grant execute on function public.purchase_source_observation_options(uuid,text,text,integer,uuid[],text)
  to authenticated;
