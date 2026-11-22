do $migration$
declare
  definition text;
  anchor text;
begin
  -- A personal count of zero is still a receipt and requires the receiver's own decision.
  definition := pg_get_functiondef('public.fluent_pre_transfer_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
  anchor := $old$p_action='cancel' and exists(select 1 from public.document_lines where document_id=p_id and accepted_quantity>0)$old$;
  if strpos(definition,anchor)=0 then raise exception 'personal cancellation routing anchor missing'; end if;
  execute replace(definition,anchor,$new$p_action='cancel' and (v_d.workflow_data ? 'acceptedAt' or exists(select 1 from public.document_lines where document_id=p_id and accepted_quantity>0))$new$);

  definition := pg_get_functiondef('private.command_delivery_cancellation(uuid,text,jsonb,uuid,integer)'::regprocedure);
  anchor := $old$or not exists(select 1 from public.document_lines where document_id=p_id and accepted_quantity>0) then raise exception 'invalid cancellation request state'$old$;
  if strpos(definition,anchor)=0 then raise exception 'personal cancellation eligibility anchor missing'; end if;
  execute replace(definition,anchor,$new$or not (d.workflow_data ? 'acceptedAt' or exists(select 1 from public.document_lines where document_id=p_id and accepted_quantity>0)) then raise exception 'invalid cancellation request state'$new$);

  definition := pg_get_functiondef('public.audited_legacy_supply_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
  anchor := $old$ if d.type='ENT' then
 if exists(select 1 from public.document_lines where document_id=p_id and accepted_quantity>0) then
 perform private.require_cap(d.care_recipient_id,'ent.cancel');
 update public.operational_documents set status='cancellation_pending',workflow_data=workflow_data||jsonb_build_object('cancellationRequestedBy',auth.uid(),'cancellationReason',p_body->>'reason') where id=p_id;
 else
 if d.created_by<>auth.uid() and not public.can_manage_recipient(d.care_recipient_id) then raise exception 'cancel not authorized' using errcode='42501';end if;
 if d.status<>'draft' then for l in select * from public.document_lines where document_id=p_id order by product_id loop
 q:=l.quantity-l.accepted_quantity-l.reconciled_quantity;
 if q>0 then perform private.move_stock(d.care_recipient_id,l.product_id,q,'TRANSIT',d.payload->>'source','Cancelamento ENT antes do aceite','document',d.id);end if;
 end loop;end if;
 update public.operational_documents set status='cancelled' where id=p_id;
 end if;
 else$old$;
  if strpos(definition,anchor)=0 then raise exception 'physical cancellation anchor missing'; end if;
  definition := replace(definition,anchor,$new$ if d.type='ENT' then
   if d.created_by is distinct from auth.uid() and not public.can_manage_recipient(d.care_recipient_id) then
     raise exception 'cancel not authorized' using errcode='42501';
   end if;
   if d.status not in ('draft','pending_receipt') or d.workflow_data ? 'acceptedAt'
     or exists(select 1 from public.document_lines where document_id=p_id and accepted_quantity>0) then
     raise exception 'delivery changed before physical cancellation' using errcode='PT409';
   end if;
   if jsonb_typeof(p_body->'reason') is distinct from 'string' or private.bal_comment_units(p_body->>'reason')>1000
     or p_body-array['reason','transitReturned'] <> '{}'::jsonb
     or (d.status='draft' and p_body ? 'transitReturned') then
     raise exception 'invalid physical cancellation' using errcode='22023';
   end if;
   if d.status='pending_receipt' then
     if p_body->'transitReturned' is distinct from 'true'::jsonb then
       raise exception 'confirm physical return before cancelling delivery' using errcode='22023';
     end if;
     for l in select * from public.document_lines where document_id=p_id order by product_id,id loop
       q:=l.quantity-l.accepted_quantity-l.reconciled_quantity;
       if q>0 then
         perform private.move_stock(d.care_recipient_id,l.product_id,q,'TRANSIT',d.payload->>'source','Cancelamento ENT antes do aceite','document',d.id);
         update public.document_lines set reconciled_quantity=reconciled_quantity+q,
           metadata=metadata||jsonb_build_object('cancelledTransitReturn',q::text,'issueOpen',false)
           where id=l.id;
       end if;
     end loop;
   end if;
   update public.operational_documents set status='cancelled' where id=p_id;
 else$new$);
  anchor := $old$ if v_counted_lines is not null then perform private.require_cap(d.care_recipient_id,'ent.receive'); end if;$old$;
  if strpos(definition,anchor)=0 then raise exception 'physical cancellation post-event authority anchor missing'; end if;
  execute replace(definition,anchor,anchor||$new$
 if d.type='ENT' and p_action='cancel' then
   perform private.require_cap(d.care_recipient_id,'ent.read');
   if d.created_by is distinct from auth.uid() and not public.can_manage_recipient(d.care_recipient_id) then
     raise exception 'cancellation authority changed' using errcode='42501';
   end if;
 end if;
$new$);
end;
$migration$;
