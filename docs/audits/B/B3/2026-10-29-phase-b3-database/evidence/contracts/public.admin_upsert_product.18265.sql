CREATE OR REPLACE FUNCTION public.admin_upsert_product(p_id text, p_name text, p_category product_category, p_unit text, p_aliases text[], p_is_active boolean)
 RETURNS products
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_product public.products;
begin
  if not public.is_global_administrator() then raise exception 'admin authorization required'; end if;
  if p_id !~ '^[a-z0-9][a-z0-9-]{1,119}$' or length(trim(p_name)) not between 2 and 160
     or p_unit not in ('unidade','caixa','frasco','pacote','bisnaga','envelope','comprimido')
  then raise exception 'invalid product'; end if;
  if exists (
    select 1
    from public.products x
    cross join lateral unnest(array_append(coalesce(x.aliases, '{}'), x.name)) existing_alias
    where x.id <> p_id
      and (
        unaccent(lower(trim(existing_alias))) = unaccent(lower(trim(p_name)))
        or exists (
          select 1 from unnest(coalesce(p_aliases, '{}')) incoming_alias
          where unaccent(lower(trim(incoming_alias))) = unaccent(lower(trim(existing_alias)))
        )
      )
  ) or exists (
    select 1 from unnest(coalesce(p_aliases, '{}')) a
    where unaccent(lower(trim(a))) = unaccent(lower(trim(p_name)))
  ) then raise exception 'ambiguous product alias'; end if;
  insert into public.products(id, name, category, unit, aliases, is_active)
  values (p_id, trim(p_name), p_category, p_unit, coalesce(p_aliases, '{}'), p_is_active)
  on conflict (id) do update set name=excluded.name, category=excluded.category,
    unit=excluded.unit, aliases=excluded.aliases, is_active=excluded.is_active
  returning * into v_product;
  insert into public.audit_events(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'product.updated', 'product', null,
    jsonb_build_object('product_id', p_id, 'is_active', p_is_active));
  return v_product;
end;
$function$
