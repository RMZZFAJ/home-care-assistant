import { quantity } from "@/lib/quantity";
import type { SupplyDocument, SupplyLine } from "@/types/documents";
import type { PurchaseSelection } from "@/lib/validation/purchase-command";

export const receiptStates: Record<string, string> = {
  pending: "Aguardando conferência", approved: "Validada", rejected: "Rejeitada",
};
export const purchaseActivitySteps = [
  { label: "Registrando a compra e as chegadas", icon: "file" },
  { label: "Conferindo o resultado", icon: "check" },
  { label: "Atualizando o acompanhamento", icon: "refresh" },
] as const;
export function acquisitionRemaining(line: SupplyLine) {
  return quantity(line.approved_quantity).minus(line.purchased_quantity).minus(line.waived_quantity ?? 0);
}
export function arrivalRemaining(line: SupplyLine, document: SupplyDocument) {
  const reported = document.purchaseProgress?.lines.find(item => item.lineId === line.id);
  if (reported) return quantity(reported.unarrivedQuantity);
  const pending = document.receipts.filter(receipt => receipt.state === "pending").flatMap(receipt => receipt.lines).filter(item => item.lineId === line.id).reduce((sum, item) => sum.plus(item.quantity), quantity(0));
  return quantity(line.purchased_quantity).minus(line.accepted_quantity).minus(pending);
}

export function formatPurchaseDate(date: string) {
  return date.split("-").reverse().join("/");
}

export function requirePurchaseArrival(document: SupplyDocument, lines: PurchaseSelection) {
  const inHand = lines.filter(line => line.inHand);
  if (!inHand.length) return undefined;
  const receipt = document.purchaseArrivalId && Array.isArray(document.receipts) && document.receipts.find(
    item => item.id === document.purchaseArrivalId,
  );
  if (!receipt || !["approved", "pending", "rejected"].includes(receipt.state) ||
    !Array.isArray(receipt.lines) || receipt.lines.length !== inHand.length ||
    !inHand.every(line => receipt.lines.some(item =>
      item.lineId === line.lineId && quantity(item.quantity).eq(line.quantity),
    ))) {
    throw new Error("A confirmação não identifica a chegada desta compra. Confira o resultado antes de repetir.");
  }
  return receipt;
}
