create function private.can_decide_document_follow_up(d public.operational_documents,p_action text) returns boolean
language sql stable set search_path='' as $body$
  select coalesce(private.can(d.care_recipient_id,lower(d.type)||'.read') and (
    public.recipient_role(d.care_recipient_id)='admin' and private.can(d.care_recipient_id,'access.manage')
    or p_action='complete' and (
      d.type='REQ' and private.can(d.care_recipient_id,'req.review')
      or d.type='COM' and private.can(d.care_recipient_id,'com.approve')
      or d.kind in ('ENT','DEV') and (
        d.recipient_id=auth.uid() and private.can(d.care_recipient_id,'ent.receive')
        or d.created_by=auth.uid() and private.can(d.care_recipient_id,'ent.create')
      )
    )
  ),false);
$body$;

create function private.document_follow_up_reference(p_id uuid) returns jsonb
language plpgsql stable set search_path='' as $body$
declare
  d public.operational_documents;
  req public.requisitions;
  lifecycle public.requisition_lifecycle;
  previous public.document_events;
  progress jsonb;
  facts jsonb;
  state text;
  checks text[]:=array[]::text[];
  prior_status text;
  supports boolean;
begin
  select * into d from public.operational_documents where id=p_id;
  if not found then raise exception 'document not found' using errcode='42501'; end if;
  perform private.require_cap(d.care_recipient_id,lower(d.type)||'.read');
  select * into req from public.requisitions where id=p_id;
  select * into lifecycle from public.requisition_lifecycle where requisition_id=p_id;
  supports:=d.kind in ('REQ','COM','ENT','DEV') and d.protocol is not null
    and not coalesce(req.is_historical,false) and (d.type<>'REQ' or lifecycle.requisition_id is not null);
  state:=case
    when lifecycle.archived_at is not null then 'archived'
    when d.status='cancelled' and (d.type='REQ' or d.workflow_data#>>'{documentFollowUp,physicalStatus}' is distinct from 'cancelled') then 'cancelled'
    when lifecycle.completed_at is not null and d.status<>'cancelled' then 'completed'
    when d.type<>'REQ' and d.workflow_data#>>'{documentFollowUp,state}'='completed' then 'completed'
    when d.workflow_data#>>'{documentFollowUp,state}'='reopened' then 'reopened'
    when d.status='cancelled' then 'cancelled'
    else 'open'
  end;

  if state='cancelled' then
    select * into previous from public.document_events e
    where e.document_id=p_id and e.body->>'status'='cancelled'
      and e.action in ('req.status','com.cancel','ent.cancel','ent.consent_cancel')
    order by e.version desc limit 1;
    if d.type='REQ' and previous.id is not null then
      select h.from_status::text into prior_status from public.requisition_status_history h
      where h.requisition_id=p_id and h.to_status='cancelled'
      order by h.changed_at desc,h.id desc limit 1;
    end if;
  elsif state='completed' then
    select * into previous from public.document_events e
    where e.document_id=p_id and e.action in ('req.completed','req.follow_up_completed','com.follow_up_completed','ent.follow_up_completed')
    order by e.version desc limit 1;
  end if;

  if supports and state in ('open','reopened') then
    if state='reopened' and d.status='cancelled' then
      -- These are closure acts on follow-up after an actual cancellation. The cancelled
      -- supply never returns to a state that accepts a receipt or buys materials.
      null;
    elsif d.type='REQ' then
      progress:=public.requisition_fulfillment(p_id);
      if (progress->>'total')::int=0 or progress->>'total'<>progress->>'fulfilled' then
        checks:=array_append(checks,'req_fulfillment');
      end if;
      if exists(select 1 from public.document_request_links k join public.requisition_items i on i.id=k.requisition_item_id
        join public.document_lines l on l.id=k.document_line_id join public.operational_documents ent on ent.id=l.document_id
        where i.requisition_id=p_id and ent.kind='ENT' and ent.status<>'cancelled'
          and (ent.status='cancellation_pending' or l.metadata->>'issueOpen'='true')) then
        checks:=array_append(checks,'req_delivery');
      end if;
    elsif d.type='COM' then
      progress:=private.purchase_progress(p_id);
      if d.status in ('draft','pending_approval','rejected') then checks:=array_append(checks,'com_approval'); end if;
      if progress is null or coalesce((progress->>'expectationPending')::boolean,true)
        or not (coalesce((progress->>'expectationClosed')::boolean,false)
          or exists(select 1 from public.document_lines where document_id=p_id and purchased_quantity>0)) then
        checks:=array_append(checks,'com_expectation');
      end if;
      if coalesce((progress->>'physicalPending')::boolean,true) then checks:=array_append(checks,'com_arrival'); end if;
      if coalesce((progress->>'validationPending')::boolean,true)
         or exists(select 1 from public.purchase_receipts where document_id=p_id and state in ('pending','correction_requested')) then
        checks:=array_append(checks,'com_validation');
      end if;
    else
      if d.status not in ('confirmed','disputed') or not (d.workflow_data ? 'acceptedAt') then
        checks:=array_append(checks,'ent_receipt');
      end if;
      if exists(select 1 from public.document_lines l where l.document_id=p_id
        and (l.accepted_quantity+l.reconciled_quantity<l.quantity or l.metadata->>'issueOpen'='true'
          or coalesce((l.metadata#>>'{countedReceipt,excessQuantity}')::numeric,0)>0)) then
        checks:=array_append(checks,'ent_difference');
      end if;
      if d.kind='ENT' and exists(select 1 from public.document_lines l where l.document_id=p_id
        and private.delivery_need_context(d,l) and private.delivery_need_reassessment(l) and private.current_delivery_need(l) is null) then
        checks:=array_append(checks,'ent_need');
      end if;
    end if;
  end if;

  facts:=jsonb_build_object('documentId',d.id,'patientId',d.care_recipient_id,'version',d.version,'kind',d.kind,
    'state',state,'physicalStatus',d.status,'lastAct',d.workflow_data->'documentFollowUp',
    'decision',case when previous.id is not null then jsonb_build_object('id',previous.id,'action',previous.action,'actorName',previous.actor_name,
      'recordedAt',previous.created_at,'version',previous.version,'reason',previous.body#>>'{event,reason}') end,
    'blockers',checks,
    'canComplete',supports and state in ('open','reopened') and private.can_decide_document_follow_up(d,'complete'),
    'canReopen',supports and state in ('completed','cancelled') and previous.id is not null
      and (d.type<>'REQ' or state<>'cancelled' or coalesce(prior_status in ('submitted','under_review'),false))
      and private.can_decide_document_follow_up(d,'reopen'));
  return facts||jsonb_build_object('referenceHash',encode(extensions.digest(facts::text,'sha256'),'hex'));
end;
$body$;

create function public.document_follow_up_reference(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $body$
  select private.document_follow_up_reference(p_id);
$body$;

create function private.command_document_follow_up(p_id uuid,p_action text,p_body jsonb,p_key uuid,p_reference text)
returns jsonb language plpgsql set search_path='' as $body$
declare
  d public.operational_documents;
  reviewed jsonb;
  act jsonb;
  restored public.requisition_status;
  decision_reason text;
  recorded_at timestamptz:=clock_timestamp();
begin
  select * into strict d from public.operational_documents where id=p_id for update;
  if p_action not in ('complete','reopen') or p_action is null or p_body-'reason'<>'{}'::jsonb
    or (p_body ? 'reason' and jsonb_typeof(p_body->'reason') is distinct from 'string') then
    raise exception 'invalid document follow-up command' using errcode='22023';
  end if;
  decision_reason:=btrim(coalesce(p_body->>'reason',''));
  if private.bal_comment_units(decision_reason)>1000 or p_action='reopen' and length(decision_reason)<3 then
    raise exception 'invalid document follow-up reason' using errcode='22023';
  end if;
  if not private.can_decide_document_follow_up(d,p_action) then
    raise exception 'document follow-up authority required' using errcode='42501';
  end if;
  reviewed:=private.document_follow_up_reference(p_id);
  if p_reference is distinct from reviewed->>'referenceHash' then
    raise exception 'follow-up reference changed' using errcode='PT409';
  end if;
  if p_action='complete' and (not (reviewed->>'canComplete')::boolean or reviewed->'blockers'<>'[]'::jsonb)
    or p_action='reopen' and not (reviewed->>'canReopen')::boolean then
    raise exception 'follow-up decision unavailable for these facts' using errcode='PT409';
  end if;
  act:=jsonb_build_object(
    'state',case p_action when 'complete' then 'completed' else 'reopened' end,
    'reason',decision_reason,'recordedAt',recorded_at,'physicalStatus',d.status,
    'actorId',auth.uid(),'actorName',(select full_name from public.profiles where id=auth.uid()),
    'previousState',reviewed->>'state','previousDecision',reviewed->'decision',
    'previousFollowUp',case when p_action='complete' then reviewed#>'{lastAct,previousDecision}' end);
  if d.type='REQ' then
    if p_action='reopen' and reviewed->>'state'='cancelled' then
      select h.from_status into strict restored from public.requisition_status_history h
      where h.requisition_id=p_id and h.to_status='cancelled'
      order by h.changed_at desc,h.id desc limit 1;
      update public.requisitions set status=restored,updated_at=recorded_at where id=p_id;
      update public.requisition_status_history set reason=decision_reason
      where id=(select h.id from public.requisition_status_history h where h.requisition_id=p_id order by h.changed_at desc,h.id desc limit 1);
    end if;
    update public.requisition_lifecycle
      set completed_at=case when p_action='complete' then recorded_at end,
        manual_archive_required=manual_archive_required or (p_action='complete' and not coalesce(private.science_satisfied(p_id),false))
      where requisition_id=p_id;
  end if;
  update public.operational_documents set version=version+1,
    status=coalesce(restored::text,d.status),workflow_data=workflow_data||jsonb_build_object('documentFollowUp',act)
    where id=p_id;
  perform private.record_document_event(p_id,lower(d.type)||case p_action when 'complete' then '.follow_up_completed' else '.follow_up_reopened' end,act,p_key);
  return private.document_follow_up_reference(p_id);
end;
$body$;

revoke all on function private.can_decide_document_follow_up(public.operational_documents,text),
  private.document_follow_up_reference(uuid),private.command_document_follow_up(uuid,text,jsonb,uuid,text)
  from public,anon,authenticated,service_role;
revoke all on function public.document_follow_up_reference(uuid) from public,anon,authenticated,service_role;
grant execute on function public.document_follow_up_reference(uuid) to authenticated;

do $migration$
declare
  definition text;
  anchor text;
begin
  definition:=pg_get_functiondef('public.execute_document_decision(uuid,uuid,jsonb)'::regprocedure);
  anchor:=$old$domain not in ('requisition','supply','transfer','balance')$old$;
  if strpos(definition,anchor)=0 then raise exception 'follow-up domain anchor missing';end if;
  definition:=replace(definition,anchor,$new$domain not in ('requisition','supply','transfer','balance','lifecycle')$new$);
  anchor:=$old$ if domain='requisition' then
  if d.type<>'REQ'$old$;
  if strpos(definition,anchor)=0 then raise exception 'follow-up command anchor missing';end if;
  definition:=replace(definition,anchor,$new$ if domain='lifecycle' then
  outcome:=private.command_document_follow_up(p_document,action,body,p_key,p_intention->>'referenceHash');
 elsif domain='requisition' then
  if d.type<>'REQ'$new$);
  anchor:=$old$ if domain='requisition' then
  perform private.require_req_decision_authority(d.care_recipient_id,action);$old$;
  if strpos(definition,anchor)=0 then raise exception 'follow-up post-receipt authority anchor missing'; end if;
  execute replace(definition,anchor,$new$ if domain='lifecycle' then
  if not private.can_decide_document_follow_up(d,action) then
   raise exception 'document follow-up authority changed' using errcode='42501'; end if;
 elsif domain='requisition' then
  perform private.require_req_decision_authority(d.care_recipient_id,action);$new$);

  -- A deliberate reversal survives a scheduled refresh. A new review can
  -- complete the REQ after verifying its current material facts.
  definition:=pg_get_functiondef('private.refresh_requisition_lifecycle(uuid)'::regprocedure);
  anchor:=$old$if s.completed_at is null then$old$;
  if strpos(definition,anchor)=0 then raise exception 'REQ follow-up hold anchor missing'; end if;
  definition:=replace(definition,anchor,$new$if s.completed_at is null and not exists(
    select 1 from public.operational_documents d where d.id=p_id
      and d.workflow_data#>>'{documentFollowUp,state}'='reopened'
  ) then$new$);
  anchor:=$old$if (total>0 and total=fulfilled and not blocked)=(s.completed_at is not null) then$old$;
  if strpos(definition,anchor)=0 then raise exception 'REQ follow-up observation anchor missing'; end if;
  execute replace(definition,anchor,$new$if (total>0 and total=fulfilled and not blocked)=(s.completed_at is not null)
    or exists(select 1 from public.operational_documents d where d.id=p_id
      and d.workflow_data#>>'{documentFollowUp,state}'='reopened') then$new$);

  definition:=pg_get_viewdef('private.document_progress_facts'::regclass,false);
  anchor:='''req.reopened''::text';
  if strpos(definition,anchor)=0 then raise exception 'follow-up progress anchor missing';end if;
  execute 'create or replace view private.document_progress_facts as ' || replace(definition,anchor,anchor ||
    ', ''req.follow_up_completed''::text, ''req.follow_up_reopened''::text, ''com.follow_up_completed''::text, ''com.follow_up_reopened''::text, ''ent.follow_up_completed''::text, ''ent.follow_up_reopened''::text');
end;
$migration$;
