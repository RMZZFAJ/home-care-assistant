-- C-CAUSE-050: the SQL alias e collided with the PL/pgSQL event record e.
-- Isolate that failure before discriminating the separate temporal rule.
do $migration$
declare definition text;anchor text;replacement text;
begin
 definition:=pg_get_functiondef('public.audited_legacy_supply_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
 anchor:='select coalesce(sum((z->>''consumedQuantity'')::numeric),0) into delta from public.document_events e cross join lateral jsonb_array_elements(coalesce(e.body->''event''->''lines'',''[]'')) z join public.document_lines dl on dl.id=(z->>''lineId'')::uuid where e.care_recipient_id=d.care_recipient_id and e.action=''ent.consent_cancel'' and dl.product_id=l.product_id;';
 replacement:=replace(replace(anchor,'document_events e cross','document_events consumption_event cross'),'e.','consumption_event.');
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'delivery consumed-event alias anchor mismatch';end if;
 execute replace(definition,anchor,replacement);
end;$migration$;
