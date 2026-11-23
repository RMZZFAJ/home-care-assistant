import type { CatalogProduct, SupplyDocument } from "@/types/documents";

function normalizedName(name: string) {
  return name.trim().normalize("NFD").replaceAll(/\p{M}/gu, "").toLowerCase();
}

export function balanceCatalogueMatches(name: string, catalogue: readonly CatalogProduct[]) {
  const key = normalizedName(name);
  return key ? catalogue.filter(product => [product.name, ...product.aliases ?? []]
    .some(label => normalizedName(label) === key)) : [];
}

export function priorBalanceMaterials(document: SupplyDocument | null, catalogue: readonly CatalogProduct[]) {
  const catalogued = new Set(document?.lines.map(line => line.product_id));
  const extras = [];
  const unresolved = [];
  for (const extra of document?.payload.balanceExtras ?? []) {
    const matches = balanceCatalogueMatches(extra.name, catalogue);
    if (matches.length === 1) catalogued.add(matches[0].id);
    else if (matches.length > 1) unresolved.push({ extra, matches });
    else extras.push(extra);
  }
  return { catalogued, extras, unresolved };
}
