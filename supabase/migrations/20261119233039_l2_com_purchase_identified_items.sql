-- A pending catalogue identity does not suspend the known lines of a COM.
do $migration$
declare definition text; anchor text;
begin
  definition := pg_get_functiondef('public.supply_document_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
  anchor := $old$if p_action in ('approve','purchase','close_expectation') and exists(
    select 1 from public.operational_documents d where d.id=p_id and d.type='COM'
      and private.can(d.care_recipient_id,'com.read')
      and private.pending_com_extras(d.payload,d.workflow_data)<>'[]'::jsonb
  )$old$;
  if strpos(definition, anchor) = 0 then raise exception 'pending purchase command changed'; end if;
  execute replace(definition, anchor, $new$if p_action in ('approve','close_expectation') and exists(
    select 1 from public.operational_documents d where d.id=p_id and d.type='COM'
      and private.can(d.care_recipient_id,'com.read')
      and private.pending_com_extras(d.payload,d.workflow_data)<>'[]'::jsonb
      and (p_action='close_expectation' or not exists(select 1 from public.document_lines l where l.document_id=d.id))
  )$new$);

  definition := pg_get_functiondef('public.audited_legacy_supply_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
  anchor := $old$when not exists(select 1 from public.document_lines where document_id=p_id and approved_quantity>0) then 'rejected'$old$;
  if strpos(definition, anchor) = 0 then raise exception 'purchase approval status changed'; end if;
  execute replace(definition, anchor, $new$when not exists(select 1 from public.document_lines where document_id=p_id and approved_quantity>0)
    and private.pending_com_extras(d.payload,d.workflow_data)='[]'::jsonb then 'rejected'$new$);

  definition := pg_get_functiondef('private.purchase_progress(uuid)'::regprocedure);
  anchor := $old$when not f.expectation_pending and not f.physical_pending and not f.validation_pending$old$;
  if strpos(definition, anchor) = 0 then raise exception 'purchase progress status changed'; end if;
  execute replace(definition, anchor, $new$when not f.expectation_pending and not f.physical_pending and not f.validation_pending
        and private.pending_com_extras(d.payload,d.workflow_data)='[]'::jsonb$new$);

  definition := pg_get_functiondef('private.resolve_purchase_extra(uuid,jsonb,uuid,integer)'::regprocedure);
  anchor := $old$document.status not in ('pending_approval','approved')$old$;
  if strpos(definition, anchor) = 0 then raise exception 'purchase identification status changed'; end if;
  definition := replace(definition, anchor, $new$document.status not in ('pending_approval','approved','partially_approved','purchasing','purchased','partially_received')$new$);
  anchor := $old$case when document.status='approved' then amount else 0 end$old$;
  if strpos(definition, anchor) = 0 then raise exception 'purchase extra approval quantity changed'; end if;
  definition := replace(definition, anchor, $new$case when document.status='pending_approval' then 0 else amount end$new$);
  anchor := $old$  perform private.record_document_event(p_id,'com.extra_identified',p_body,p_key);$old$;
  if strpos(definition, anchor) = 0 then raise exception 'purchase identification event changed'; end if;
  execute replace(definition, anchor, $new$  if document.status <> 'pending_approval' then perform private.refresh_purchase_progress(p_id); end if;
  perform private.record_document_event(p_id,'com.extra_identified',p_body,p_key);$new$);
end
$migration$;
