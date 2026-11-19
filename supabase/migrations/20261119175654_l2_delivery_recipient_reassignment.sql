-- The operational recipient changes independently of the original declaration.
create function private.require_delivery_reassignment(d public.operational_documents)
returns void language plpgsql set search_path = '' as $$
begin
  if d.type is distinct from 'ENT' then
    raise exception 'delivery not found' using errcode = '42501';
  end if;
  perform private.require_cap(d.care_recipient_id, 'ent.read');
  perform private.require_cap(d.care_recipient_id, 'ent.create');
  if d.created_by is distinct from auth.uid() and not public.can_manage_recipient(d.care_recipient_id) then
    raise exception 'reassignment not authorized' using errcode = '42501';
  end if;
  if d.status <> 'pending_receipt' or d.workflow_data ? 'acceptedAt'
     or private.document_archive_active(d.id)
     or exists(select 1 from public.document_lines l where l.document_id = d.id and l.accepted_quantity > 0) then
    raise exception 'reassignment requires an unreceived delivery' using errcode = 'PT409';
  end if;
end;
$$;
revoke all on function private.require_delivery_reassignment(public.operational_documents) from public, anon, authenticated, service_role;

create function public.delivery_reassignment_context(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  d public.operational_documents;
  t public.ent_transfers;
  context jsonb;
  people jsonb;
  next_shifts jsonb;
  dispatched_at timestamptz;
begin
  select * into d from public.operational_documents where id = p_id;
  perform private.require_delivery_reassignment(d);
  select * into t from public.ent_transfers where document_id = p_id;
  if found and (t.state <> 'dispatched' or t.declaration->>'mode' is distinct from 'direct' or d.kind = 'DEV') then
    raise exception 'transfer recipient is frozen' using errcode = '22023';
  end if;
  context := private.delivery_recipient_context(d.care_recipient_id, d.payload->>'source');
  select coalesce(jsonb_agg(person order by person->>'name', person->>'id'), '[]') into people
  from jsonb_array_elements(context->'people') as person
  where person->>'id' is distinct from d.recipient_id::text
    and person->>'id' is distinct from d.created_by::text
    and private.member_can(d.care_recipient_id, (person->>'id')::uuid, 'ent.read');

  select coalesce(jsonb_agg(to_jsonb(next_shift) order by next_shift."startsAt", next_shift.id), '[]') into next_shifts
  from (
    select distinct on (s.professional_id)
      s.id, s.professional_id as "professionalId", s.starts_at as "startsAt", s.ends_at as "endsAt"
    from public.scheduled_shifts s
    where d.payload->>'source' = 'FAMILY' and s.care_recipient_id = d.care_recipient_id
      and s.status = 'published' and s.starts_at > (context->>'checkedAt')::timestamptz
      and exists(select 1 from jsonb_array_elements(people) p where p->>'id' = s.professional_id::text)
    order by s.professional_id, s.starts_at, s.id
  ) next_shift;

  dispatched_at := coalesce(t.dispatched_at, (
    select e.created_at from public.document_events e
    where e.document_id = d.id and e.action in ('ent.issued','ent.submit')
    order by e.version limit 1
  ));
  return jsonb_build_object(
    'documentId', d.id, 'version', d.version, 'currentRecipientId', d.recipient_id,
    'currentRecipientName', coalesce(d.workflow_data#>>'{recipientSelection,recipientName}',
      t.declaration#>>'{recipient,name}', d.canonical_snapshot#>>'{actors,recipient,name}'),
    'dispatchedAt', dispatched_at, 'people', people, 'shifts', context->'shifts',
    'suggestedId', context->'suggestedId', 'nextShifts', next_shifts
  );
end;
$$;
revoke all on function public.delivery_reassignment_context(uuid) from public, anon, authenticated, service_role;
grant execute on function public.delivery_reassignment_context(uuid) to authenticated;

do $migration$
declare definition text; anchor text;
begin
  definition := pg_get_functiondef('public.supply_document_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
  anchor := $a$if p_action = 'reassign' then raise exception 'bilateral transfer recipient is frozen;$a$;
  if strpos(definition, anchor) = 0 then raise exception 'transfer reassignment guard missing'; end if;
  execute replace(definition, anchor,
    $b$if p_action = 'reassign' and (t.declaration->>'mode' is distinct from 'direct' or t.declaration->>'source' is distinct from 'FAMILY') then raise exception 'transfer recipient is frozen;$b$);

  definition := pg_get_functiondef('public.audited_legacy_supply_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
  anchor := $a$if d.status<>'pending_receipt' or exists(select 1 from public.document_lines where document_id=p_id and accepted_quantity>0) or d.created_by<>auth.uid() and not public.can_manage_recipient(d.care_recipient_id) then raise exception 'reassignment not authorized' using errcode='42501';end if;$a$;
  if strpos(definition, anchor) = 0 then raise exception 'delivery reassignment authority guard missing'; end if;
  definition := replace(definition, anchor, 'perform private.require_delivery_reassignment(d);');
  anchor := $a$v_actor:=(p_body->>'recipientId')::uuid;$a$;
  if strpos(definition, anchor) = 0 then raise exception 'delivery reassignment target guard missing'; end if;
  definition := replace(definition, anchor, anchor || $b$
 if v_actor is not distinct from d.recipient_id then raise exception 'choose another recipient' using errcode='22023'; end if;$b$);
  anchor := $a$if d.type='ENT' and p_action in ('submit','reassign') then perform private.check_delivery_selection(p_id);end if;$a$;
  if strpos(definition, anchor) = 0 then raise exception 'delivery post-event guard missing'; end if;
  execute replace(definition, anchor, anchor || $b$
 if d.type='ENT' and p_action='reassign' then
   perform private.require_delivery_reassignment(d);
   if not coalesce(private.member_can(d.care_recipient_id,v_actor,'ent.read'),false) then
     raise exception 'designated recipient requires document read' using errcode='42501';
   end if;
 end if;$b$);
end;
$migration$;
