-- Read only explicit origins and legacy delivery item links, with the same
-- document visibility used by the material consultation.
create function public.requisition_related_documents(p_requisition uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  source public.operational_documents;
begin
  select * into source from public.operational_documents
    where id=p_requisition and type='REQ' and status<>'draft';
  if auth.uid() is null or not found then
    raise exception 'requisition unavailable' using errcode='42501';
  end if;
  perform private.require_cap(source.care_recipient_id,'req.read');

  return (
    with legacy_deliveries as (
      select distinct line.document_id
      from public.requisition_items item
      join public.document_request_links link on link.requisition_item_id=item.id
      join public.document_lines line on line.id=link.document_line_id
      where item.requisition_id=source.id and line.care_recipient_id=source.care_recipient_id
    ), linked as (
      select doc.id, doc.type, coalesce(doc.code,doc.protocol) code, doc.status, doc.created_at
      from public.operational_documents doc
      where doc.care_recipient_id=source.care_recipient_id and doc.kind in ('COM','ENT')
        and doc.type in ('COM','ENT') and private.visible_material_reference(doc)
        and (
          doc.type='ENT' and doc.id in (select document_id from legacy_deliveries)
          or exists (
            select 1 from private.supply_source_sets origins
            where origins.care_recipient_id=doc.care_recipient_id
              and origins.digest=doc.payload->>'sourceSet'
              and origins.sources @> jsonb_build_array(jsonb_build_object('documentId',source.id))
          )
        )
    )
    select coalesce(jsonb_agg(jsonb_build_object('id',id,'type',type,'code',code,'status',status)
      order by type,created_at desc,id),'[]'::jsonb) from linked
  );
end;
$$;

revoke all on function public.requisition_related_documents(uuid) from public,anon,authenticated,service_role;
grant execute on function public.requisition_related_documents(uuid) to authenticated;
