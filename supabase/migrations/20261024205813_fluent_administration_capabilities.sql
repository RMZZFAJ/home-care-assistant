-- The API, UI and database honor the same explicitly delegated capabilities.
-- No membership, product, document or historical event is rewritten.
drop policy if exists "scoped audit read" on public.audit_events;
create policy "scoped audit read" on public.audit_events for select to authenticated
using (
  public.is_global_administrator() or exists (
    select 1 from public.care_recipients r
    where r.id::text = metadata->>'care_recipient_id'
      and private.can(r.id, 'audit.read')
  )
);

create function private.adopt_catalogue_model(p_patient uuid, p_product text)
returns public.care_recipient_products
language plpgsql security definer set search_path = '' as $$
declare model public.products;
begin
  perform private.require_cap(p_patient, 'catalog.manage');
  perform pg_advisory_xact_lock(hashtextextended('catalogue:' || p_patient, 0));
  if not exists (select 1 from public.care_recipients where id = p_patient and is_active) then
    raise exception 'inactive patient' using errcode = '42501';
  end if;
  select * into model from public.products
    where id = p_product and owner_care_recipient_id is null and is_active;
  if not found then raise exception 'template not found'; end if;
  if exists (select 1 from public.care_recipient_products where care_recipient_id = p_patient and product_id = model.id) then
    raise exception 'template already adopted' using errcode = '23505';
  end if;
  return public.admin_upsert_recipient_product(p_patient, model.id, model.name, model.category, model.unit, model.aliases, true);
end;
$$;
revoke all on function private.adopt_catalogue_model(uuid,text) from public, anon, authenticated, service_role;

-- Preserve the established RPC contract; only this guarded wrapper is exposed.
create or replace function public.admin_adopt_product(p_care_recipient_id uuid, p_product_id text)
returns public.care_recipient_products
language sql security definer set search_path = '' as $$
  select private.adopt_catalogue_model(p_care_recipient_id, p_product_id);
$$;
revoke all on function public.admin_adopt_product(uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.admin_adopt_product(uuid,text) to authenticated;
