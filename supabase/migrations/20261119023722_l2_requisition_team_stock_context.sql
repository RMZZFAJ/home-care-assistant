-- Keep the existing context RPC and disclose each custody only to its readers.
create or replace function public.requisition_item_context(p_patient uuid, p_products text[])
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  can_read_family boolean;
  can_read_team boolean;
begin
  if not private.can(p_patient, 'req.read') or cardinality(p_products) > 1000 then
    raise exception 'required permission' using errcode = '42501';
  end if;

  can_read_family := private.can(p_patient, 'req.family_stock');
  can_read_team := private.can(p_patient, 'stock.team.read');

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'productId', product.product_id,
      'familyStock', case when can_read_family then
        private.stock_quantity(p_patient, product.product_id, 'FAMILY')::text end,
      'teamStock', case when can_read_team then
        trim_scale(private.stock_quantity(p_patient, product.product_id, 'CARE_TEAM'))::text end,
      'pending', coalesce((
        select jsonb_agg(jsonb_build_object(
          'requisitionId', req.id,
          'lineId', item.id,
          'code', coalesce(doc.code, req.protocol),
          'createdAt', req.created_at,
          'status', req.status
        ))
        from public.requisition_items item
        join public.requisitions req on req.id = item.requisition_id
        left join public.operational_documents doc on doc.id = req.id
        where item.care_recipient_id = p_patient
          and private.effective_requisition_product(item.id) = product.product_id
          and req.status <> 'cancelled'
          and private.requisition_item_service(item.id) <> 'fulfilled'
      ), '[]'::jsonb)
    ))
    from public.care_recipient_products product
    where product.care_recipient_id = p_patient and product.product_id = any(p_products)
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.requisition_item_context(uuid, text[]) from public, anon, authenticated, service_role;
grant execute on function public.requisition_item_context(uuid, text[]) to authenticated;
