-- Physical custody and the family's assessment have distinct effects.
create function private.delivery_need_context(d public.operational_documents, l public.document_lines)
returns boolean language sql stable set search_path='' as $$
  select coalesce(d.kind='ENT' and d.workflow_data ? 'acceptedAt'
    and l.family_fulfillment in ('partial','complete')
    and exists(select 1 from public.document_request_links where document_line_id=l.id),false);
$$;

create function private.delivery_need_reassessment(l public.document_lines) returns boolean
language sql stable set search_path='' as $$
  select coalesce(l.metadata ? 'fulfillmentReviewRequest'
    or (l.metadata ? 'countedReceipt'
      and (l.metadata#>>'{countedReceipt,receivedQuantity}')::numeric <> l.quantity)
    or (l.family_fulfillment='complete' and l.accepted_quantity>0 and l.accepted_quantity<l.quantity), false);
$$;

create function private.current_delivery_need(l public.document_lines)
returns text language sql stable set search_path='' as $$
  select r.decision from private.requisition_fulfillment_reviews r
  where r.line_id=l.id and r.accepted_quantity=l.accepted_quantity and r.expedited_quantity=l.quantity
    and (not (l.metadata ? 'fulfillmentReviewRequest')
      or r.recorded_at >= (l.metadata#>>'{fulfillmentReviewRequest,recordedAt}')::timestamptz)
  order by r.recorded_at desc,r.id desc limit 1;
$$;

create function private.can_reconcile_delivery(d public.operational_documents)
returns boolean language sql stable set search_path='' as $$
  select coalesce(
    auth.uid()=d.recipient_id and private.can(d.care_recipient_id,'ent.receive')
    or auth.uid()<>d.recipient_id and (
      public.can_manage_recipient(d.care_recipient_id) and private.can(d.care_recipient_id,'access.manage')
      or d.kind='ENT' and d.payload->>'source'='FAMILY' and d.workflow_data ? 'acceptedAt'
        and private.can(d.care_recipient_id,'ent.create')
        and private.family_fulfillment_authorized(d.care_recipient_id,auth.uid())
    ),false);
$$;

create function private.delivery_need_request(p_reason text) returns jsonb
language sql volatile set search_path='' as $$
  select jsonb_build_object('reason',p_reason,'actorId',p.id,'actorName',p.full_name,'recordedAt',clock_timestamp())
  from public.profiles p where p.id=auth.uid() and p.status='active';
$$;

create function private.notify_delivery_need(d public.operational_documents, p_event uuid)
returns void language sql set search_path='' as $$
  insert into public.requisition_notifications (
    care_recipient_id,document_id,document_event_id,recipient_user_id,recipient_group,recipient_label,channel,event_key
  )
  select d.care_recipient_id,d.id,p_event,m.user_id,
    case m.role::text when 'family' then 'family' else 'other' end,
    p.full_name,'internal','ent.fulfillment_review_requested'
  from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id
  where m.care_recipient_id=d.care_recipient_id
    and m.user_id is distinct from auth.uid()
    and private.family_fulfillment_authorized(m.care_recipient_id,m.user_id)
    and private.member_can(m.care_recipient_id,m.user_id,'ent.read')
  on conflict do nothing;
$$;

revoke all on function private.delivery_need_context(public.operational_documents,public.document_lines),
 private.delivery_need_reassessment(public.document_lines),private.current_delivery_need(public.document_lines),
 private.can_reconcile_delivery(public.operational_documents),private.delivery_need_request(text),
 private.notify_delivery_need(public.operational_documents,uuid)
 from public,anon,authenticated,service_role;

create or replace function private.requisition_item_service(p_item uuid) returns text
language sql stable security definer set search_path='' as $$
  with deliveries as (
    select l.accepted_quantity,l.quantity,l.family_fulfillment,l.fully_checked,l.metadata,
      private.current_delivery_need(l) reviewed,
      private.delivery_need_context(d,l) eligible,
      private.delivery_need_reassessment(l) needs_review
    from public.document_request_links k join public.document_lines l on l.id=k.document_line_id
    join public.operational_documents d on d.id=l.document_id
    where k.requisition_item_id=p_item and d.kind='ENT' and d.status<>'cancelled'
  )
  select case
    when exists(select 1 from deliveries where accepted_quantity>0 and
      (reviewed='complete' or (reviewed is null and not (eligible and needs_review)
        and family_fulfillment='complete' and accepted_quantity=quantity and fully_checked
        and metadata->>'issueOpen' is distinct from 'true'))) then 'fulfilled'
    when exists(select 1 from deliveries where eligible and needs_review and reviewed is null) then 'review_required'
    when exists(select 1 from deliveries where accepted_quantity>0 and
      (reviewed='partial' or reviewed is null and family_fulfillment='partial')) then 'partial'
    else 'pending'
  end;
$$;

do $migration$
declare definition text; anchor text;
begin
  definition := pg_get_functiondef('public.review_request_fulfillment(uuid,uuid,text,text,uuid,integer)'::regprocedure);
  anchor := $old$or l.family_fulfillment is distinct from 'complete' or l.accepted_quantity<=0 or l.accepted_quantity>=l.quantity$old$;
  if strpos(definition,anchor)=0 then raise exception 'family assessment applicability anchor missing'; end if;
  definition := replace(definition,anchor,$new$or d.status not in ('confirmed','disputed') or not private.delivery_need_context(d,l)
  or (p_decision='complete' and l.accepted_quantity=0)
  or (coalesce(private.current_delivery_need(l),l.family_fulfillment)<>p_decision and length(btrim(p_reason))<3)$new$);
  execute definition;

  definition := pg_get_functiondef('private.validate_counted_receipt(public.operational_documents,jsonb)'::regprocedure);
  anchor := $old$item - array['lineId', 'receivedQuantity']$old$;
  if strpos(definition,anchor)=0 then raise exception 'counted assessment shape anchor missing'; end if;
  definition := replace(definition,anchor,$new$item - array['lineId', 'receivedQuantity','reviewReason']$new$);
  anchor := 'seen := array_append(seen, line_id);';
  if strpos(definition,anchor)=0 then raise exception 'counted assessment line anchor missing'; end if;
  execute replace(definition,anchor,$new$
    if item ? 'reviewReason' and (
      jsonb_typeof(item->'reviewReason') is distinct from 'string'
      or length(btrim(item->>'reviewReason'))<3 or private.bal_comment_units(item->>'reviewReason')>1000
      or d.kind<>'ENT' or d.payload->>'destination' is distinct from 'CARE_TEAM'
      or not exists(
        select 1 from public.document_lines l where l.id=line_id and l.document_id=d.id and l.quantity=received
          and l.family_fulfillment in ('partial','complete')
          and exists(select 1 from public.document_request_links where document_line_id=l.id)
      )
    ) then raise exception 'team review request requires a linked material with confirmed quantity' using errcode='22023'; end if;
  $new$||anchor);

  definition := pg_get_functiondef('private.validate_supply_command(public.operational_documents,text,jsonb)'::regprocedure);
  anchor := $old$coalesce(p_body->>'resolution','') not in ('received','missing','returned')$old$;
  if strpos(definition,anchor)=0 then raise exception 'reconciliation validation anchor missing'; end if;
  execute replace(definition,anchor,$new$coalesce(p_body->>'resolution','') not in ('received','missing','returned','not_sent')$new$);

  definition := pg_get_functiondef('public.audited_legacy_supply_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
  anchor := $old$item->'receivedQuantity')$old$;
  if strpos(definition,anchor)=0 then raise exception 'receipt request material anchor missing'; end if;
  definition:=replace(definition,anchor,$new$item)$new$);
  anchor := $old$v_reported := (v_counted_lines->>l.id::text)::numeric;$old$;
  if strpos(definition,anchor)=0 then raise exception 'receipt request quantity anchor missing'; end if;
  definition:=replace(definition,anchor,$new$v_reported := (v_counted_lines->l.id::text->>'receivedQuantity')::numeric;$new$);
  anchor := $old$)) else '{}'::jsonb end
   where id=l.id;$old$;
  anchor := replace(anchor,chr(13)||chr(10),chr(10));
  definition := replace(definition,chr(13)||chr(10),chr(10));
  if strpos(definition,anchor)=0 then raise exception 'receipt request projection anchor missing'; end if;
  definition:=replace(definition,anchor,$new$)) else '{}'::jsonb end
       || case when v_counted_lines->l.id::text ? 'reviewReason' then
         jsonb_build_object('fulfillmentReviewRequest',private.delivery_need_request(v_counted_lines->l.id::text->>'reviewReason'))
       else '{}'::jsonb end
   where id=l.id;$new$);

  anchor := $old$not (auth.uid()=d.recipient_id and private.can(d.care_recipient_id,'ent.receive') or auth.uid()<>d.recipient_id and public.can_manage_recipient(d.care_recipient_id) and private.can(d.care_recipient_id,'access.manage'))$old$;
  if strpos(definition,anchor)=0 then raise exception 'native reconciliation authority anchor missing'; end if;
  definition:=replace(definition,anchor,'not private.can_reconcile_delivery(d)');
  anchor := $old$elsif p_body->>'resolution' in ('missing','returned') then$old$;
  if strpos(definition,anchor)=0 then raise exception 'native return resolution anchor missing'; end if;
  definition:=replace(definition,anchor,$new$elsif p_body->>'resolution' in ('missing','returned','not_sent') then$new$);
  anchor := $old$case when p_body->>'resolution'='returned' then d.payload->>'source' end$old$;
  if strpos(definition,anchor)=0 then raise exception 'native return custody anchor missing'; end if;
  definition:=replace(definition,anchor,$new$case when p_body->>'resolution' in ('returned','not_sent') then d.payload->>'source' end$new$);
  anchor := $old$ update public.document_lines set fully_checked=accepted_quantity=quantity,metadata=metadata||jsonb_build_object('issueOpen',accepted_quantity+reconciled_quantity<quantity) where id=l.id;$old$;
  if strpos(definition,anchor)=0 then raise exception 'native reconciliation result anchor missing'; end if;
  definition:=replace(definition,anchor,anchor||$new$
 if p_body ? 'familyAssessment' then
   select * into strict l from public.document_lines where id=l.id and document_id=d.id;
   if not private.can(d.care_recipient_id,'ent.create') or not private.family_fulfillment_authorized(d.care_recipient_id,auth.uid()) then
     raise exception 'family authority required' using errcode='42501';
   end if;
   if d.status<>'disputed' or not private.delivery_need_context(d,l) or not private.delivery_need_reassessment(l)
     or q<=0 or l.accepted_quantity+l.reconciled_quantity<>l.quantity
     or private.current_delivery_need(l) is not null
     or coalesce(p_body->>'familyAssessment','') not in ('partial','complete')
     or (p_body->>'familyAssessment'='complete' and l.accepted_quantity=0)
     or private.bal_comment_units(p_body->>'reason')>1000 then
     raise exception 'family evaluation not applicable to this reconciliation' using errcode='PT409';
   end if;
   insert into private.requisition_fulfillment_reviews (
     document_id,line_id,actor_id,actor_name,idempotency_key,expected_version,decision,reason,expedited_quantity,accepted_quantity
   )
   select d.id,l.id,auth.uid(),p.full_name,p_key,d.version,p_body->>'familyAssessment',p_body->>'reason',l.quantity,l.accepted_quantity
   from public.profiles p where p.id=auth.uid() and p.status='active';
   if not found then raise exception 'active family identity required' using errcode='42501';end if;
 end if;
$new$);
  anchor := $old$ elsif d.type='BAL' and p_action='approve' then$old$;
  if strpos(definition,anchor)=0 then raise exception 'standalone delivery request anchor missing'; end if;
  definition:=replace(definition,anchor,$new$
 elsif d.type='ENT' and p_action='request_fulfillment_review' then
   perform private.require_cap(d.care_recipient_id,'ent.receive');
   if auth.uid() is distinct from d.recipient_id or d.payload->>'destination' is distinct from 'CARE_TEAM' then
     raise exception 'designated team recipient required' using errcode='42501';
   end if;
   if p_body-array['lineId','reason']<>'{}' or not coalesce(pg_input_is_valid(p_body->>'lineId','uuid'),false)
     or jsonb_typeof(p_body->'reason') is distinct from 'string'
     or length(btrim(p_body->>'reason'))<3 or private.bal_comment_units(p_body->>'reason')>1000 then
     raise exception 'invalid team review request' using errcode='22023';
   end if;
   select * into l from public.document_lines where id=(p_body->>'lineId')::uuid and document_id=d.id;
   if not found or d.status not in ('confirmed','disputed') or not private.delivery_need_context(d,l)
     or l.accepted_quantity<>l.quantity or l.metadata->>'issueOpen'='true'
     or (private.delivery_need_reassessment(l) and private.current_delivery_need(l) is null) then
     raise exception 'team review request already pending or quantity differs' using errcode='PT409';
   end if;
   update public.document_lines set metadata=metadata||jsonb_build_object('fulfillmentReviewRequest',private.delivery_need_request(p_body->>'reason')) where id=l.id;
$new$||anchor);

  anchor := $old$if d.type='ENT' and p_action='resolve' then perform private.require_cap(d.care_recipient_id,case when auth.uid()=d.recipient_id then 'ent.receive' else 'access.manage' end);end if;$old$;
  if strpos(definition,anchor)=0 then raise exception 'reconciliation post-journal authority anchor missing'; end if;
  execute replace(definition,anchor,$new$
 if d.type='ENT' and p_action='resolve' then
   if not private.can_reconcile_delivery(d) or p_body ? 'familyAssessment'
     and (not private.can(d.care_recipient_id,'ent.create') or not private.family_fulfillment_authorized(d.care_recipient_id,auth.uid()))
     then raise exception 'reconciliation authority changed' using errcode='42501';end if;
 end if;
 if d.type='ENT' and p_action='request_fulfillment_review' then perform private.require_cap(d.care_recipient_id,'ent.receive');end if;
 if d.kind='ENT' and p_action in ('receive','resolve','request_fulfillment_review') then
   select * into d from public.operational_documents where id=p_id;
   if exists(select 1 from public.document_lines l where l.document_id=d.id
     and (p_action='receive' or l.id=(p_body->>'lineId')::uuid)
     and (p_action<>'resolve' or l.accepted_quantity+l.reconciled_quantity=l.quantity)
     and private.delivery_need_context(d,l) and private.delivery_need_reassessment(l) and private.current_delivery_need(l) is null)
   then perform private.notify_delivery_need(d,(select id from public.document_events where document_id=d.id and version=d.version));
   end if;
 end if;
 $new$);

  definition := pg_get_functiondef('public.execute_document_decision(uuid,uuid,jsonb)'::regprocedure);
  anchor := $old$elsif action in ('receive','divergence') then$old$;
  if strpos(definition,anchor)=0 then raise exception 'official resolution authority anchor missing'; end if;
  execute replace(definition,anchor,$new$
 elsif action='resolve' then
   if not private.can_reconcile_delivery(d) or body ? 'familyAssessment'
     and (not private.can(d.care_recipient_id,'ent.create') or not private.family_fulfillment_authorized(d.care_recipient_id,auth.uid()))
     then raise exception 'reconciliation authority changed' using errcode='42501';end if;
 elsif action in ('receive','divergence','request_fulfillment_review') then$new$);

  definition := pg_get_functiondef('private.freeze_pdf_fidelity_facts()'::regprocedure);
  anchor := $old$in ('received','missing','returned')$old$;
  if strpos(definition,anchor)=0 then raise exception 'PDF transit outcomes anchor missing'; end if;
  execute replace(definition,anchor,$new$in ('received','missing','returned','not_sent')$new$);
end;
$migration$;
