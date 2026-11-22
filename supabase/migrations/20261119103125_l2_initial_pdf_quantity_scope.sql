-- A queued system issuance can consult its own documentary source.
-- The independent stock capability continues to mask historical balances.
do $pipeline$
declare helper record; definition text; anchor text:='not private.has_pdf_notification_authority(p_id)';
begin
  for helper in select oid from pg_proc where pronamespace='private'::regnamespace
    and proname in ('bal_application_facts','bal_correction_facts','purchase_entry_balance_facts')
  loop
    definition:=pg_get_functiondef(helper.oid);
    if strpos(definition,anchor)=0 then raise exception 'PDF quantity authority anchor missing'; end if;
    execute replace(definition,anchor,anchor||' and not private.has_initial_pdf_authority(p_id)');
  end loop;
end;
$pipeline$;
