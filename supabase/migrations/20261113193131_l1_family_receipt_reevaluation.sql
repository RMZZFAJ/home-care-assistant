-- Owner decision R3, 13/11/2026: a smaller physical receipt needs a new family evaluation.
create table private.requisition_fulfillment_reviews (
 id uuid primary key default gen_random_uuid(),
 document_id uuid not null references public.operational_documents(id),
 line_id uuid not null references public.document_lines(id),
 actor_id uuid not null references public.profiles(id),
 actor_name text not null,
 recorded_at timestamptz not null default clock_timestamp(),
 idempotency_key uuid not null,
 expected_version integer not null,
 decision text not null check(decision in ('partial','complete')),
 reason text not null check(private.bal_comment_units(reason)<=1000),
 expedited_quantity numeric not null,
 accepted_quantity numeric not null,
 unique(actor_id,idempotency_key)
);
alter table private.requisition_fulfillment_reviews enable row level security;
revoke all on private.requisition_fulfillment_reviews from public,anon,authenticated,service_role;
create index fulfillment_reviews_line on private.requisition_fulfillment_reviews(line_id,recorded_at desc,id);
create trigger preserve_fulfillment_review before update or delete on private.requisition_fulfillment_reviews
 for each row execute function private.preserve_document_progress_note();

create function private.fulfillment_review_facts(p_document uuid) returns jsonb
language sql stable set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'lineId',r.line_id,'decision',r.decision,'reason',r.reason,
  'actorId',r.actor_id,'actorName',r.actor_name,'recordedAt',r.recorded_at,'expectedVersion',r.expected_version,
  'expeditedQuantity',r.expedited_quantity::text,'acceptedQuantity',r.accepted_quantity::text) order by r.recorded_at,r.id),'[]'::jsonb)
 from private.requisition_fulfillment_reviews r where r.document_id=p_document;
$$;
revoke all on function private.fulfillment_review_facts(uuid) from public,anon,authenticated,service_role;

create or replace function private.requisition_item_service(p_item uuid) returns text
language sql stable security definer set search_path='' as $$
 with deliveries as (
  select l.*,d.status,e.decision reviewed from public.document_request_links k join public.document_lines l on l.id=k.document_line_id
  join public.operational_documents d on d.id=l.document_id
  left join lateral (select r.decision from private.requisition_fulfillment_reviews r where r.line_id=l.id
   and r.accepted_quantity=l.accepted_quantity and r.expedited_quantity=l.quantity order by r.recorded_at desc,r.id desc limit 1) e on true
  where k.requisition_item_id=p_item and d.type='ENT' and d.kind='ENT' and d.status<>'cancelled'
 ) select case
  when exists(select 1 from deliveries where family_fulfillment='complete' and
   (accepted_quantity=quantity and fully_checked and not coalesce((metadata->>'issueOpen')::boolean,false)
    or accepted_quantity>0 and accepted_quantity<quantity and reviewed='complete')) then 'fulfilled'
  when exists(select 1 from deliveries where family_fulfillment='complete' and accepted_quantity>0 and accepted_quantity<quantity and reviewed is null) then 'review_required'
  when exists(select 1 from deliveries where accepted_quantity>0 and (family_fulfillment='partial' or reviewed='partial')) then 'partial'
  else 'pending' end;
$$;

create function public.review_request_fulfillment(p_document uuid,p_line uuid,p_decision text,p_reason text,p_key uuid,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;l public.document_lines;r private.requisition_fulfillment_reviews;actor_name text;
begin
 if private.auth_session() is null then raise exception 'active identity required' using errcode='42501';end if;
 select * into d from public.operational_documents where id=p_document;
 if not found or not private.can(d.care_recipient_id,'ent.read') then raise exception 'document not found' using errcode='42501';end if;
 if p_key is null or p_line is null or p_decision not in ('partial','complete') or p_reason is null
  or private.bal_comment_units(p_reason)>1000 or p_version is null or p_version<1 then raise exception 'invalid family evaluation' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('fulfillment-review:'||auth.uid()||':'||p_key,0));
 select * into r from private.requisition_fulfillment_reviews where actor_id=auth.uid() and idempotency_key=p_key;
 if found then
  if r.document_id<>p_document or r.line_id<>p_line or r.decision<>p_decision or r.reason<>p_reason or r.expected_version<>p_version
   then raise exception 'family evaluation intention differs' using errcode='23505';end if;
  if private.auth_session() is null or not private.can(d.care_recipient_id,'ent.read') then raise exception 'document not found' using errcode='42501';end if;
  return jsonb_build_object('key',p_key,'documentId',p_document,'lineId',p_line,'reviewId',r.id,'decision',r.decision,'recordedAt',r.recorded_at,'recovered',true);
 end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||d.care_recipient_id,0));
 select * into d from public.operational_documents where id=p_document for update;
 perform private.require_cap(d.care_recipient_id,'ent.create');
 if not private.requisition_family_representative(d.care_recipient_id,auth.uid()) then raise exception 'family authority required' using errcode='42501';end if;
 if d.version<>p_version then raise exception 'family evaluation reference changed' using errcode='PT409';end if;
 select * into l from public.document_lines where id=p_line and document_id=d.id;
 if not found or d.kind<>'ENT' or d.status in ('cancelled','cancellation_pending','administratively_closed')
  or l.family_fulfillment is distinct from 'complete' or l.accepted_quantity<=0 or l.accepted_quantity>=l.quantity
  or not exists(select 1 from public.document_request_links where document_line_id=l.id) then
  raise exception 'family evaluation no longer applicable' using errcode='PT409';end if;
 select full_name into actor_name from public.profiles where id=auth.uid() and status='active';
 if actor_name is null then raise exception 'active family identity required' using errcode='42501';end if;
 insert into private.requisition_fulfillment_reviews(document_id,line_id,actor_id,actor_name,idempotency_key,expected_version,decision,reason,expedited_quantity,accepted_quantity)
 values(d.id,l.id,auth.uid(),actor_name,p_key,p_version,p_decision,p_reason,l.quantity,l.accepted_quantity) returning * into r;
 update public.operational_documents set version=version+1 where id=d.id;
 perform private.record_document_event(d.id,'ent.fulfillment_reviewed',jsonb_build_object('reviewId',r.id,'lineId',l.id,'decision',r.decision,'reason',r.reason),p_key);
 perform private.require_cap(d.care_recipient_id,'ent.create');
 if not private.requisition_family_representative(d.care_recipient_id,auth.uid()) then raise exception 'family authority changed' using errcode='42501';end if;
 return jsonb_build_object('key',p_key,'documentId',p_document,'lineId',p_line,'reviewId',r.id,'decision',r.decision,'recordedAt',r.recorded_at,'recovered',false);
