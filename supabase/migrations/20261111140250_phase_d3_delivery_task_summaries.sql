-- Add only the historical display facts needed by the canonical delivery inbox.
-- The existing task, scope, order, pagination and capability boundaries stay intact.
create or replace function public.delivery_task_list(
  p_patient uuid, p_scope text default 'own', p_status text default 'tasks',
  p_page integer default 1, p_size integer default 20
) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  perform private.require_cap(p_patient,'ent.read');
  if p_scope is null or p_scope not in ('own','team') or p_status is null
    or p_status not in ('','tasks','transfer_pending','transfer_ready','pending_receipt','disputed','cancellation_pending','confirmed','cancelled','administratively_closed')
    or p_status='tasks' and p_scope<>'own' or p_page is null or p_page not between 1 and 100000
    or p_size is null or p_size not between 1 and 100 then
    raise exception 'invalid delivery filter' using errcode='22023';
  end if;
  with candidates as materialized (
    select d.id,d.type,d.code,d.protocol,d.status,d.created_at,d.recipient_id,d.version,
      case when p_status='tasks' then private.delivery_task(d.id) end task
    from public.operational_documents d
    where d.care_recipient_id=p_patient and d.type='ENT'
      and (p_status='tasks' or p_scope='team' or d.recipient_id=auth.uid()
        or exists(select 1 from public.ent_transfers t where t.document_id=d.id
          and auth.uid() in (t.initiator_id,t.counterparty_id)))
      and (p_status in ('','tasks') or d.status=p_status)
  ), filtered as materialized (
    select * from candidates where p_status<>'tasks' or task is not null
  ), paged as (
    select * from filtered order by created_at desc,id offset (p_page-1)*p_size limit p_size
  )
  select jsonb_build_object(
    'data',coalesce((
      select jsonb_agg(to_jsonb(p)||jsonb_build_object(
        'document_lines',coalesce((select jsonb_agg(jsonb_build_object(
          'id',l.id,'fully_checked',l.fully_checked,'accepted_quantity',l.accepted_quantity::text,'quantity',l.quantity::text
        ) order by l.id) from public.document_lines l where l.document_id=p.id),'[]'::jsonb),
        'deliverySummary',jsonb_build_object(
          'source',case when d.payload->>'source' in ('FAMILY','CARE_TEAM')
            and d.payload->>'destination'=case d.payload->>'source' when 'FAMILY' then 'CARE_TEAM' else 'FAMILY' end
            then d.payload->>'source' end,
          'destination',case when d.payload->>'source' in ('FAMILY','CARE_TEAM')
            and d.payload->>'destination'=case d.payload->>'source' when 'FAMILY' then 'CARE_TEAM' else 'FAMILY' end
            then d.payload->>'destination' end,
          'recordedByName',coalesce(nullif(btrim(t.declaration#>>'{actor,name}'),''),original_actor.name),
          'recipientName',case
            when d.workflow_data#>>'{recipientSelection,recipientId}'=d.recipient_id::text
              then nullif(btrim(d.workflow_data#>>'{recipientSelection,recipientName}'),'')
            when t.declaration#>>'{recipient,id}'=d.recipient_id::text
              then nullif(btrim(t.declaration#>>'{recipient,name}'),'') end,
          'counterpartyName',nullif(btrim(t.declaration#>>'{counterparty,name}'),''),
          'receivedByName',personal_receipt.name
        )
      ) order by p.created_at desc,p.id)
      from paged p
      join public.operational_documents d on d.id=p.id and d.care_recipient_id=p_patient
      left join public.ent_transfers t on t.document_id=p.id and t.care_recipient_id=p_patient
      left join lateral (
        select coalesce(nullif(btrim(e.actor_name),''),nullif(btrim(e.body->>'actorName'),'')) name
        from public.document_events e where e.document_id=p.id
        order by e.version,e.created_at,e.id limit 1
      ) original_actor on true
      left join lateral (
        select coalesce(nullif(btrim(e.actor_name),''),nullif(btrim(e.body->>'actorName'),'')) name
        from public.document_events e where e.document_id=p.id and e.action='ent.receive'
        order by e.version,e.created_at,e.id limit 1
      ) personal_receipt on true
    ),'[]'::jsonb),
    'total',(select count(*) from filtered)
  ) into result;
  return result;
end;
$$;
revoke all on function public.delivery_task_list(uuid,text,text,integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.delivery_task_list(uuid,text,text,integer,integer) to authenticated;
