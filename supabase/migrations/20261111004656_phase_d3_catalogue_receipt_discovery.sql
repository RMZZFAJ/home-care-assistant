alter table private.catalogue_preparations
  add column confirmed_at timestamptz,
  add constraint catalogue_preparation_confirmation_state
    check (confirmed_at is null or state in ('consumed','acknowledged'));

-- A consumed row still has its original confirmation time. Acknowledging an
-- older result changed saved_at, so those legacy dates remain unknown.
update private.catalogue_preparations set confirmed_at = saved_at where state = 'consumed';

create function private.stamp_catalogue_preparation_confirmation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.state = 'consumed' and new.confirmed_at is null then
    new.confirmed_at := new.saved_at;
  end if;
  return new;
end;
$$;
revoke all on function private.stamp_catalogue_preparation_confirmation() from public,anon,authenticated,service_role;
create trigger catalogue_preparation_confirmation_time
  before insert or update of state on private.catalogue_preparations
  for each row execute function private.stamp_catalogue_preparation_confirmation();

create index catalogue_preparation_receipt_cursor on private.catalogue_preparations(
  owner_id, mode, patient_id, coalesce(confirmed_at,'-infinity'::timestamptz) desc, id desc
) where state in ('consumed','acknowledged');

create function private.require_catalogue_receipt_scope(p_patient uuid, p_mode text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_mode is null or p_mode not in ('global','patient') or (p_mode='patient' and p_patient is null) then
    raise exception 'invalid catalogue receipt scope' using errcode = '22023';
  end if;
  if private.auth_session() is null then
    raise exception 'catalogue receipt scope unavailable' using errcode = '42501';
  end if;
  if p_mode='patient' then
    if not public.can_access_recipient(p_patient) then
      raise exception 'catalogue receipt scope unavailable' using errcode = '42501';
    end if;
  elsif not public.is_global_administrator() or (p_patient is not null and not exists (
    select 1 from public.care_recipients where id=p_patient and is_active
  )) then
    raise exception 'catalogue receipt scope unavailable' using errcode = '42501';
  end if;
end;
$$;

create function public.catalogue_preparation_receipts(p_patient uuid, p_mode text, p_before uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_before_at timestamptz;
  v_page jsonb;
begin
  perform private.require_catalogue_receipt_scope(p_patient,p_mode);
  if p_before is not null then
    select coalesce(confirmed_at,'-infinity'::timestamptz) into v_before_at
    from private.catalogue_preparations
    where id=p_before and owner_id=auth.uid() and mode=p_mode
      and patient_id is not distinct from p_patient and state in ('consumed','acknowledged');
    if not found then
      raise exception 'invalid catalogue receipt cursor' using errcode = '22023';
    end if;
  end if;

  with candidates as materialized (
    select id, purpose, outcome, confirmed_at, coalesce(confirmed_at,'-infinity'::timestamptz) as sort_at
    from private.catalogue_preparations
    where owner_id=auth.uid() and mode=p_mode and patient_id is not distinct from p_patient
      and state in ('consumed','acknowledged')
      and (p_before is null or (coalesce(confirmed_at,'-infinity'::timestamptz),id) < (v_before_at,p_before))
    order by sort_at desc,id desc
    limit 16
  ), page as (
    select c.*, coalesce(presentation.name, unit.name, product.name) as current_name
    from (select * from candidates order by sort_at desc,id desc limit 15) c
    -- These labels follow the same patient scope as their ordinary read APIs.
    -- Receipts remain available if the current label is unavailable.
    left join public.product_presentations presentation
      on p_mode='patient' and presentation.care_recipient_id=p_patient
      and presentation.id=(c.outcome->>'presentationId')::uuid
    left join public.measurement_units unit
      on unit.care_recipient_id is not distinct from p_patient and unit.id=(c.outcome->>'unitId')::uuid
    left join public.care_recipient_products product
      on p_mode='patient' and product.care_recipient_id=p_patient and product.product_id=c.outcome->>'productId'
  )
  select jsonb_build_object(
    'patientId',p_patient,'mode',p_mode,'ownerId',auth.uid(),
    'entries',coalesce(jsonb_agg(jsonb_build_object(
      'id',id,'purpose',purpose,'outcome',outcome,'confirmedAt',confirmed_at,'currentName',current_name
    ) order by sort_at desc,id desc),'[]'::jsonb),
    'next',(case when (select count(*) from candidates)>15 then
      (array_agg(id order by sort_at asc,id asc))[1] end)
  ) into v_page from page;
  perform private.require_catalogue_receipt_scope(p_patient,p_mode);
  return v_page;
end;
$$;

revoke all on function private.require_catalogue_receipt_scope(uuid,text),
  public.catalogue_preparation_receipts(uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.catalogue_preparation_receipts(uuid,text,uuid) to authenticated;
