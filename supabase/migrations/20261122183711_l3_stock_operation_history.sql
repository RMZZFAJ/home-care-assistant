-- A grouped projection of the ledger. An ambiguous historical document
-- reference is kept as one movement until an authoritative act is available.
create index stock_movements_patient_time
  on public.stock_movements (care_recipient_id, created_at desc, id desc);

create function public.stock_operation_history(
  p_patient uuid, p_product text, p_from timestamptz, p_to timestamptz,
  p_location text, p_page integer, p_size integer, p_search text, p_origin text
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  family boolean := coalesce(private.can(p_patient,'stock.family.read'),false);
  team boolean := coalesce(private.can(p_patient,'stock.team.read'),false);
  delivery boolean := coalesce(private.can(p_patient,'ent.read'),false);
begin
  if not(family or team) then raise exception 'stock permission required' using errcode='42501'; end if;
  if p_page is null or p_page not between 1 and 1000000 or p_size is null or p_size not between 1 and 100
    or length(p_search)>160
    or p_location not in ('FAMILY','CARE_TEAM','TRANSIT')
    or p_origin not in ('manual','COM','CON','REQ','ENT','DEV','BAL','inventory','other')
  then raise exception 'invalid history filter' using errcode='22023'; end if;

  return (
    with scoped as materialized (
      select m.*,
        case
          when m.reference_type in ('document','bal','requisition_count','requisition_count_reversal') then m.reference_id
          when m.reference_type='purchase_receipt' then receipt.document_id
          when m.reference_type='delivery_regularization' then regularization.document_id
        end as document_id
      from public.stock_movements m
      left join public.purchase_receipts receipt on m.reference_type='purchase_receipt' and receipt.id=m.reference_id
      left join public.delivery_regularizations regularization on m.reference_type='delivery_regularization'
        and regularization.id=m.reference_id and regularization.care_recipient_id=p_patient
      where m.care_recipient_id=p_patient
        and (p_product is null or m.product_id=p_product)
        and (p_from is null or m.created_at>=p_from) and (p_to is null or m.created_at<p_to)
        and (p_location is null or p_location in (m.source_location,m.destination_location))
        and (p_location is distinct from 'FAMILY' or family)
        and (p_location is distinct from 'CARE_TEAM' or team)
        and (p_location is distinct from 'TRANSIT' or delivery)
    ), authorized as materialized (
      select m.*, d.kind as document_kind,
        case when private.can(p_patient,lower(d.type)||'.read') and d.status<>'draft' then d.code end as document_code
      from scoped m
      left join public.operational_documents d on d.id=m.document_id and d.care_recipient_id=p_patient
      where (family and 'FAMILY' in (m.source_location,m.destination_location))
        or (team and 'CARE_TEAM' in (m.source_location,m.destination_location))
        or (delivery and 'TRANSIT' in (m.source_location,m.destination_location)
          and ((family and 'FAMILY' in (d.payload->>'source',d.payload->>'destination'))
            or (team and 'CARE_TEAM' in (d.payload->>'source',d.payload->>'destination'))))
    ), identified as materialized (
      select m.*,
        case
          when operation.id is not null then 'family:'||operation.id
          when application.id is not null then 'balance:'||application.id
          when req.movement_id is not null then 'request:'||req.requisition_id
          when m.reference_id is not null and m.reference_type in
            ('purchase_receipt','unlinked_arrival','delivery_regularization','consumption','requisition_count_reversal','inventory')
            then m.reference_type||':'||m.reference_id
          else 'movement:'||m.id
        end as act_key,
        case
          when m.reference_type='family_manual' then 'manual'
          when m.reference_type in ('consumption','consumption_operation') then 'CON'
          when m.reference_type in ('purchase_receipt','unlinked_arrival') then 'COM'
          when m.reference_type in ('requisition_count','requisition_count_reversal') then 'REQ'
          when m.reference_type='bal' then 'BAL'
          when m.reference_type='inventory' then 'inventory'
          when m.reference_type in ('document','delivery_regularization') then coalesce(m.document_kind,'ENT')
          else 'other'
        end as origin,
        coalesce(operation.actor_name,application.actor_name,profile.full_name) as actor_name,
        catalog.name as material_name, catalog.unit,
        case when p_location is not null then p_location
          when family and 'FAMILY' in (m.source_location,m.destination_location) then 'FAMILY'
          when team and 'CARE_TEAM' in (m.source_location,m.destination_location) then 'CARE_TEAM'
          else 'TRANSIT'
        end as effect_custody
      from authorized m
      left join private.family_stock_operation_movements batch on batch.movement_id=m.id
      left join private.family_stock_operations operation on operation.id=batch.operation_id and operation.care_recipient_id=p_patient
      left join private.balance_applications application on m.reference_type='bal' and application.document_id=m.reference_id
        and application.care_recipient_id=p_patient
        and m.movement_revision>application.reference_revision and m.movement_revision<=application.applied_revision
      left join private.requisition_stock_counts req on req.movement_id=m.id and req.care_recipient_id=p_patient
      left join public.care_recipient_products catalog on catalog.care_recipient_id=p_patient and catalog.product_id=m.product_id
      left join public.profiles profile on profile.id=m.performed_by
    ), groups as (
      select act_key, max(created_at) as recorded_at
      from identified
      where p_origin is null or origin=p_origin
      group by act_key
      having p_search is null or bool_or(
        strpos(lower(coalesce(material_name,'')),lower(p_search))>0
        or strpos(lower(product_id),lower(p_search))>0
        or strpos(lower(coalesce(document_code,'')),lower(p_search))>0
        or strpos(id::text,lower(p_search))>0
      )
    ), page as (
      select * from groups order by recorded_at desc,act_key desc
      limit p_size offset ((p_page-1)::bigint*p_size)
    ), operations as (
      select page.act_key, page.recorded_at,
        max(m.origin) as origin, max(m.document_code) as document_code, max(m.actor_name) as actor,
        jsonb_agg(jsonb_build_object(
          'id',m.id,'product_id',m.product_id,'quantity',m.quantity::text,'created_at',m.created_at,
          'reference_type',m.reference_type,'reference_id',case when m.document_code is not null or m.reference_type='family_manual' then m.reference_id end,
          'reference_document_id',case when m.document_code is not null then m.document_id end,
          'justification',m.justification,'source_location',m.source_location,'destination_location',m.destination_location,
          'name',m.material_name,'unit',m.unit,'custody',m.effect_custody,
          'before',case when m.effect_custody='TRANSIT' and not(family and team) then null
            when m.source_location=m.effect_custody then m.source_balance_before::text else m.destination_balance_before::text end,
          'after',case when m.effect_custody='TRANSIT' and not(family and team) then null
            when m.source_location=m.effect_custody then m.source_balance_after::text else m.destination_balance_after::text end,
          'direction',case when m.source_location=m.effect_custody then 'outbound' else 'inbound' end
        ) order by m.movement_revision desc nulls last,m.created_at desc,m.id desc) as rows
      from page join identified m on m.act_key=page.act_key
      group by page.act_key,page.recorded_at
    )
    select jsonb_build_object('total',(select count(*) from groups),'data',
      coalesce(jsonb_agg(jsonb_build_object(
        'id',act_key,'recordedAt',recorded_at,'origin',origin,'documentCode',document_code,'actor',actor,'rows',rows
      ) order by recorded_at desc,act_key desc),'[]'::jsonb))
    from operations
  );
end;
$$;

revoke all on function public.stock_operation_history(uuid,text,timestamptz,timestamptz,text,integer,integer,text,text)
  from public,anon,authenticated,service_role;
grant execute on function public.stock_operation_history(uuid,text,timestamptz,timestamptz,text,integer,integer,text,text)
  to authenticated;
