CREATE OR REPLACE FUNCTION public.find_product_by_alias(p_query text)
 RETURNS TABLE(id text, name text, category product_category, unit text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  select p.id, p.name, p.category, p.unit
  from public.products p
  where p.is_active
    and (
      unaccent(lower(trim(p.name))) = unaccent(lower(trim(p_query)))
      or exists (
        select 1
        from unnest(p.aliases) alias_name
        where unaccent(lower(trim(alias_name))) = unaccent(lower(trim(p_query)))
      )
    );
$function$
