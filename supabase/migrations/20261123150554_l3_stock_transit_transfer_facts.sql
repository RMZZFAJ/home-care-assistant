-- Stock transit distinguishes the public identity and physical facts of each transfer.
create or replace function public.stock_transit(p_patient uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not coalesce(private.can(p_patient,'ent.read'),false) then
    raise exception 'transfer read permission required' using errcode='42501';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',doc.id,'kind',doc.kind,'code',doc.code,'status',doc.status,'createdAt',doc.created_at,
      'dispatchedAt',coalesce(transfer.dispatched_at,dispatch.created_at),
      'source',doc.payload->>'source','destination',doc.payload->>'destination',
      'recipientId',doc.recipient_id,
      'lines',(select jsonb_agg(jsonb_build_object(
        'productId',line.product_id,'name',line.name_snapshot,'unit',line.unit_snapshot,
        'dispatched',line.quantity::text,'accepted',line.accepted_quantity::text,
        'reconciled',line.reconciled_quantity::text,
        'pending',greatest(line.quantity-line.accepted_quantity-line.reconciled_quantity,0)::text,
        'disputed',coalesce(line.metadata->>'issueOpen'='true',false),
        'reported',line.metadata#>>'{countedReceipt,receivedQuantity}'
      ) order by line.name_snapshot,line.id)
      from public.document_lines line where line.document_id=doc.id and line.care_recipient_id=p_patient)
    ) order by coalesce(transfer.dispatched_at,dispatch.created_at,doc.created_at) desc,doc.id)
    from public.operational_documents doc
    left join public.ent_transfers transfer on transfer.document_id=doc.id and transfer.care_recipient_id=p_patient
    left join lateral (
      select event.created_at from public.document_events event
      where event.document_id=doc.id and event.action in ('ent.submit','ent.issued')
      order by event.version limit 1
    ) dispatch on transfer.dispatched_at is null
    where doc.care_recipient_id=p_patient and doc.type='ENT'
      and doc.status in ('pending_receipt','disputed','cancellation_pending')
  ),'[]'::jsonb);
end;
$$;

revoke all on function public.stock_transit(uuid) from public,anon,authenticated,service_role;
grant execute on function public.stock_transit(uuid) to authenticated;
