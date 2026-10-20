import type { CatalogItem } from "@/types/requisition";

type CatalogDefinition = [id: string, name: string, aliases: string[], category: CatalogItem["category"], unit: CatalogItem["unit"]];

const definitions: CatalogDefinition[] = [
  ["phosfoenema", "Phosfoenema", ["Phosfoenema", "Phosfoenema bisnaga"], "medicamentos", "bisnaga"],
  ["quetiapina-100", "Quetiapina 100 mg", ["Quetiapina", "Quetiapina 100mg", "Quetiapina comprimido"], "medicamentos", "comprimido"],
  ["dipirona-liquida", "Dipirona Solução Oral", ["Dipirona líquida", "Dipirona solução oral", "Dipirona"], "medicamentos", "frasco"],
  ["simeticona-liquida", "Simeticona Solução Oral", ["Simeticona líquida", "Simeticona solução oral", "Simeticona"], "medicamentos", "frasco"],
  ["memantina-10", "Memantina 10 mg", ["Memantina", "Memantina 10mg", "Memantina comprimido"], "medicamentos", "comprimido"],
  ["lorazepam-2", "Lorazepam 2 mg", ["Lorazepam", "Lorazepam 2mg", "Lorazepam comprimido"], "medicamentos", "comprimido"],
  ["risperidona-1", "Risperidona 1 mg", ["Risperidona", "Risperidona 1mg", "Risperidona comprimido"], "medicamentos", "comprimido"],
  ["monuril", "Fosfomicina", ["Fosfomicina", "Fosfomicina (Monuril) 3g", "Monuril", "Monuril 3g"], "medicamentos", "envelope"],
  ["probiotico", "Probiótico", ["Probiotico", "Probiótico comprimido"], "medicamentos", "comprimido"],
  ["clister", "Clister", ["Clister", "Enema"], "medicamentos", "unidade"],
  ["fralda", "Fralda", ["Fraldas"], "higiene", "unidade"],
  ["lenco-umedecido", "Lenço umedecido", ["Lenço umedecido", "Lenços umedecidos"], "higiene", "pacote"],
  ["absorvente", "Absorvente", ["Absorventes"], "higiene", "unidade"],
  ["sabonete-intimo", "Sabonete íntimo", ["Sabonete intimo", "Sabonete"], "higiene", "frasco"],
  ["hidratante-labial", "Hidratante labial", ["Hidratante labial", "Protetor labial"], "higiene", "unidade"],
  ["hidratante-corporal", "Hidratante corporal", ["Hidratante corporal", "Hidratante"], "higiene", "frasco"],
  ["protetor-solar", "Protetor solar", ["Protetor solar", "Filtro solar"], "higiene", "frasco"],
  ["clorexidina", "Enxaguante com clorexidina", ["Clorexidina", "Enxaguante bucal com clorexidina"], "higiene", "frasco"],
  ["pomada-assadura", "Pomada para assadura", ["Pomada assadura", "Pomada para irritação"], "higiene", "bisnaga"],
  ["lençol-descartavel", "Lençol descartável", ["Lencol descartavel", "Lençol"], "higiene", "unidade"],
  ["oleo-girassol", "Óleo de girassol", ["Oleo de girassol", "Óleo"], "higiene", "frasco"],
  ["gaze", "Gaze não estéril", ["Gaze nao esteril", "Gaze"], "higiene", "pacote"],
  ["algodao", "Algodão", ["Algodao"], "higiene", "pacote"],
  ["soro-fisiologico", "Soro fisiológico", ["Soro fisiologico", "Soro"], "higiene", "frasco"],
  ["sonda-aspiracao", "Sonda de aspiração", ["Sonda de aspiracao", "Sonda"], "higiene", "unidade"],
  ["dieta-calorica", "Dieta calórica", ["Dieta calorica", "Dieta"], "dieta", "frasco"],
  ["dieta-fibras", "Dieta com fibras", ["Dieta fibras", "Dieta com fibra"], "dieta", "frasco"],
  ["frasco-dieta", "Frasco de dieta", ["Frasco dieta"], "dieta", "unidade"],
  ["equipo-dieta", "Equipo de dieta", ["Equipo dieta", "Equipo"], "dieta", "unidade"],
];

export const CATALOG: CatalogItem[] = definitions.map(([id, name, aliases, category, unit]) => ({ id, name, aliases, category, unit }));

export function normalizeCatalogText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
}

export function findCatalogItemByName(value: string) {
  const normalized = normalizeCatalogText(value);
  return CATALOG.find((item) => [item.name, ...item.aliases].some((name) => normalizeCatalogText(name) === normalized));
}

export const CATEGORY_LABELS: Record<CatalogItem["category"], string> = {
  medicamentos: "Medicamentos e itens relacionados",
  higiene: "Higiene e materiais",
  dieta: "Dieta",
};
