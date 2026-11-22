-- Record knowledge of a specific decision separately from science and receipts.
create table private.requisition_fulfillment_awareness (
  review_id uuid not null references private.requisition_fulfillment_reviews(id),
  actor_id uuid not null references public.profiles(id),
  known_at timestamptz not null default clock_timestamp(),
  primary key (review_id,actor_id)
);
alter table private.requisition_fulfillment_awareness enable row level security;
revoke all on private.requisition_fulfillment_awareness from public,anon,authenticated,service_role;

create index fulfillment_reviews_document_order
  on private.requisition_fulfillment_reviews(document_id,recorded_at,id);

create function private.document_family_reviews(p_document uuid,p_patient uuid,p_kind text)
returns setof private.requisition_fulfillment_reviews
language sql stable set search_path='' as $$
  select r.* from private.requisition_fulfillment_reviews r
  where p_kind='ENT' and r.document_id=p_document
  union all
  select r.* from (
    select distinct link.document_line_id
    from public.requisition_items i
    join public.document_request_links link on link.requisition_item_id=i.id
    where p_kind='REQ' and i.requisition_id=p_document
  ) lines
  join private.requisition_fulfillment_reviews r on r.line_id=lines.document_line_id
  join public.operational_documents delivery on delivery.id=r.document_id
    and delivery.kind='ENT' and delivery.care_recipient_id=p_patient
  where private.can(p_patient,'ent.read');
$$;
revoke all on function private.document_family_reviews(uuid,uuid,text)
  from public,anon,authenticated,service_role;

create function public.document_family_decision_notice(p_document uuid,p_acknowledge uuid default null)
returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  d public.operational_documents;
  reader uuid:=auth.uid();
  acknowledgement jsonb;
  notice jsonb;
begin
  select * into d from public.operational_documents where id=p_document;
  if not found or reader is null or d.kind not in ('REQ','ENT') or d.status='draft' then
    raise exception 'family decision unavailable' using errcode='42501';
  end if;
  perform private.require_cap(d.care_recipient_id,lower(d.type::text)||'.read');

  if p_acknowledge is not null then
    if not exists (
      select 1 from private.document_family_reviews(d.id,d.care_recipient_id,d.kind::text) r
      where r.id=p_acknowledge and r.actor_id<>reader
    ) then
      raise exception 'family decision unavailable' using errcode='42501';
    end if;
    insert into private.requisition_fulfillment_awareness(review_id,actor_id)
      values(p_acknowledge,reader) on conflict (review_id,actor_id) do nothing;
    perform private.require_cap(d.care_recipient_id,lower(d.type::text)||'.read');
    perform private.require_cap(d.care_recipient_id,'ent.read');
    select jsonb_build_object('reviewId',a.review_id,'knownAt',a.known_at)
    into acknowledgement
    from private.requisition_fulfillment_awareness a
    where a.review_id=p_acknowledge and a.actor_id=reader;
  end if;

  select jsonb_build_object(
    'id',r.id,'material',l.name_snapshot,'decision',r.decision,
    'previous',coalesce(prior.decision,l.family_fulfillment),'reason',r.reason,
    'author',r.actor_name,'recordedAt',r.recorded_at,
    'acceptedQuantity',trim_scale(r.accepted_quantity)::text,'unit',l.unit_snapshot
  )
  into notice
  from private.document_family_reviews(d.id,d.care_recipient_id,d.kind::text) r
  join public.document_lines l on l.id=r.line_id and l.document_id=r.document_id
  left join lateral (
    select earlier.decision from private.requisition_fulfillment_reviews earlier
    where earlier.line_id=r.line_id and earlier.expected_version<r.expected_version
    order by earlier.expected_version desc,earlier.id limit 1
  ) prior on true
  where r.actor_id<>reader and not exists (
    select 1 from private.requisition_fulfillment_awareness a
    where a.review_id=r.id and a.actor_id=reader
  )
  order by r.recorded_at,r.id limit 1;

  return jsonb_build_object('documentId',d.id,'patientId',d.care_recipient_id,
    'actorId',reader,'notice',notice,'acknowledgement',acknowledgement);
end;
$$;

revoke all on function public.document_family_decision_notice(uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.document_family_decision_notice(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
