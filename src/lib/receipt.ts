import type { RequisitionReceipt } from "@/types/requisition";

export function formatBrazilDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function buildWhatsAppSummary(receipt: RequisitionReceipt) {
  const items = [...receipt.lines.map((item) => `${item.productName}: ${item.requestedQuantity}`), ...receipt.extraItems.map((item) => `${item.name}: ${item.requestedQuantity}`)];
  return `Requisição ${receipt.protocol} para ${receipt.recipientName}. Itens: ${items.join("; ")}.`;
}
