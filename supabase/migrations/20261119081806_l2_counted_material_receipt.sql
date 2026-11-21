-- Keep the personal declaration and physical recognition in the existing receive transaction.
-- The older divergences packet remains valid for clients already in use.
create function private.validate_counted_receipt(d public.operational_documents, p_body jsonb)
returns void language plpgsql set search_path = '' as $$
declare
  receipt jsonb := p_body->'countedReceipt';
  lines jsonb := receipt->'lines';
  item jsonb;
  line_id uuid;
  seen uuid[] := array[]::uuid[];
  received_text text;
  received numeric;
  decimals integer;
begin
  if jsonb_typeof(receipt) is distinct from 'object'
    or jsonb_typeof(lines) is distinct from 'array'
    or p_body - 'countedReceipt' <> '{}'::jsonb then
    raise exception 'invalid counted receipt' using errcode = '22023';
  end if;
  if receipt - array['lines', 'notes'] <> '{}'::jsonb
    or (receipt ? 'notes' and (jsonb_typeof(receipt->'notes') is distinct from 'string'
      or private.bal_comment_units(receipt->>'notes') > 1000))
    or jsonb_array_length(lines) not between 1 and 1000
    or jsonb_array_length(lines) <> (select count(*) from public.document_lines where document_id=d.id) then
    raise exception 'counted receipt must cover the dispatched materials' using errcode = '22023';
  end if;
  for item in select value from jsonb_array_elements(lines) loop
    received_text := item->>'receivedQuantity';
    if jsonb_typeof(item) is distinct from 'object'
      or item - array['lineId', 'receivedQuantity'] <> '{}'::jsonb
      or jsonb_typeof(item->'lineId') is distinct from 'string'
      or not coalesce(pg_input_is_valid(item->>'lineId', 'uuid'), false)
      or jsonb_typeof(item->'receivedQuantity') not in ('string', 'number')
      or not coalesce(received_text ~ '^[0-9]{1,64}([.][0-9]{1,6})?$', false) then
      raise exception 'invalid counted receipt line' using errcode = '22023';
    end if;
    line_id := (item->>'lineId')::uuid;
    received := received_text::numeric;
    select p.quantity_decimals into decimals
    from public.document_lines l join public.care_recipient_products p
      on p.care_recipient_id=d.care_recipient_id and p.product_id=l.product_id
    where l.document_id=d.id and l.id=line_id;
    if not found or line_id=any(seen) or received>1000000000 or received<>round(received, decimals) then
      raise exception 'invalid counted receipt material or quantity' using errcode = '22023';
    end if;
    seen := array_append(seen, line_id);
  end loop;
end;
$$;
revoke all on function private.validate_counted_receipt(public.operational_documents,jsonb)
  from public, anon, authenticated, service_role;

do $migration$
declare
  definition text;
  anchor text;
