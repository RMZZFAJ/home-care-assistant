import { quantity } from "@/lib/quantity";
import type { SupplyDocument } from "@/types/documents";

type DeliveryFollowUp = {
  heading: string;
  description: string;
  pending: boolean;
  label: string;
  section: "workflow" | "history";
  statusLabel?: string;
};
type Facts = Pick<SupplyDocument,
  "status" | "protocol" | "fullyCheckedLines" | "totalLines" |
  "deliveryCancellation" | "deliveryRegularization">;

export function deliveryFollowUp(data: Facts, operation: "delivery" | "return" = "delivery"): DeliveryFollowUp {
  const noun = operation === "return" ? "devolução" : "entrega";
  const base = { label: "Atendimento e decisões", section: "workflow" as const };
  const regularization = data.deliveryRegularization;
  const current = regularization?.cases.find(item => item.id === regularization.currentId);
  if (["cancelled", "rejected"].includes(data.status)) return {
    ...base, pending: false,
    ...(data.deliveryCancellation ? {} : { label: "Versões e integridade", section: "history" as const }),
    heading: `Consultar o encerramento da ${noun}`,
    description: "A ficha está encerrada. Consulte o motivo, os fatos preservados e a conciliação correspondente. Este registro não solicita novo recebimento nem apaga atos anteriores.",
  };
  if (data.status === "draft") return {
    ...base, pending: true, heading: `Conferir a preparação da ${noun}`,
    description: "A ficha ainda não foi expedida. Preparar os materiais e indicar o recebedor não registra expedição, recebimento ou atendimento de uma REQ.",
  };
  if (current?.state === "pending") return {
    ...base, pending: true, heading: "Conferir a proposta de regularização",
    description: "A proposta aguarda conferência independente. Consulte a apuração e a pessoa designada; propor não movimenta estoque nem substitui o aceite pessoal original.",
  };
  if (data.status === "administratively_closed") return {
    ...base,
    pending: Boolean(regularization && quantity(regularization.pendingTransit).gt(0)),
    heading: regularization && quantity(regularization.pendingTransit).gt(0)
      ? "Acompanhar o material ainda em trânsito"
      : "Consultar o encerramento administrativo",
    description: "O encerramento administrativo preserva o aceite e tem autoria própria. Consulte o dossiê e as apurações. Parcela física desconhecida continua em trânsito com seu responsável; o encerramento não presume recebimento nem resolve essa parcela.",
  };
  if (["pending_receipt", "disputed", "cancellation_pending"].includes(data.status) && regularization?.recipientAvailable === false) return {
    ...base, pending: true, heading: `Consultar a regularização da ${noun}`,
    description: "O recebedor indicado está indisponível. Consulte a apuração administrativa e a conferência independente permitidas; outra pessoa não declara recebimento em seu lugar. Os fatos originais permanecem preservados.",
  };
  if (data.status === "cancellation_pending") {
    const cancellation = data.deliveryCancellation;
    if (cancellation?.unresolvedTransit != null && quantity(cancellation.unresolvedTransit).gt(0)) return {
      ...base, pending: true, heading: "Conciliar o material ainda em trânsito",
      description: "O pedido de cancelamento mantém os fatos anteriores. Há material sem conciliação; registre sua situação real antes do consentimento. O pedido não devolve material nem estorna estoque.",
    };
    if (cancellation && !cancellation.sourceReady) return {
      ...base, pending: true, heading: "Atualizar as referências do cancelamento",
      description: cancellation.sourceAccess === false
        ? "As referências não estão disponíveis para o seu acesso atual. Consulte o pedido preservado; não há conciliação autorizada a partir de valores restritos."
        : "As referências desta conciliação não foram comprovadas. Consulte o pedido e atualize as referências antes de revisar uma decisão; os fatos anteriores permanecem preservados.",
    };
    return {
      ...base, pending: true, heading: "Conferir o pedido de cancelamento",
      description: "O recebedor decide pessoalmente e o solicitante pode retirar seu pedido. A solicitação preserva recebimento e estoque; sua existência não comprova consentimento, devolução ou consumo.",
    };
  }
  if (data.status === "disputed") return {
    ...base, pending: true, heading: `Conciliar a divergência da ${noun}`,
    description: "Quantidades já aceitas ficam preservadas. Concilie somente a parcela pendente com sua situação real; devolução ou falta não equivalem a recebimento.",
  };
  if (data.status === "pending_receipt") return {
    ...base, pending: true, heading: `Conferir o recebimento da ${noun}`,
    description: "A pessoa designada confere e declara seu próprio recebimento. A expedição não comprova aceite nem atendimento da REQ; divergências têm quantidades e tratamento próprios.",
  };
  if (data.status === "confirmed") {
    const full = Boolean(data.protocol) && data.totalLines > 0 && data.fullyCheckedLines === data.totalLines;
    const differences = data.totalLines > 0 && data.fullyCheckedLines >= 0 && data.fullyCheckedLines < data.totalLines;
    return {
      ...base, pending: false,
      heading: full ? "Consultar o recebimento confirmado" : differences ? "Consultar a conferência com diferenças" : "Consultar a conferência registrada",
      statusLabel: differences ? "Conferência concluída com diferenças" : undefined,
      description: full
        ? "O recebimento está registrado. Consulte os autores, instantes e vínculos; este acompanhamento não solicita novo aceite."
        : differences
          ? "A conferência foi encerrada com conciliação. Quantidades devolvidas ou faltantes não foram recebidas e não atendem uma REQ. O atendimento sustentado pela parcela aceita permanece independente. Consulte separadamente o aceite e os atos de conciliação preservados."
          : "A conclusão foi registrada, mas a referência das linhas não comprova recebimento integral. Consulte os fatos preservados; não foi presumida a quantidade recebida.",
    };
  }
  return {
    ...base, pending: false, heading: `Consultar os fatos da ${noun}`,
    description: "A situação atual não permite indicar uma próxima operação. Consulte os registros autorizados ou atualize a ficha; não foi presumido recebimento ou encerramento.",
  };
}
