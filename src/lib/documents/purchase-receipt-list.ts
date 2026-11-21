import type { PurchaseReceipt, SupplyDocument } from "@/types/documents";
import { quantity } from "@/lib/quantity";
import { receiptStates } from "./purchase";

export type ReceiptFilter = { query: string; state: "" | PurchaseReceipt["state"] };
const text = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");

/** Surface the outstanding arrival first while keeping declared amounts separate from validated entries. */
export function purchaseMaterialArrivals(receipts: readonly PurchaseReceipt[]) {
  const priority = { correction_requested: 2, pending: 1, approved: 0, rejected: 0 };
  const lastChange = (receipt: PurchaseReceipt) => {
    const correction = receipt.corrections?.at(-1);
    return Date.parse(receipt.validated_at ?? correction?.resubmittedAt ?? correction?.requestedAt ?? receipt.created_at);
  };
  const ordered = [...receipts].sort((a, b) => priority[b.state] - priority[a.state]
    || lastChange(b) - lastChange(a) || a.id.localeCompare(b.id));
  const byMaterial = new Map<string, { receipt: PurchaseReceipt; correctionQuantity: ReturnType<typeof quantity> }>();
  for (const receipt of ordered) {
    for (const line of receipt.lines) {
      const material = byMaterial.get(line.lineId) ?? { receipt, correctionQuantity: quantity(0) };
      if (receipt.state === "correction_requested") material.correctionQuantity = material.correctionQuantity.plus(line.quantity);
      byMaterial.set(line.lineId, material);
    }
  }
  return byMaterial;
}

export function purchaseReceiptRows(
  receipts: readonly PurchaseReceipt[],
  lines: readonly Pick<SupplyDocument["lines"][number], "id" | "name_snapshot">[],
  filter: ReceiptFilter,
) {
  const query = text(filter.query.trim());
  // Ordinals locate a receipt in this view; commands continue to use its ID.
  return [...receipts].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((receipt, index) => ({ receipt, ordinal: index + 1 }))
    .filter(({ receipt, ordinal }) => {
      if (filter.state && receipt.state !== filter.state) return false;
      if (!query) return true;
      if (/^\d+$/.test(query)) return ordinal === Number(query);
      const content = text([
        `parcela ${ordinal}`, receiptStates[receipt.state], receipt.submitted_name,
        receipt.validated_name, receipt.reason,
        ...receipt.lines.map(item => lines.find(line => line.id === item.lineId)?.name_snapshot),
      ].filter(Boolean).join(" "));
      return query.split(/\s+/).every(term => content.includes(term));
    });
}
