import type { ItemContext } from "@/types/documents";
import type { SupplySourceLink, SupplySourceOption } from "@/lib/validation/supply-sources";

type Selection = { option: SupplySourceOption; importMaterials: boolean };
export type SupplySourcePreparation = {
  sources: SupplySourceLink[];
  sourceImports: Record<string, string[]>;
  sourceSeeds: Record<string, string>;
};

export const emptySupplySources: SupplySourcePreparation = { sources: [], sourceImports: {}, sourceSeeds: {} };

/** Bring the older line-only selections into the same per-material picker. */
export function includeSavedRequisitionSources(
  preparation: SupplySourcePreparation,
  linkedLines: Record<string, string[]>,
  requests: ItemContext[],
): SupplySourcePreparation {
  const sources = new Map(preparation.sources.map(row => [row.documentId, row]));
  for (const { productId, pending } of requests) {
    const selected = linkedLines[productId];
    if (!selected?.length) continue;
    for (const { lineId, requisitionId } of pending) {
      if (!selected.includes(lineId)) continue;
      const source = sources.get(requisitionId);
      if (source?.productIds.includes(productId)) continue;
      sources.set(requisitionId, {
        documentId: requisitionId,
        general: source?.general ?? false,
        productIds: [...(source?.productIds ?? []), productId],
      });
    }
  }
  return { ...preparation, sources: [...sources.values()] };
}

export function prepareSupplySources(
  previous: SupplySourcePreparation,
  selections: Selection[],
  selectedQuantities: Record<string, string>,
  selectedLinks: Record<string, string[]>,
  requests: ItemContext[],
  material?: string,
) {
  const sourceImports = { ...previous.sourceImports };
  const sourceSeeds = { ...previous.sourceSeeds };
  const byDocument = new Map<string, SupplySourceLink>();
  for (const previousLink of previous.sources) {
    const id = previousLink.documentId;
    const imported = sourceImports[id] ?? [];
    byDocument.set(id, {
      ...previousLink,
      general: material ? previousLink.general : false,
      productIds: previousLink.productIds.filter((product) => material ? product !== material : !imported.includes(product)),
    });
    if (material) sourceImports[id] = imported.filter((product) => product !== material);
    else delete sourceImports[id];
  }
  const quantities = { ...selectedQuantities };
  for (const { option, importMaterials } of selections) {
    const link = byDocument.get(option.id);
    const imported = importMaterials && !material ? [...new Set(option.materials.map((row) => row.productId))] : [];
    if (imported.length) sourceImports[option.id] = imported;
    byDocument.set(option.id, {
      documentId: option.id,
      general: material ? link?.general ?? false : true,
      productIds: [...new Set([...(link?.productIds ?? []), ...(material ? [material] : imported)])],
    });
    for (const product of imported) {
      if (Object.hasOwn(quantities, product)) continue;
      const amount = option.materials.find((row) => row.productId === product)?.available ?? "";
      quantities[product] = amount;
      sourceSeeds[product] = amount;
    }
  }
  const sources = [...byDocument.values()].filter((row) => row.general || row.productIds.length);
  const linkedProducts = new Set(sources.flatMap((row) => row.productIds));
  const links = { ...selectedLinks };
  for (const { productId, pending } of requests) {
    const wasLinked = new Set(previous.sources.filter((row) => row.productIds.includes(productId)).map((row) => row.documentId));
    const nowLinked = new Set(sources.filter((row) => row.productIds.includes(productId)).map((row) => row.documentId));
    const removed = new Set(pending.filter((row) => wasLinked.has(row.requisitionId) && !nowLinked.has(row.requisitionId)).map((row) => row.lineId));
    const added = pending.filter((row) => nowLinked.has(row.requisitionId)).map((row) => row.lineId);
    if (removed.size || added.length)
      links[productId] = [...new Set([...(links[productId] ?? []).filter((id) => !removed.has(id)), ...added])];
  }
  for (const [product, amount] of Object.entries(sourceSeeds)) {
    if (linkedProducts.has(product)) continue;
    if (quantities[product] === amount && !links[product]?.length) delete quantities[product];
    delete sourceSeeds[product];
  }
  return { quantities, links, preparation: { sources, sourceImports, sourceSeeds } };
}
