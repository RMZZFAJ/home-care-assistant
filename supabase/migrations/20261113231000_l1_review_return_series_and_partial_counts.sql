-- Existing return numbers predate the DEV series. Preserve their codes, hashes
-- and events while reserving all numbers already used by that document kind.
insert into public.document_series(care_recipient_id,type,last_number)
select care_recipient_id,'DEV',max(number) from public.operational_documents
where kind='DEV' and number is not null group by care_recipient_id
on conflict(care_recipient_id,type) do update
set last_number=greatest(public.document_series.last_number,excluded.last_number);

-- R3 renamed the former reservation to a required family reevaluation. The
-- list's partial count must include the same unsettled items as the detail.
do $l1$
declare definition text;anchor text;
begin
 definition:=pg_get_functiondef('public.phase_d3_pre_bounded_document_list(uuid,text,text,text,timestamp with time zone,timestamp with time zone,integer,integer)'::regprocedure);
 anchor:='private.requisition_item_service(i.id) in (''partial'',''reserved'')';
 if position(anchor in definition)=0 then raise exception 'L1 partial count projection drift';end if;
 execute replace(definition,anchor,'private.requisition_item_service(i.id) in (''partial'',''review_required'')');
end;$l1$;
