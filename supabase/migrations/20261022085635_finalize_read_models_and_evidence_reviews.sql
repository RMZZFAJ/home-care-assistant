-- Consumption is identified by its audited reference, not by an outbound movement enum.
create or replace function public.stock_consumption_metrics(p_patient uuid,p_from timestamptz,p_to timestamptz) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare family boolean:=private.can(p_patient,'stock.family.read');team boolean:=private.can(p_patient,'stock.team.read');begin
 if not(family or team) then raise exception 'stock permission required' using errcode='42501';end if;
 if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>interval '366 days' then raise exception 'invalid metrics period';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('productId',x.product_id,'location',x.source_location,
 'quantity',x.total::text,'movements',x.movements,'days',ceil(extract(epoch from(p_to-p_from))/86400),
 'averagePerDay',(x.total/(extract(epoch from(p_to-p_from))/86400))::text))
 from(select product_id,source_location,sum(quantity) total,count(*) movements
 from public.stock_movements where care_recipient_id=p_patient and created_at>=p_from and created_at<p_to
 and destination_location is null and reference_type='consumption'
 and (family and source_location='FAMILY' or team and source_location='CARE_TEAM')
 group by product_id,source_location)x),'[]');
end;$$;
create or replace function public.stock_transit(p_patient uuid) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
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
end;$$;
