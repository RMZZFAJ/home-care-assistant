export const extraMaterialUnits = ["unidade", "pacote", "frasco", "tubo", "comprimido", "par", "caixa"] as const;
export const extraMaterialCategories = ["medicamentos", "higiene", "dieta"] as const;

export type ExtraMaterialIdentity = {
  category: (typeof extraMaterialCategories)[number];
  unit: (typeof extraMaterialUnits)[number];
  details?: string;
};

export type CatalogueExtra = { details?: string };
