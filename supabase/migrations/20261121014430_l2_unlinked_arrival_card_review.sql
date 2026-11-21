create function private.com_arrival_review_page(
  p_patient uuid, p_document uuid, p_before_at timestamptz, p_before_id uuid, p_arrival uuid
) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  result jsonb;
  may_read_stock boolean;
begin
  perform private.require_com_arrival_review(p_patient);
  if (p_before_at is null) <> (p_before_id is null) then
    raise exception 'incomplete arrival pagination reference' using errcode = '22023';
  end if;
  may_read_stock := coalesce(private.can(p_patient, 'stock.family.read'), false);

  with candidates as (
    select r.id, r.document_id, r.created_at as submitted_at, r.submitted_name,
      r.lines, r.l2_arrival, d.code, d.version, null::text as origin
    from public.operational_documents d
    join public.purchase_receipts r on r.document_id = d.id
    where p_arrival is null and d.care_recipient_id = p_patient and d.type = 'COM'
      and d.status not in ('cancelled', 'rejected', 'administratively_closed')
      and r.state = 'pending' and r.submitted_by <> auth.uid()
      and (p_document is null or d.id = p_document)
      and (p_before_at is null or (r.created_at, r.id) < (p_before_at, p_before_id))
    union all
    select a.id, null, a.submitted_at, a.submitted_name, a.lines, false, a.code, a.version, a.origin
    from private.unlinked_arrivals a
    where p_document is null and a.care_recipient_id = p_patient
      and a.state = 'pending' and a.submitted_by <> auth.uid()
      and (p_arrival is null or a.id = p_arrival)
      and (p_before_at is null or (a.submitted_at, a.id) < (p_before_at, p_before_id))
  ), page as materialized (
    select * from candidates order by submitted_at desc, id desc limit 31
  ), visible as materialized (
    select * from page order by submitted_at desc, id desc limit 30
  )
  select jsonb_build_object(
    'arrivals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'receiptId', r.id, 'documentId', r.document_id, 'documentCode', r.code, 'version', r.version,
        'author', r.submitted_name, 'submittedAt', r.submitted_at,
        'materials', (
          select jsonb_agg(jsonb_build_object(
            'lineId', item.line->>'lineId', 'name', coalesce(l.name_snapshot, item.line->>'name'),
            'unit', coalesce(l.unit_snapshot, item.line->>'unit'), 'quantity', item.line->>'quantity',
            'expectedQuantity', case when r.l2_arrival then item.line->>'expectedQuantity' end,
            'remainingAction', case when r.l2_arrival then item.line->>'remainingAction' end,
            'familyStock', case when may_read_stock then private.stock_quantity(p_patient,
              coalesce(l.product_id, item.line->>'productId'), 'FAMILY')::text end
          ) || private.purchase_arrival_link_details(p_patient, item.line) order by item.position)
          from jsonb_array_elements(r.lines) with ordinality as item(line, position)
          left join public.document_lines l on l.document_id = r.document_id and l.id = (item.line->>'lineId')::uuid
          where r.document_id is null or l.id is not null
        )
      ) || case when r.origin is null then '{}'::jsonb else jsonb_build_object('origin', r.origin) end
      order by r.submitted_at desc, r.id desc) from visible r
    ), '[]'::jsonb),
    'next', case when (select count(*) from page) > 30 then (
      select jsonb_build_object('at', submitted_at, 'id', id) from visible order by submitted_at, id limit 1
    ) end
  ) into result;
  return result;
end;
$$;

create or replace function public.com_arrival_review_queue(
  p_patient uuid, p_document uuid default null, p_before_at timestamptz default null, p_before_id uuid default null
) returns jsonb
language sql stable security definer set search_path = '' as $$
  select private.com_arrival_review_page(p_patient, p_document, p_before_at, p_before_id, null);
$$;

create function public.com_unlinked_arrival_review(p_patient uuid, p_arrival uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_arrival is null then
    raise exception 'arrival reference is required' using errcode = '22023';
  end if;
  return private.com_arrival_review_page(p_patient, null, null, null, p_arrival);
end;
$$;

revoke all on function private.com_arrival_review_page(uuid, uuid, timestamptz, uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.com_unlinked_arrival_review(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.com_unlinked_arrival_review(uuid, uuid) to authenticated;
