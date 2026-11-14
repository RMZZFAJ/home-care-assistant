import { quantity } from "@/lib/quantity";
import type { SupplyDocument, SupplyLine } from "@/types/documents";

export const receiptStates: Record<string, string> = {
  pending: "Aguardando conferência", approved: "Validada", rejected: "Rejeitada",
};
export function acquisitionRemaining(line: SupplyLine) {
  return quantity(line.approved_quantity).minus(line.purchased_quantity).minus(line.waived_quantity ?? 0);
}
export function arrivalRemaining(line: SupplyLine, document: SupplyDocument) {
  const reported = document.purchaseProgress?.lines.find(item => item.lineId === line.id);
  if (reported) return quantity(reported.unarrivedQuantity);
  const pending = document.receipts.filter(receipt => receipt.state === "pending").flatMap(receipt => receipt.lines).filter(item => item.lineId === line.id).reduce((sum, item) => sum.plus(item.quantity), quantity(0));
  return quantity(line.purchased_quantity).minus(line.accepted_quantity).minus(pending);
}
