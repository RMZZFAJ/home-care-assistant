-- An excess in apuração has no authorized transit reconciliation.
-- Retain the legacy task for qualitative discrepancies or a positive balance in transit.
do $migration$
declare
  definition text := pg_get_functiondef('private.pre_transfer_delivery_task(uuid)'::regprocedure);
  anchor text := $old$if d.status in ('pending_receipt','disputed') and d.recipient_id=auth.uid()$old$;
begin
  if strpos(definition, anchor) = 0 then raise exception 'delivery receipt task anchor missing'; end if;
  execute replace(definition, anchor, $new$if (
    d.status='pending_receipt' or d.status='disputed' and exists(
      select 1 from public.document_lines l where l.document_id=d.id and (
        l.quantity-l.accepted_quantity-l.reconciled_quantity>0
        or (not (l.metadata ? 'countedReceipt') and l.metadata->>'issueOpen'='true')
      )
    )
  ) and d.recipient_id=auth.uid()$new$);
end;
$migration$;
