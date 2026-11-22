import type { CatalogItem, RequisitionLine } from "@/types/requisition";
export type SelectionProduct = Pick<CatalogItem,"id"|"name"|"category"|"unit"|"active"|"is_active">;

/** Membership is reusable; observations and urgency are fresh declarations. */
export function applyMaterialSelection(current: RequisitionLine[], selectedIds: string[], catalogue: SelectionProduct[]) {
  const lines = [...current], added: string[] = [], duplicate: string[] = [], unavailable: string[] = [];
  for (const id of new Set(selectedIds)) {
    if (lines.some(line => line.productId === id)) { duplicate.push(id); continue; }
    const product = catalogue.find(item => item.id === id && item.active !== false && item.is_active !== false);
    if (!product) { unavailable.push(id); continue; }
    lines.push({ productId: id, productName: product.name, category: product.category, unit: product.unit,
      currentStock: null, stockObservation: "unfilled", stockObservationAt: null, urgent: false });
    added.push(id);
  }
  return { lines, added, duplicate, unavailable };
}
