create or replace function private.consumption_list_materials(p_report uuid, p_patient uuid)
returns table(ordinal bigint, product_id text, name text, quantity text, unit text)
language sql stable set search_path = '' as $$
  select line.ordinal, line.item->>'productId',
    coalesce(nullif(line.item->>'name', ''), product.name, line.item->>'productId'),
    line.item->>'quantity', coalesce(nullif(line.item->>'unit', ''), product.unit)
  from jsonb_array_elements(private.consumption_current_lines(p_report))
    with ordinality as line(item, ordinal)
  left join public.care_recipient_products product
    on product.care_recipient_id = p_patient and product.product_id = line.item->>'productId'
$$;

revoke all on function private.consumption_list_materials(uuid, uuid)
  from public, anon, authenticated, service_role;

create or replace function public.consumption_record_list(
  p_patient uuid, p_kind text, p_status text, p_search text, p_reminder uuid,
  p_from timestamptz, p_until timestamptz, p_before_at timestamptz, p_before_id uuid
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  family boolean := coalesce(private.can(p_patient, 'stock.family.read'), false);
  team boolean := coalesce(private.can(p_patient, 'stock.team.read'), false);
  needle text := lower(p_search);
begin
  if private.auth_session() is null or not public.can_access_recipient(p_patient) then
    raise exception 'report scope required' using errcode = '42501';
  end if;
  if p_search is null or private.bal_comment_units(p_search) > 120
    or (p_before_at is null) <> (p_before_id is null)
    or p_from >= p_until
    or p_kind not in ('consumption', 'shortage')
    or p_status not in ('reported', 'confirmed', 'rejected', 'recorded', 'cancelled', 'communicated')
  then raise exception 'invalid report filters' using errcode = '22023'; end if;

  return (
    with page as materialized (
      select r.id, r.care_recipient_id, r.kind, r.location, r.status, r.body, r.created_at,
        r.version, r.reported_by, r.reported_name, r.workflow_mode
      from public.consumption_reports r
      where r.care_recipient_id = p_patient
        and ((family and r.location = 'FAMILY') or (team and r.location = 'CARE_TEAM'))
        and (p_kind is null or r.kind = p_kind) and (p_status is null or r.status = p_status)
        and (p_reminder is null or r.source_reminder_id = p_reminder)
        and (p_from is null or r.created_at >= p_from) and (p_until is null or r.created_at < p_until)
        and (p_before_at is null or (r.created_at, r.id) < (p_before_at, p_before_id))
        and case
          when needle = '' or strpos(lower(r.body), needle) > 0 or strpos(r.id::text, needle) > 0 then true
          else exists (
            select 1 from private.progress_subjects subject
            where subject.is_report and subject.id = r.id and subject.care_recipient_id = p_patient
              and strpos(lower(subject.code), needle) > 0
          ) or exists (
            select 1 from private.consumption_list_materials(r.id, p_patient) material
            where strpos(lower(material.name), needle) > 0 or strpos(lower(material.product_id), needle) > 0
          )
        end
      order by r.created_at desc, r.id desc
      limit 21
    )
    select coalesce(jsonb_agg(to_jsonb(page) || jsonb_build_object('code', subject.code, 'materials', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'productId', material.product_id, 'name', material.name,
        'quantity', material.quantity, 'unit', material.unit
      ) order by material.ordinal), '[]'::jsonb)
      from private.consumption_list_materials(page.id, p_patient) material
    )) order by page.created_at desc, page.id desc), '[]'::jsonb)
    from page
    join private.progress_subjects subject
      on subject.is_report and subject.id = page.id and subject.care_recipient_id = p_patient
  );
end
$$;
