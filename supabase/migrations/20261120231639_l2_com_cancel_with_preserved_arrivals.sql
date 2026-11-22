-- Closing a purchase's follow-up does not undo a physical stock entry.
-- Check the current facts inside the existing locked and authorized command.
do $migration$
declare
  definition text := pg_get_functiondef('public.audited_legacy_supply_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
  entry_guard text := $anchor$if d.type='COM' and p_action='cancel' and (d.workflow_data ? 'purchaseExpectationClosure' or exists(select 1 from public.document_lines where document_id=p_id and purchased_quantity>0) or exists(select 1 from public.purchase_receipts where document_id=p_id)) then raise exception 'purchase has acquisition or receipt facts' using errcode='23514';end if;$anchor$;
  legacy_cancel_guard text := $anchor$if exists(select 1 from public.document_lines where document_id=p_id and (accepted_quantity>0 or purchased_quantity>0)) or d.status='approved' and d.type='BAL' then raise exception 'reconciliation required before cancellation';end if;$anchor$;
begin
  if length(definition)-length(replace(definition,entry_guard,''))<>length(entry_guard)
    or length(definition)-length(replace(definition,legacy_cancel_guard,''))<>length(legacy_cancel_guard) then
    raise exception 'purchase cancellation migration does not match the installed command';
  end if;

  definition := replace(definition,entry_guard,'');
  definition := replace(definition,legacy_cancel_guard,$body$
  if d.type='COM' then
    if exists (select 1 from public.purchase_receipts r where r.document_id=p_id and r.state in ('pending','correction_requested'))
      or coalesce((private.purchase_progress(p_id)->>'physicalPending')::boolean,true) then
      raise exception 'purchase arrivals still require reconciliation' using errcode='PT409';
    end if;
  elsif exists (select 1 from public.document_lines where document_id=p_id and (accepted_quantity>0 or purchased_quantity>0))
    or d.status='approved' and d.type='BAL' then
    raise exception 'reconciliation required before cancellation';
  end if;
  $body$);
  execute definition;
end;
$migration$;
