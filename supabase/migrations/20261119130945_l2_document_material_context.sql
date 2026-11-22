create function private.document_material_lines(p_document uuid,p_type text)
returns table(line_id uuid,product_id text)
language sql stable set search_path='' as $$
  select i.id,private.effective_requisition_product(i.id)
  from public.requisition_items i where p_type='REQ' and i.requisition_id=p_document
  union all
  select l.id,l.product_id
  from public.document_lines l where p_type<>'REQ' and l.document_id=p_document;
$$;

create function public.document_material_context(
  p_document uuid,p_line uuid default null,p_section text default 'stock',p_page integer default 1
) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  d public.operational_documents;
  product text;
  family boolean;
  team boolean;
  family_summary boolean;
  rows jsonb;
  history jsonb;
  total bigint:=0;
  result jsonb;
begin
  if p_section is null or p_section not in ('stock','history','links')
    or p_page is null or p_page not between 1 and 1000000 then
    raise exception 'invalid material consultation' using errcode='22023';
  end if;
  select * into d from public.operational_documents where id=p_document;
  if auth.uid() is null or not found then
    raise exception 'material unavailable' using errcode='42501';
  end if;
  perform private.require_cap(d.care_recipient_id,lower(d.type::text)||'.read');
  if d.status='draft' and d.created_by is distinct from auth.uid()
    and not public.can_manage_recipient(d.care_recipient_id) then
    raise exception 'material unavailable' using errcode='42501';
  end if;
  family:=private.can(d.care_recipient_id,'stock.family.read');
  team:=private.can(d.care_recipient_id,'stock.team.read');
  family_summary:=family or d.type='REQ' and private.can(d.care_recipient_id,'req.family_stock');
  result:=jsonb_build_object('documentId',d.id,'patientId',d.care_recipient_id);

  if p_line is null then
    return result||jsonb_build_object('balances',coalesce((
      select jsonb_agg(jsonb_build_object('lineId',l.line_id,'productId',l.product_id,
        'family',case when family_summary and l.product_id is not null then
          trim_scale(private.stock_quantity(d.care_recipient_id,l.product_id,'FAMILY'))::text end,
        'team',case when team and l.product_id is not null then
          trim_scale(private.stock_quantity(d.care_recipient_id,l.product_id,'CARE_TEAM'))::text end))
      from private.document_material_lines(d.id,d.type::text) l
    ),'[]'::jsonb));
  end if;

  select l.product_id into product from private.document_material_lines(d.id,d.type::text) l where l.line_id=p_line;
  if not found then raise exception 'material unavailable' using errcode='42501'; end if;
  result:=result||jsonb_build_object('lineId',p_line,'productId',product,'section',p_section,'page',p_page);

  if p_section='stock' then
    select coalesce(jsonb_agg(to_jsonb(snapshot) order by "createdAt" desc,"documentId"),'[]'::jsonb)
    into rows from (
      select r.id "documentId",req.code,req.created_at "createdAt", i.current_stock::text quantity,
        i.stock_observation observation,i.unit_snapshot unit,i.stock_observation_at "observedAt",
        i.stock_observation_time_source "timeSource"
      from public.requisition_items i
      join public.requisitions r on r.id=i.requisition_id
      join public.operational_documents req on req.id=r.id
      where i.care_recipient_id=d.care_recipient_id and private.can(d.care_recipient_id,'req.read')
        and (i.id=p_line or product is not null and private.effective_requisition_product(i.id)=product)
        and req.status<>'draft'
      order by req.created_at desc,req.id limit 5
    ) snapshot;
    return result||jsonb_build_object(
      'family',case when family_summary and product is not null then
        trim_scale(private.stock_quantity(d.care_recipient_id,product,'FAMILY'))::text end,
      'team',case when team and product is not null then
        trim_scale(private.stock_quantity(d.care_recipient_id,product,'CARE_TEAM'))::text end,
      'observations',rows);
  end if;

  if p_section='history' then
    if product is null or not(family or team) then
      return result||jsonb_build_object('available',family or team,'total',0,'rows','[]'::jsonb);
    end if;
    history:=public.stock_history(d.care_recipient_id,product,null,null,null,p_page,20);
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',entry.row->>'id','quantity',entry.row->>'quantity','type',entry.row->>'movement_type',
      'createdAt',entry.row->>'created_at','author',actor.full_name,
      'source',entry.row->>'source_location','destination',entry.row->>'destination_location',
      'sourceAfter',entry.row->>'source_balance_after','destinationAfter',entry.row->>'destination_balance_after',
      'document',case when doc.id is not null then jsonb_build_object('id',doc.id,'type',doc.type,'kind',doc.kind,
        'code',doc.code,'status',doc.status,'createdAt',doc.created_at) end
    ) order by entry.seq),'[]'::jsonb)
    into rows from jsonb_array_elements(history->'data') with ordinality entry(row,seq)
    left join public.profiles actor on actor.id=(entry.row->>'performed_by')::uuid
    left join public.operational_documents doc on doc.id=(entry.row->>'reference_id')::uuid
      and doc.care_recipient_id=d.care_recipient_id and doc.status<>'draft'
      and private.can(d.care_recipient_id,lower(doc.type::text)||'.read');
    return result||jsonb_build_object('available',true,'total',history->'total','rows',rows);
  end if;

  with related_ids as (
    select i.requisition_id id from public.requisition_items i
    where i.care_recipient_id=d.care_recipient_id and product is not null
      and private.effective_requisition_product(i.id)=product
    union
    select l.document_id from public.document_lines l
    where l.care_recipient_id=d.care_recipient_id and l.product_id=product
    union
    select l.document_id from public.document_request_links r
    join public.document_lines l on l.id=r.document_line_id
    where r.requisition_item_id=p_line
    union
    select i.requisition_id from public.document_request_links r
    join public.requisition_items i on i.id=r.requisition_item_id
    where r.document_line_id=p_line
  ), authorized as materialized (
    select doc.id,doc.type,doc.kind,doc.code,doc.status,doc.created_at "createdAt",
      (private.document_archive_active(doc.id) or exists(select 1 from public.requisition_lifecycle lc
        where lc.requisition_id=doc.id and lc.archived_at is not null)) archived
    from related_ids r join public.operational_documents doc on doc.id=r.id
    where doc.id<>d.id and doc.care_recipient_id=d.care_recipient_id and doc.status<>'draft'
      and private.can(d.care_recipient_id,lower(doc.type::text)||'.read')
  ), paged as (
    select * from authorized order by "createdAt" desc,id desc limit 20 offset ((p_page-1)*20)
  )
  select (select count(*) from authorized),coalesce(jsonb_agg(to_jsonb(paged) order by "createdAt" desc,id desc),'[]'::jsonb)
  into total,rows from paged;
  return result||jsonb_build_object('total',total,'rows',rows);
end;
$$;

revoke all on function private.document_material_lines(uuid,text),
  public.document_material_context(uuid,uuid,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.document_material_context(uuid,uuid,text,integer) to authenticated;
notify pgrst,'reload schema';
