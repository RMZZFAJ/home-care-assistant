import { formatQuantity, quantity } from "@/lib/quantity";
import type { PurchaseReceipt, SupplyDocument, SupplyLine } from "@/types/documents";
import type { PurchaseSelection } from "@/lib/validation/purchase-command";
import type { PurchaseArrivalSelection } from "@/lib/validation/purchase-arrival";

export const receiptStates: Record<PurchaseReceipt["state"], string> = {
  pending: "Aguardando conferência", approved: "Validada", rejected: "Rejeitada",
  correction_requested: "Correção solicitada",
};
export const purchaseActivitySteps = [
  { label: "Registrando a compra e as chegadas", icon: "file" },
  { label: "Conferindo o resultado", icon: "check" },
  { label: "Atualizando o acompanhamento", icon: "refresh" },
] as const;
export function acquisitionRemaining(line: SupplyLine) {
  return quantity(line.approved_quantity).minus(line.purchased_quantity).minus(line.waived_quantity ?? 0).minus(line.covered_quantity ?? 0);
}
export function arrivalRemaining(line: SupplyLine, document: SupplyDocument) {
  const reported = document.purchaseProgress?.lines.find(item => item.lineId === line.id);
  if (reported) return quantity(reported.unarrivedQuantity);
  const pending = document.receipts.filter(receipt => receipt.state === "pending").flatMap(receipt => receipt.lines).filter(item => item.lineId === line.id).reduce((sum, item) => sum.plus(item.quantity), quantity(0));
  return quantity(line.purchased_quantity).minus(line.accepted_quantity).minus(pending);
}

export function arrivalCorrectionExpected(document: SupplyDocument, receipt: PurchaseReceipt, item: PurchaseReceipt["lines"][number], line: SupplyLine) {
  const expected = quantity(receipt.l2_arrival ? item.expectedQuantity ?? item.quantity : item.quantity);
  const reserved = receipt.l2_arrival && item.remainingAction === "short" ? expected
    : expected.lt(item.quantity) ? expected : quantity(item.quantity);
  return arrivalRemaining(line, document).plus(reserved);
}

export function formatPurchaseDate(date: string) {
  return date.split("-").reverse().join("/");
}

export function purchaseArrivalVariance(
  receipt: PurchaseReceipt, item: PurchaseReceipt["lines"][number], unit: string,
) {
  if (!receipt.l2_arrival || item.expectedQuantity == null) return null;
  const difference = quantity(item.expectedQuantity).minus(item.quantity);
  const expected = "Esperados " + formatQuantity(item.expectedQuantity, unit);
  if (difference.gt(0)) return expected + " · Faltaram " + formatQuantity(difference.toFixed(), unit) +
    (item.remainingAction === "short" ? " · Encerrar com falta" : " · Aguardar nova entrega");
  if (difference.lt(0)) return expected + " · Excedente conferido de " + formatQuantity(difference.abs().toFixed(), unit);
  return expected;
}

export function requirePurchaseReceipt(document: SupplyDocument, lines: PurchaseArrivalSelection, key: string) {
  const receipt = Array.isArray(document.receipts) && document.receipts.find(item => item.submission_key === key);
  if (!receipt || !["approved", "pending", "rejected"].includes(receipt.state) ||
    !Array.isArray(receipt.lines) || receipt.lines.length !== lines.length ||
    !lines.every(line => receipt.lines.some(item =>
      item.lineId === line.lineId && quantity(item.quantity).eq(line.quantity) &&
      item.remainingAction === line.remainingAction && item.excessConfirmed === line.excessConfirmed &&
      sameArrivalCoverage(item.coverage, line.coverage) &&
      (line.expectedQuantity === undefined ? item.expectedQuantity === undefined :
        item.expectedQuantity != null && quantity(item.expectedQuantity).eq(line.expectedQuantity)),
    ))) {
    throw new Error("A resposta não confirmou a parcela desta tentativa. Confira o resultado antes de repetir.");
  }
  return receipt;
}

export function sameArrivalCoverage(a: PurchaseReceipt["lines"][number]["coverage"], b: typeof a) {
  if (!a || !b) return a === b;
  return a.documentId === b.documentId && a.lineId === b.lineId && quantity(a.quantity).eq(b.quantity);
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
