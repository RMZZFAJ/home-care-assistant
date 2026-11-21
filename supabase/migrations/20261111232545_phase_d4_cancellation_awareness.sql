-- Cancellation awareness is a separate personal act. The issued material and
-- every earlier SCI remain unchanged; the existing event/outbox path is reused.
create function private.document_cancellation_awareness(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents;c public.document_events;first_ack jsonb;own_ack jsonb;ack_count bigint;begin
 perform public.operational_document(p_id);
 select * into strict d from public.operational_documents where id=p_id;
 if d.status='cancelled' and d.protocol is not null then
  select * into c from public.document_events e where e.document_id=p_id
   and e.action in ('req.status','com.cancel','ent.cancel','ent.consent_cancel','bal.cancel')
   and e.body->>'status'='cancelled' order by e.version desc limit 1;
 end if;
 if c.id is not null then
  select count(*) into ack_count from public.document_events e where e.document_id=p_id
   and e.action=lower(d.type)||'.cancellation_acknowledged' and e.body->'event'->>'cancellationEventId'=c.id::text;
  select jsonb_build_object('id',e.id,'actorId',e.actor_id,'actorName',coalesce(e.actor_name,'Nome não preservado'),'recordedAt',e.created_at)
   into first_ack from public.document_events e where e.document_id=p_id
   and e.action=lower(d.type)||'.cancellation_acknowledged' and e.body->'event'->>'cancellationEventId'=c.id::text order by e.version limit 1;
  select jsonb_build_object('id',e.id,'actorId',e.actor_id,'actorName',coalesce(e.actor_name,'Nome não preservado'),'recordedAt',e.created_at)
   into own_ack from public.document_events e where e.document_id=p_id and e.actor_id=auth.uid()
   and e.action=lower(d.type)||'.cancellation_acknowledged' and e.body->'event'->>'cancellationEventId'=c.id::text order by e.version limit 1;
 end if;
 return jsonb_build_object('documentId',d.id,'careRecipientId',d.care_recipient_id,
  'state',case when d.status<>'cancelled' then 'not_cancelled' when c.id is null then 'unavailable' when first_ack is null then 'pending' else 'acknowledged' end,
  'cancellation',case when c.id is null then null else jsonb_build_object('id',c.id,'version',c.version,'actorName',coalesce(c.actor_name,'Nome não preservado'),
   'recordedAt',c.created_at,'reason',coalesce(c.body->'event'->>'reason','Motivo não preservado')) end,
  'eligible',c.id is not null and private.requisition_family_representative(d.care_recipient_id,auth.uid()),
  'firstAcknowledgement',first_ack,'personalAcknowledgement',own_ack,'totalAcknowledgements',coalesce(ack_count,0));
end;$$;

create function public.document_cancellation_awareness(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$select private.document_cancellation_awareness(p_id);$$;

create function public.acknowledge_document_cancellation(p_id uuid,p_event uuid,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;e public.document_events;v_context jsonb;begin
 perform public.operational_document(p_id);
 select * into strict d from public.operational_documents where id=p_id for update;
 v_context:=private.document_cancellation_awareness(p_id);
 if p_key is null or p_event is null then raise exception 'cancellation identity required' using errcode='22023';end if;
 select * into e from public.document_events where actor_id=auth.uid() and idempotency_key=p_key;
 if found then
  if e.document_id<>p_id or e.action<>lower(d.type)||'.cancellation_acknowledged' or e.body->'event'->>'cancellationEventId' is distinct from p_event::text then
   raise exception 'idempotency payload mismatch' using errcode='23505';end if;
  return v_context;
 end if;
 if not private.requisition_family_representative(d.care_recipient_id,auth.uid()) then raise exception 'family science authority required' using errcode='42501';end if;
 if v_context->'cancellation'->>'id' is distinct from p_event::text then raise exception 'cancellation reference changed' using errcode='PT409';end if;
 if v_context->'personalAcknowledgement'<>'null'::jsonb then return v_context;end if;
 update public.operational_documents set version=version+1 where id=p_id;
 perform private.record_document_event(p_id,lower(d.type)||'.cancellation_acknowledged',jsonb_build_object('cancellationEventId',p_event,'cancellationVersion',(v_context->'cancellation'->>'version')::integer),p_key);
 perform public.operational_document(p_id);
 if not private.requisition_family_representative(d.care_recipient_id,auth.uid()) then raise exception 'family science authority changed' using errcode='42501';end if;
 return private.document_cancellation_awareness(p_id);
end;$$;

revoke all on function private.document_cancellation_awareness(uuid) from public,anon,authenticated,service_role;
revoke all on function public.document_cancellation_awareness(uuid) from public,anon,authenticated,service_role;
revoke all on function public.acknowledge_document_cancellation(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.document_cancellation_awareness(uuid) to authenticated;
grant execute on function public.acknowledge_document_cancellation(uuid,uuid,uuid) to authenticated;
notify pgrst,'reload schema';
