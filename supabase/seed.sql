-- Somente dados fictícios para desenvolvimento local.
insert into public.care_recipients (id, display_name, is_development, is_active)
values ('00000000-0000-4000-8000-000000000001', 'Pessoa assistida de desenvolvimento', true, true)
on conflict (id) do update set display_name = excluded.display_name,
  is_development = excluded.is_development, is_active = excluded.is_active;

insert into public.products (id, name, category, unit, is_active) values
  ('phosfoenema', 'Phosfoenema', 'medicamentos', 'bisnaga', true),
  ('quetiapina-100', 'Quetiapina 100 mg', 'medicamentos', 'comprimido', true),
  ('dipirona-liquida', 'Dipirona Solução Oral', 'medicamentos', 'frasco', true),
  ('simeticona-liquida', 'Simeticona Solução Oral', 'medicamentos', 'frasco', true),
  ('memantina-10', 'Memantina 10 mg', 'medicamentos', 'comprimido', true),
  ('lorazepam-2', 'Lorazepam 2 mg', 'medicamentos', 'comprimido', true),
  ('risperidona-1', 'Risperidona 1 mg', 'medicamentos', 'comprimido', true),
  ('monuril', 'Fsofomicna (Monuril) 3g', 'medicamentos', 'envelope', true),
  ('probiotico', 'Probiótico', 'medicamentos', 'comprimido', true),
  ('clister', 'Clister', 'medicamentos', 'unidade', true),
  ('fralda', 'Fralda', 'higiene', 'unidade', true),
  ('lenco-umedecido', 'Lenço umedecido', 'higiene', 'pacote', true),
  ('absorvente', 'Absorvente', 'higiene', 'unidade', true),
  ('sabonete-intimo', 'Sabonete íntimo', 'higiene', 'frasco', true),
  ('hidratante-labial', 'Hidratante labial', 'higiene', 'unidade', true),
  ('hidratante-corporal', 'Hidratante corporal', 'higiene', 'frasco', true),
  ('protetor-solar', 'Protetor solar', 'higiene', 'frasco', true),
  ('clorexidina', 'Enxaguante com clorexidina', 'higiene', 'frasco', true),
  ('pomada-assadura', 'Pomada para assadura', 'higiene', 'bisnaga', true),
  ('lençol-descartavel', 'Lençol descartável', 'higiene', 'unidade', true),
  ('oleo-girassol', 'Óleo de girassol', 'higiene', 'frasco', true),
  ('gaze', 'Gaze não estéril', 'higiene', 'pacote', true),
  ('algodao', 'Algodão', 'higiene', 'pacote', true),
  ('soro-fisiologico', 'Soro fisiológico', 'higiene', 'frasco', true),
  ('sonda-aspiracao', 'Sonda de aspiração', 'higiene', 'unidade', true),
  ('dieta-calorica', 'Dieta calórica', 'dieta', 'frasco', true),
  ('dieta-fibras', 'Dieta com fibras', 'dieta', 'frasco', true),
  ('frasco-dieta', 'Frasco de dieta', 'dieta', 'unidade', true),
  ('equipo-dieta', 'Equipo de dieta', 'dieta', 'unidade', true)
on conflict (id) do update set name = excluded.name, category = excluded.category,
  unit = excluded.unit, is_active = excluded.is_active;

update public.products set aliases = case id
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
