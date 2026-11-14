import type { PurchaseReceipt, SupplyDocument } from "@/types/documents";
import { receiptStates } from "./purchase";

export type ReceiptFilter = { query: string; state: "" | PurchaseReceipt["state"] };
const text = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");

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
