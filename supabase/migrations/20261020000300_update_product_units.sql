alter table public.products drop constraint if exists products_unit_check;
alter table public.products add constraint products_unit_check
  check (unit in ('unidade', 'caixa', 'frasco', 'pacote', 'bisnaga', 'envelope', 'comprimido'));

update public.products
set name = case id
  when 'dipirona-liquida' then 'Dipirona Solução Oral'
  when 'simeticona-liquida' then 'Simeticona Solução Oral'
  when 'monuril' then 'Fsofomicna (Monuril) 3g'
  else name
end,
unit = case id
  when 'phosfoenema' then 'bisnaga'
  when 'quetiapina-100' then 'comprimido'
  when 'memantina-10' then 'comprimido'
  when 'lorazepam-2' then 'comprimido'
  when 'risperidona-1' then 'comprimido'
  when 'monuril' then 'envelope'
  when 'probiotico' then 'comprimido'
  when 'fralda' then 'unidade'
  when 'absorvente' then 'unidade'
  when 'sabonete-intimo' then 'frasco'
  when 'hidratante-corporal' then 'frasco'
  when 'protetor-solar' then 'frasco'
  when 'pomada-assadura' then 'bisnaga'
  when 'lençol-descartavel' then 'unidade'
  else unit
end
where id in (
  'phosfoenema', 'quetiapina-100', 'dipirona-liquida',
  'simeticona-liquida', 'memantina-10', 'lorazepam-2',
  'risperidona-1', 'monuril', 'probiotico', 'fralda',
  'absorvente', 'sabonete-intimo', 'hidratante-corporal',
  'protetor-solar', 'pomada-assadura', 'lençol-descartavel'
);
