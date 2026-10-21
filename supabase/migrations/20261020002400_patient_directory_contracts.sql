create or replace function public.admin_list_memberships(p_care_recipient_id uuid)
returns table(id uuid,care_recipient_id uuid,user_id uuid,role public.profile_role,can_manage_stock boolean,can_count_stock boolean,status text,created_at timestamptz,full_name text)
language sql stable security definer set search_path=public as $$
  select m.id,m.care_recipient_id,m.user_id,m.role,m.can_manage_stock,m.can_count_stock,m.status,m.created_at,p.full_name
  from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id
  where m.care_recipient_id=p_care_recipient_id and public.can_manage_recipient(p_care_recipient_id)
  order by p.full_name,m.id;
$$;
create or replace function public.find_patient_product_by_alias(p_care_recipient_id uuid,p_query text)
returns table(product_id text,name text,category public.product_category,unit text)
language sql stable security definer set search_path=public,extensions as $$
  select c.product_id,c.name,c.category,c.unit from public.care_recipient_products c
  where public.can_access_recipient(p_care_recipient_id) and c.care_recipient_id=p_care_recipient_id and c.is_active
    and exists(select 1 from unnest(array_append(c.aliases,c.name)) a where unaccent(lower(trim(a)))=unaccent(lower(trim(p_query))));
$$;
revoke all on function public.admin_list_memberships(uuid),public.find_patient_product_by_alias(uuid,text) from public,anon;
grant execute on function public.admin_list_memberships(uuid),public.find_patient_product_by_alias(uuid,text) to authenticated;
-- The legacy invoker alias lookup still needs its harmless normalization helper.
do $$declare f record;begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname='unaccent' and n.nspname in ('public','extensions')
  loop execute format('grant execute on function %s to authenticated',f.signature);end loop;
end;$$;
