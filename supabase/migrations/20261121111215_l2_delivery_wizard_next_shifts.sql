-- Upcoming shifts are informational. The original eligibility hash covers
-- the active schedule and remains the reference for dispatch and recovery.
create function public.delivery_preparation_with_next_shifts(p_patient uuid, p_source text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  preparation jsonb := public.delivery_preparation(p_patient, p_source);
  checked_at timestamptz := (preparation->>'checkedAt')::timestamptz;
  next_shifts jsonb := '[]'::jsonb;
begin
  if preparation->>'source' = 'FAMILY' then
    select coalesce(jsonb_agg(to_jsonb(next_shift) order by next_shift."startsAt", next_shift.id), '[]'::jsonb)
    into next_shifts
    from (
      select distinct on (s.professional_id)
        s.id, s.professional_id as "professionalId", s.starts_at as "startsAt", s.ends_at as "endsAt"
      from public.scheduled_shifts s
      join jsonb_array_elements(preparation->'people') as person(value)
        on s.professional_id = (person.value->>'id')::uuid
      where s.care_recipient_id = p_patient and s.status = 'published' and s.starts_at > checked_at
      order by s.professional_id, s.starts_at, s.id
    ) next_shift;
  end if;

  return preparation || jsonb_build_object('nextShifts', next_shifts);
end;
$$;

revoke all on function public.delivery_preparation_with_next_shifts(uuid,text)
  from public, anon, authenticated, service_role;
grant execute on function public.delivery_preparation_with_next_shifts(uuid,text) to authenticated;