end;$$;
revoke all on function public.review_request_fulfillment(uuid,uuid,text,text,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.review_request_fulfillment(uuid,uuid,text,text,uuid,integer) to authenticated;

do $l1$
declare definition text;anchor text;
begin
 definition:=pg_get_functiondef('public.operational_document(uuid)'::regprocedure);
 anchor:='return to_jsonb(d)||';
 if position(anchor in definition)=0 then raise exception 'L1 evaluation read projection drift';end if;
 execute replace(definition,anchor,'return to_jsonb(d)||jsonb_build_object(''fulfillmentReviews'',private.fulfillment_review_facts(d.id))||');
 definition:=pg_get_functiondef('private.record_document_event(uuid,text,jsonb,uuid)'::regprocedure);
 anchor:='h:=encode(extensions.digest(s::text,''sha256''),''hex'');';
 if position(anchor in definition)=0 then raise exception 'L1 evaluation snapshot drift';end if;
 execute replace(definition,anchor,'if d.type=''ENT'' then s:=s||jsonb_build_object(''fulfillmentReviews'',private.fulfillment_review_facts(d.id));end if;'||anchor);
 definition:=pg_get_functiondef('public.requisition_fulfillment(uuid)'::regprocedure);
 execute replace(replace(definition,'''reserved'',count(*) filter(where service=''reserved'')','''reviewRequired'',count(*) filter(where service=''review_required'')'),'''serviceStatus'',service','''serviceStatus'',service');
end;$l1$;

create or replace view private.document_progress_facts as
 select e.id,e.document_id,e.created_at recorded_at,e.action,e.version,e.actor_id,e.actor_name from public.document_events e where e.action=any(array[
 'req.issued','req.legacy_imported','req.science_recorded','req.science_satisfied','req.item_resolved',
 'req.completed','req.fulfillment_updated','req.reopened','req.archived.manual','req.archived.automatic','req.remaining_need_declared',
 'com.draft','com.issued','com.submit','com.approve','com.purchase','com.receive','com.validate_receipt','com.reject_receipt','com.close_expectation',
 'ent.draft','ent.issued','ent.submit','ent.reassign','ent.receive','ent.resolve','ent.cancel','ent.consent_cancel','ent.refuse_cancellation',
 'ent.withdraw_cancellation','ent.propose_regularization','ent.record_regularization_finding','ent.review_regularization','ent.withdraw_regularization',
 'ent.transfer.declared','ent.transfer.agreed','ent.transfer.declined','ent.transfer.withdrawn','ent.fulfillment_reviewed',
 'bal.draft','bal.issued','bal.submit','bal.approve','bal.recount','bal.apply','bal.cancel','com.cancel','req.status',
 'req.cancellation_acknowledged','com.cancellation_acknowledged','ent.cancellation_acknowledged','bal.cancellation_acknowledged',
 'req.complement_added','req.complement_linked','com.complement_added','com.complement_linked',
 'ent.complement_added','ent.complement_linked','bal.complement_added','bal.complement_linked']);

do $l1$
declare definition text;anchor text;
begin
 definition:=pg_get_functiondef('public.document_progress_people(uuid,text,integer)'::regprocedure);
 anchor:='m.status=''active'' and p.status=''active'' and position';
 if position(anchor in definition)=0 then raise exception 'L1 mention eligibility projection drift';end if;
 execute replace(definition,anchor,'m.status=''active'' and p.status=''active'' and private.user_can(d.care_recipient_id,p.id,lower(d.type)||''.read'') and (d.type<>''COM'' or m.role::text in (''family'',''admin'')) and position');
end;$l1$;

create function public.document_communication_recovery(p_document uuid,p_original uuid,p_channel text,p_key uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents;c private.document_communication_commands;
begin
 if private.auth_session() is null then raise exception 'active identity required' using errcode='42501';end if;
 select * into d from public.operational_documents where id=p_document;
 if not found or not private.can(d.care_recipient_id,lower(d.type)||'.read') then raise exception 'document not found' using errcode='42501';end if;
 select * into c from private.document_communication_commands where actor_id=auth.uid() and idempotency_key=p_key;
 if not found then return null;end if;
 if c.document_id<>p_document or c.original_id<>p_original or c.channel<>p_channel then raise exception 'reminder intention differs' using errcode='23505';end if;
 return jsonb_build_object('key',p_key,'documentId',p_document,'originalId',p_original,'notificationId',c.notification_id,'channel',p_channel,'state','queued','recovered',true);
end;$$;
revoke all on function public.document_communication_recovery(uuid,uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.document_communication_recovery(uuid,uuid,text,uuid) to authenticated;
