import type { RequisitionReceipt } from "@/types/requisition";

export function formatBrazilDate(value: string | null) {
  if (!value || Number.isNaN(new Date(value).getTime())) return "Data desconhecida";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function buildWhatsAppSummary(receipt: RequisitionReceipt) {
  return `Requisição ${receipt.protocol} registrada. Consulte os detalhes no Home Care Assistant com sua conta autorizada.`;
}
