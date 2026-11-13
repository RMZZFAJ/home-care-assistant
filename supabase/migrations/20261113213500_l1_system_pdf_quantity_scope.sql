-- A validated notification may freeze its own COM/BAL source. Stock balances
-- still require the independent stock capability and are masked for the system.
do $l1$
declare p record;definition text;anchor text;
begin
 for p in select oid,proname from pg_proc where pronamespace='private'::regnamespace
 and proname in ('bal_application_facts','bal_correction_facts','purchase_entry_balance_facts') loop
  definition:=pg_get_functiondef(p.oid);
  anchor:=case p.proname when 'bal_application_facts' then 'perform private.require_cap(patient,''bal.read'');'
   when 'bal_correction_facts' then 'perform private.require_cap(d.care_recipient_id,''bal.read'');'
   else 'perform private.require_cap(v_document.care_recipient_id,''com.read'');' end;
  if position(anchor in definition)=0 then raise exception 'PDF quantity authority drift';end if;
  execute replace(definition,anchor,'if not private.has_pdf_notification_authority(p_id) then '||anchor||'end if;');
 end loop;
end;$l1$;