begin
  definition := pg_get_functiondef('private.validate_supply_command(public.operational_documents,text,jsonb)'::regprocedure);
  anchor := $old$ a:=p_body->'divergences';$old$;
  if strpos(definition, anchor) = 0 then raise exception 'counted receipt validation anchor missing'; end if;
  execute replace(definition, anchor, $new$
 if p_body ? 'countedReceipt' then
   perform private.validate_counted_receipt(d,p_body);
   return;
 end if;
$new$ || anchor);

  definition := replace(
    pg_get_functiondef('public.audited_legacy_supply_command(uuid,text,jsonb,uuid,integer)'::regprocedure),
    chr(13)||chr(10), chr(10)
  );
  anchor := 'v_auto_approve boolean:=false;';
  if strpos(definition, anchor) = 0 then raise exception 'counted receipt variable anchor missing'; end if;
  definition := replace(definition, anchor, anchor || $new$
 v_counted_lines jsonb;
 v_reported numeric;
 v_issue boolean;
$new$);

  anchor := replace($old$ for l in select * from public.document_lines where document_id=p_id order by product_id loop
 select z into x from jsonb_array_elements(coalesce(p_body->'divergences','[]')) z where z->>'lineId'=l.id::text;
 if found then q:=coalesce((x->>'acceptedQuantity')::numeric,0);else q:=l.quantity;end if;$old$, chr(13)||chr(10), chr(10));
  if strpos(definition, anchor) = 0 then raise exception 'counted receipt quantity anchor missing'; end if;
  definition := replace(definition, anchor, $new$
 if p_body ? 'countedReceipt' then
   select jsonb_object_agg((item->>'lineId')::uuid::text, item->'receivedQuantity')
     into v_counted_lines
   from jsonb_array_elements(p_body#>'{countedReceipt,lines}') item;
 end if;
 for l in select * from public.document_lines where document_id=p_id order by product_id loop
   if v_counted_lines is not null then
     v_reported := (v_counted_lines->>l.id::text)::numeric;
     q := least(l.quantity,v_reported);
     v_issue := v_reported<>l.quantity;
     x := case when v_issue then jsonb_build_object(
       'lineId',l.id,'acceptedQuantity',q::text,'problem',
       case when v_reported<l.quantity then 'shortage' else 'other' end
     ) end;
   else
     select z into x from jsonb_array_elements(p_body->'divergences') z where z->>'lineId'=l.id::text;
     q := case when found then coalesce((x->>'acceptedQuantity')::numeric,0) else l.quantity end;
     v_issue := x is not null;
   end if;$new$);

  anchor := $old$ update public.document_lines set accepted_quantity=q,fully_checked=x is null,metadata=metadata||jsonb_build_object('issueOpen',x is not null,'receipt',coalesce(x,'{}')) where id=l.id;$old$;
  if strpos(definition, anchor) = 0 then raise exception 'counted receipt line anchor missing'; end if;
  definition := replace(definition, anchor, $new$
   update public.document_lines set accepted_quantity=q,fully_checked=not v_issue,
     metadata=metadata||jsonb_build_object('issueOpen',v_issue,'receipt',coalesce(x,'{}'))
       || case when v_counted_lines is not null then jsonb_build_object('countedReceipt',jsonb_build_object(
         'expeditedQuantity',l.quantity::text,
         'receivedQuantity',v_reported::text,
         'recognizedQuantity',q::text,
         'remainingTransitQuantity',(l.quantity-q)::text,
         'excessQuantity',greatest(v_reported-l.quantity,0)::text
       )) else '{}'::jsonb end
   where id=l.id;$new$);

  anchor := $old$workflow_data=workflow_data||jsonb_build_object('acceptedBy',auth.uid(),'acceptedAt',now()) where id=p_id;$old$;
  if strpos(definition, anchor) = 0 then raise exception 'counted receipt note anchor missing'; end if;
  definition := replace(definition, anchor, $new$workflow_data=workflow_data||
   jsonb_build_object('acceptedBy',auth.uid(),'acceptedAt',now())||
   case when v_counted_lines is not null then
     jsonb_build_object('receiptNotes',coalesce(p_body#>>'{countedReceipt,notes}',''))
   else '{}'::jsonb end where id=p_id;$new$);

  anchor := $old$ if q<0 or q>l.quantity-l.accepted_quantity-l.reconciled_quantity or length(trim(coalesce(p_body->>'reason','')))<3 then raise exception 'invalid reconciliation';end if;$old$;
  if strpos(definition, anchor) = 0 then raise exception 'transit quantity guard anchor missing'; end if;
  definition := replace(definition, anchor, anchor || $new$
 if l.metadata ? 'countedReceipt' and q <= 0 then
   raise exception 'reconciliation requires a positive quantity in transit' using errcode = '22023';
 end if;$new$);

  anchor := $old$ perform private.record_document_event(p_id,lower(d.type)||'.'||p_action,p_body,p_key);$old$;
  if strpos(definition, anchor) = 0 then raise exception 'counted receipt journal anchor missing'; end if;
  execute replace(definition, anchor, anchor || $new$
 if v_counted_lines is not null then perform private.require_cap(d.care_recipient_id,'ent.receive'); end if;
$new$);
end;
$migration$;
