-- Measured L1 query: COALESCE forced a scan of 76,950 notices (11.67s).
-- The same indexed scope serves current and historical document notice readers.
create index notification_document_scope_time on public.requisition_notifications
 ((coalesce(document_id,requisition_id)),created_at desc,id);

create or replace function private.progress_audit_visible(p_entity uuid,p_metadata jsonb) returns boolean
language sql stable security definer set search_path='' as $$
 select not exists(select 1 from private.document_progress_notes n
  where n.id=any(array[p_entity,case when p_metadata->>'resource_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   then (p_metadata->>'resource_id')::uuid else null end]) and not private.progress_note_readable(n));
$$;

do $l1$
declare definition text;anchor text;
begin
 definition:=pg_get_functiondef('private.communication_reminder_allowed(public.operational_documents,public.requisition_notifications)'::regprocedure);
 execute replace(definition,'d.status in (''pending_receipt'',''disputed'')','d.status=''pending_receipt''');
 definition:=pg_get_functiondef('public.phase_d3_pre_bounded_document_list(uuid,text,text,text,timestamp with time zone,timestamp with time zone,integer,integer)'::regprocedure);
 anchor:='case p_status when ''archive_pending''';
 if position(anchor in definition)=0 then raise exception 'L1 open request filter drift';end if;
 execute replace(definition,anchor,'case p_status when ''open'' then status in (''awaiting_fulfillment'',''science_pending'',''fulfillment_partial'') when ''archive_pending''');
end;$l1$;
