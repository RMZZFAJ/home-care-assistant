import type { CatalogItem } from "@/types/requisition";

export const CATALOG: CatalogItem[] = [
  ["phosfoenema", "Phosfoenema", "medicamentos", "frasco"],
  ["quetiapina-100", "Quetiapina 100 mg", "medicamentos", "caixa"],
  ["dipirona-liquida", "Dipirona líquida", "medicamentos", "frasco"],
  ["simeticona-liquida", "Simeticona líquida", "medicamentos", "frasco"],
  ["memantina-10", "Memantina 10 mg", "medicamentos", "caixa"],
  ["lorazepam-2", "Lorazepam 2 mg", "medicamentos", "caixa"],
  ["risperidona-1", "Risperidona 1 mg", "medicamentos", "caixa"],
  ["monuril", "Monuril", "medicamentos", "caixa"],
  ["probiotico", "Probiótico", "medicamentos", "caixa"],
  ["clister", "Clister", "medicamentos", "unidade"],
  ["fralda", "Fralda", "higiene", "pacote"],
  ["lenco-umedecido", "Lenço umedecido", "higiene", "pacote"],
  ["absorvente", "Absorvente", "higiene", "pacote"],
  ["sabonete-intimo", "Sabonete íntimo", "higiene", "unidade"],
  ["hidratante-labial", "Hidratante labial", "higiene", "unidade"],
  ["hidratante-corporal", "Hidratante corporal", "higiene", "unidade"],
  ["protetor-solar", "Protetor solar", "higiene", "unidade"],
  ["clorexidina", "Enxaguante com clorexidina", "higiene", "frasco"],
  ["pomada-assadura", "Pomada para assadura", "higiene", "unidade"],
  ["lençol-descartavel", "Lençol descartável", "higiene", "pacote"],
  ["oleo-girassol", "Óleo de girassol", "higiene", "frasco"],
  ["gaze", "Gaze não estéril", "higiene", "pacote"],
  ["algodao", "Algodão", "higiene", "pacote"],
  ["soro-fisiologico", "Soro fisiológico", "higiene", "frasco"],
  ["sonda-aspiracao", "Sonda de aspiração", "higiene", "unidade"],
  ["dieta-calorica", "Dieta calórica", "dieta", "frasco"],
  ["dieta-fibras", "Dieta com fibras", "dieta", "frasco"],
  ["frasco-dieta", "Frasco de dieta", "dieta", "unidade"],
  ["equipo-dieta", "Equipo de dieta", "dieta", "unidade"],
].map(([id, name, category, unit]) => ({ id, name, category, unit })) as CatalogItem[];

export const CATEGORY_LABELS: Record<CatalogItem["category"], string> = {
  medicamentos: "Medicamentos e itens relacionados",
  higiene: "Higiene e materiais",
  dieta: "Dieta",
};
