-- Scope the search to authorized material relations before applying filters and pagination.
create function public.material_related_fichas(
  p_patient uuid, p_product text, p_document uuid, p_line uuid,
  p_kind text, p_search text, p_page integer
) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  source public.operational_documents;
  patient uuid;
  product text;
  search text:=lower(trim(coalesce(p_search,'')));
  result jsonb;
begin
  if p_page is null or p_page not between 1 and 1000000
    or p_kind is not null and p_kind not in ('REQ','COM','ENT','DEV','BAL')
    or length(search)>160 then
    raise exception 'invalid material consultation' using errcode='22023';
  end if;
  if private.auth_session() is null then
    raise exception 'material unavailable' using errcode='42501';
  end if;
  if p_document is not null then
    if p_line is null or p_patient is not null or p_product is not null then
      raise exception 'invalid document material scope' using errcode='22023';
    end if;
    select * into source from public.operational_documents d where d.id=p_document;
    if not found then raise exception 'material unavailable' using errcode='42501'; end if;
    patient:=source.care_recipient_id;
    perform private.require_cap(patient,lower(source.type::text)||'.read');
    if source.status='draft' and source.created_by is distinct from auth.uid()
      and not public.can_manage_recipient(patient) then
      raise exception 'material unavailable' using errcode='42501';
    end if;
    select l.product_id into product
    from private.document_material_lines(source.id,source.type::text) l where l.line_id=p_line;
    if not found then raise exception 'material unavailable' using errcode='42501'; end if;
  else
    if p_patient is null or p_line is not null or p_product is null or length(p_product) not between 1 and 120 then
      raise exception 'invalid catalogue material scope' using errcode='22023';
    end if;
    patient:=p_patient;
    product:=p_product;
    if not coalesce(public.can_access_recipient(patient),false)
      or not exists(select 1 from public.care_recipient_products
        where care_recipient_id=patient and product_id=product) then
      raise exception 'material unavailable' using errcode='42501';
    end if;
  end if;

  with related_ids as (
    select i.requisition_id id from public.requisition_items i
    where i.care_recipient_id=patient and product is not null
      and private.effective_requisition_product(i.id)=product
    union
    select l.document_id from public.document_lines l
    where l.care_recipient_id=patient and l.product_id=product
    union
    select l.document_id from public.document_request_links r
    join public.document_lines l on l.id=r.document_line_id
    where r.requisition_item_id=p_line
    union
    select i.requisition_id from public.document_request_links r
    join public.requisition_items i on i.id=r.requisition_item_id
    where r.document_line_id=p_line
  ), readable as materialized (
    select d.id,d.type,d.kind,coalesce(d.code,d.protocol) code,d.status,d.created_at
    from related_ids r join public.operational_documents d on d.id=r.id
    where d.id is distinct from p_document and d.care_recipient_id=patient and d.status<>'draft'
      and private.can(patient,lower(d.type::text)||'.read')
      and (p_kind is null or d.kind=p_kind)
      and (search='' or strpos(lower(coalesce(d.code,d.protocol,'')),search)>0)
  ), slice as (
    select r.*,(private.document_archive_active(r.id) or exists(
      select 1 from public.requisition_lifecycle lc where lc.requisition_id=r.id and lc.archived_at is not null
    )) archived from readable r
    order by created_at desc,id desc limit 20 offset ((p_page-1)*20)
  )
  select jsonb_build_object('patientId',patient,'documentId',p_document,'lineId',p_line,'productId',product,
    'section','links','page',p_page,'filters',jsonb_build_object('kind',p_kind,'search',search),
    'total',(select count(*) from readable),'rows',coalesce((
      select jsonb_agg(jsonb_build_object('id',id,'type',type,'kind',kind,'code',code,'status',status,
        'createdAt',created_at,'archived',archived) order by created_at desc,id desc) from slice
    ),'[]'::jsonb)) into result;
  return result;
end;
$$;
revoke all on function public.material_related_fichas(uuid,text,uuid,uuid,text,text,integer)
  from public,anon,authenticated,service_role;
grant execute on function public.material_related_fichas(uuid,text,uuid,uuid,text,text,integer) to authenticated;
notify pgrst,'reload schema';
