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
