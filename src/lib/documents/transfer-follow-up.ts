import type { SupplyDocument } from "@/types/documents";
import { deliveryFollowUp } from "./delivery-follow-up";

export function materialTransferDirection(source?: string, destination?: string) {
  if (source === "FAMILY" && destination === "CARE_TEAM") return "delivery";
  if (source === "CARE_TEAM" && destination === "FAMILY") return "return";
  return null;
}
export function materialTransferLabel(source?: string, destination?: string) {
  const direction = materialTransferDirection(source, destination);
  return direction === "return" ? "Devolução de materiais" : direction === "delivery" ? "Entrega de materiais" : "Transferência entre custódias";
}
type Facts = Pick<SupplyDocument, "transfer" | "status" | "protocol" | "fullyCheckedLines" | "totalLines" | "deliveryCancellation" | "deliveryRegularization">;
export function transferFollowUp(data: Facts) {
  const facts = data.transfer;
  if (!facts) return null;
  const direction = materialTransferDirection(facts.declaration.source, facts.declaration.destination);
  if (facts.state === "dispatched") return deliveryFollowUp(data, direction === "return" ? "return" : "delivery");
  const noun = direction === "return" ? "devolução" : direction === "delivery" ? "entrega" : "transferência";
  const base = { section: "workflow" as const, label: "Declaração e expedição" };
  if (facts.state === "pending" || facts.state === "agreed") return {
    ...base, pending: true, heading: `Conferir a expedição da ${noun}`,
    description: "A expedição debita a origem e põe os materiais em trânsito. O saldo chega ao destino após a conferência pessoal.",
    statusLabel: `${direction === "return" ? "Devolução" : direction === "delivery" ? "Entrega" : "Transferência"} pronta para expedição`,
  };
  if (["declined", "withdrawn"].includes(facts.state)) return {
    ...base, pending: false,
    heading: facts.state === "declined" ? `Consultar a recusa da ${noun}` : `Consultar o encerramento da ${noun}`,
    description: "A preparação foi encerrada sem expedição. Consulte a decisão, o motivo e as autorias preservadas; nenhum material foi movimentado por esse encerramento e não há novo recebimento a confirmar.",
    statusLabel: facts.state === "declined" ? "Declaração recusada sem expedição" : "Declaração encerrada sem expedição",
  };
  return {
    ...base, pending: false, statusLabel: undefined,
    heading: "Consultar os atos da transferência",
    description: "A referência atual não permite indicar uma próxima operação. Consulte os registros preservados; não foi presumida expedição, recebimento ou conclusão.",
  };
}
