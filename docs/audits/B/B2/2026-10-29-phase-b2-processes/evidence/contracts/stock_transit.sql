CREATE OR REPLACE FUNCTION public.stock_transit(p_patient uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if not private.can(p_patient,'ent.read') then raise exception 'ENT permission required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
 'id',d.id,'code',d.code,'status',d.status,'createdAt',d.created_at,
 'source',d.payload->>'source','destination',d.payload->>'destination',
 'recipientId',d.recipient_id,
 'lines',(select jsonb_agg(jsonb_build_object('productId',l.product_id,'name',l.name_snapshot,
 'unit',l.unit_snapshot,'dispatched',l.quantity::text,'accepted',l.accepted_quantity::text,
 'reconciled',l.reconciled_quantity::text,'pending',(l.quantity-l.accepted_quantity-l.reconciled_quantity)::text,
 'disputed',coalesce((l.metadata->>'issueOpen')::boolean,false)) order by l.name_snapshot)
 from public.document_lines l where l.document_id=d.id))
 order by d.created_at desc,d.id) from public.operational_documents d
 where d.care_recipient_id=p_patient and d.type='ENT'
 and d.status in ('pending_receipt','disputed','cancellation_pending')),'[]');
end;$function$
