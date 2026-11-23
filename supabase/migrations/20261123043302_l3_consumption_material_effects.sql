-- Read the immutable effect in the authorized report's custody.
-- Consumption issue, correction and cancellation already write separate ledger entries.
create or replace function public.consumption_record_detail(p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  r public.consumption_reports;
  result jsonb;
begin
  select * into r from public.consumption_reports where id=p_id;
  if not found then raise exception 'report not found';end if;
  perform private.require_consumption_read(r.care_recipient_id,r.location);
  result:=(to_jsonb(r)-'idempotency_key'-'submitted_intent')||jsonb_build_object(
    'current_lines',private.consumption_current_lines(p_id),
    'acts',coalesce((select jsonb_agg(jsonb_build_object(
      'id',a.id,'action',a.action,'version',a.report_version,'by',a.actor_name,
      'at',a.recorded_at,'reason',a.request->>'reason','repeatedReportId',a.request->>'repeatedReportId')
      order by a.report_version)
      from private.consumption_acts a where a.report_id=p_id and a.care_recipient_id=r.care_recipient_id),'[]'::jsonb),
    'revisions',coalesce((select jsonb_agg(to_jsonb(v)-'idempotency_key'-'submitted_intent' order by v.version)
      from public.consumption_report_revisions v where v.report_id=p_id),'[]'::jsonb),
    'decision',(select to_jsonb(d)-'idempotency_key'
      from public.consumption_report_decisions d where d.report_id=p_id),
    'movements',coalesce((select jsonb_agg(jsonb_build_object(
      'id',m.id,'productId',m.product_id,'quantity',m.quantity::text,
      'source',m.source_location,'destination',m.destination_location,'createdAt',m.created_at,
      'actId',a.id,
      'balanceBefore',case r.location when m.source_location then m.source_balance_before::text
        when m.destination_location then m.destination_balance_before::text end,
      'balanceAfter',case r.location when m.source_location then m.source_balance_after::text
        when m.destination_location then m.destination_balance_after::text end)
      order by m.created_at,m.id)
      from public.stock_movements m
      left join private.consumption_acts a on m.reference_type='consumption_operation'
        and a.id=m.reference_id and a.report_id=p_id and a.care_recipient_id=m.care_recipient_id
      where m.care_recipient_id=r.care_recipient_id
        and ((m.reference_type='consumption' and m.reference_id=p_id) or a.id is not null)),'[]'::jsonb)
  );
  perform private.require_consumption_read(r.care_recipient_id,r.location);
  return result;
end;
$$;
