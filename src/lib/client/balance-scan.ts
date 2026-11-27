import { formatQuantity, quantity, validQuantity } from "@/lib/quantity";
import type { CatalogProduct } from "@/types/documents";
import { api } from "./api";

export async function scanBalancePresentation(patientId: string, code: string, catalogue: CatalogProduct[], counts: Record<string, string>) {
  const { data: [presentation] } = await api<{ data: { product_id: string; name: string; base_quantity: string }[] }>(
    `/api/catalog/presentations?careRecipientId=${encodeURIComponent(patientId)}&barcode=${encodeURIComponent(code)}`,
  );
  const product = catalogue.find(candidate => candidate.id === presentation?.product_id);
  if (!presentation || !product)
    throw new Error("Código não encontrado no catálogo ativo. Selecione o material manualmente.");
  const count = counts[product.id] || "0";
  if (!validQuantity(count, product.quantity_decimals ?? 0, true))
    throw new Error("Corrija a quantidade deste material antes de acrescentar uma apresentação.");
  return {
    product,
    quantity: quantity(count).plus(presentation.base_quantity).toFixed(),
    message: `${presentation.name}: ${formatQuantity(presentation.base_quantity)} acrescentados à contagem física.`,
  };
}
