alter table public.products
  add column if not exists aliases text[] not null default '{}';

create extension if not exists unaccent;

update public.products
set name = case when id = 'monuril' then 'Fsofomicna (Monuril) 3g' else name end,
aliases = case id
  when 'phosfoenema' then array['Phosfoenema', 'Phosfoenema bisnaga']
  when 'quetiapina-100' then array['Quetiapina', 'Quetiapina 100mg', 'Quetiapina comprimido']
  when 'dipirona-liquida' then array['Dipirona líquida', 'Dipirona solução oral', 'Dipirona']
  when 'simeticona-liquida' then array['Simeticona líquida', 'Simeticona solução oral', 'Simeticona']
  when 'memantina-10' then array['Memantina', 'Memantina 10mg', 'Memantina comprimido']
  when 'lorazepam-2' then array['Lorazepam', 'Lorazepam 2mg', 'Lorazepam comprimido']
  when 'risperidona-1' then array['Risperidona', 'Risperidona 1mg', 'Risperidona comprimido']
  when 'monuril' then array['Fosfomicina', 'Fosfomicina (Monuril) 3g', 'Monuril', 'Monuril 3g', 'Fsofomicna']
  when 'probiotico' then array['Probiotico', 'Probiótico comprimido']
  when 'clister' then array['Clister', 'Enema']
  when 'fralda' then array['Fraldas']
  when 'lenco-umedecido' then array['Lenço umedecido', 'Lenços umedecidos']
  when 'absorvente' then array['Absorventes']
  when 'sabonete-intimo' then array['Sabonete intimo', 'Sabonete']
  when 'hidratante-labial' then array['Hidratante labial', 'Protetor labial']
  when 'hidratante-corporal' then array['Hidratante corporal', 'Hidratante']
  when 'protetor-solar' then array['Protetor solar', 'Filtro solar']
  when 'clorexidina' then array['Clorexidina', 'Enxaguante bucal com clorexidina']
  when 'pomada-assadura' then array['Pomada assadura', 'Pomada para irritação']
  when 'lençol-descartavel' then array['Lencol descartavel', 'Lençol']
  when 'oleo-girassol' then array['Oleo de girassol', 'Óleo']
  when 'gaze' then array['Gaze nao esteril', 'Gaze']
  when 'algodao' then array['Algodao']
  when 'soro-fisiologico' then array['Soro fisiologico', 'Soro']
  when 'sonda-aspiracao' then array['Sonda de aspiracao', 'Sonda']
  when 'dieta-calorica' then array['Dieta calorica', 'Dieta']
  when 'dieta-fibras' then array['Dieta fibras', 'Dieta com fibra']
  when 'frasco-dieta' then array['Frasco dieta']
  when 'equipo-dieta' then array['Equipo dieta', 'Equipo']
  else aliases
end;

create or replace function public.find_product_by_alias(p_query text)
returns table (id text, name text, category public.product_category, unit text)
language sql
stable
security invoker
set search_path = public, extensions
as $$
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
$$;

revoke all on function public.find_product_by_alias(text) from public;
grant execute on function public.find_product_by_alias(text) to authenticated;
