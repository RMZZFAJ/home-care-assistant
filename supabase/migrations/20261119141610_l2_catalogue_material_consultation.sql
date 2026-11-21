create function public.catalogue_material_context(
  p_patient uuid,p_product text,p_section text default 'stock',p_page integer default 1
) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  req boolean;
  com boolean;
  ent boolean;
  bal boolean;
  base jsonb;
  rows jsonb;
  total bigint;
begin
  if p_section is null or p_section not in ('stock','history','links')
    or p_page is null or p_page not between 1 and 1000000 then
    raise exception 'invalid material consultation' using errcode='22023';
  end if;
  if private.auth_session() is null or not public.can_access_recipient(p_patient)
    or not exists(select 1 from public.care_recipient_products
      where care_recipient_id=p_patient and product_id=p_product) then
    raise exception 'material unavailable' using errcode='42501';
  end if;
  base:=jsonb_build_object('patientId',p_patient,'productId',p_product,
    'documentId',null,'lineId',null,'section',p_section,'page',p_page);
  if p_section='history' then
    return base||private.material_decision_history(p_patient,p_product,null,p_page);
  end if;

  req:=private.can(p_patient,'req.read');
  if p_section='stock' then
    select coalesce(jsonb_agg(to_jsonb(snapshot) order by "createdAt" desc,"documentId"),'[]'::jsonb)
      into rows from (
        select d.id "documentId",d.code,d.created_at "createdAt",i.current_stock::text quantity,
          i.stock_observation observation,i.unit_snapshot unit,i.stock_observation_at "observedAt",
          i.stock_observation_time_source "timeSource"
        from public.requisition_items i
        join public.operational_documents d on d.id=i.requisition_id and d.care_recipient_id=p_patient
        left join public.requisition_item_resolutions r on r.requisition_item_id=i.id
        where req and i.care_recipient_id=p_patient and d.status<>'draft'
          and coalesce(i.product_id,r.product_id)=p_product
        order by d.created_at desc,d.id limit 5
      ) snapshot;
    return base||jsonb_build_object(
      'family',case when private.can(p_patient,'stock.family.read') then
        trim_scale(private.stock_quantity(p_patient,p_product,'FAMILY'))::text end,
      'team',case when private.can(p_patient,'stock.team.read') then
        trim_scale(private.stock_quantity(p_patient,p_product,'CARE_TEAM'))::text end,
      'observations',rows);
  end if;

  com:=private.can(p_patient,'com.read');
  ent:=private.can(p_patient,'ent.read');
  bal:=private.can(p_patient,'bal.read');
  with matching as (
    select i.requisition_id id
    from public.requisition_items i
    left join public.requisition_item_resolutions r on r.requisition_item_id=i.id
    where req and i.care_recipient_id=p_patient and coalesce(i.product_id,r.product_id)=p_product
    union
    select l.document_id from public.document_lines l
    where l.care_recipient_id=p_patient and l.product_id=p_product
  ), authorized as materialized (
    select d.id,d.code,d.kind,d.type,d.status,d.created_at "createdAt"
    from matching m join public.operational_documents d on d.id=m.id
    where d.care_recipient_id=p_patient and d.status<>'draft'
      and case d.type when 'REQ' then req when 'COM' then com when 'ENT' then ent when 'BAL' then bal else false end
  ), page as (
    select a.*,(private.document_archive_active(a.id) or exists(
      select 1 from public.requisition_lifecycle l where l.requisition_id=a.id and l.archived_at is not null
    )) archived
    from authorized a order by "createdAt" desc,id desc limit 20 offset ((p_page-1)*20)
  )
  select (select count(*) from authorized),coalesce(jsonb_agg(to_jsonb(page) order by "createdAt" desc,id desc),'[]'::jsonb)
    into total,rows from page;
  return base||jsonb_build_object('total',total,'rows',rows);
end;
$$;
revoke all on function public.catalogue_material_context(uuid,text,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.catalogue_material_context(uuid,text,text,integer) to authenticated;
notify pgrst,'reload schema';
