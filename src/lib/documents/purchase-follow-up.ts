import { documentStatusLabel } from "./presentation";
import { quantity } from "@/lib/quantity";
import type { PurchaseProgress } from "@/types/documents";

type PurchaseFollowUp = {
  heading: string;
  description: string;
  pending: boolean;
  label: string;
  section: "workflow" | "history";
  statusLabel: string;
};

export function purchaseFollowUp(input: {
  status: string;
  origin?: string;
  progress?: PurchaseProgress;
}): PurchaseFollowUp {
  const progress = input.progress;
  const state = progress?.state ?? input.status;
  const donation = input.origin === "donation";
  const base = {
    label: "Aquisição e chegadas", section: "workflow" as const,
    statusLabel: donation && ["purchasing", "purchased"].includes(state)
      ? state === "purchasing" ? "Doação em andamento" : "Doação registrada"
      : documentStatusLabel(state),
  };
  if (["cancelled", "rejected", "administratively_closed"].includes(input.status)) return {
    ...base, label: "Versões e integridade", section: "history", pending: false,
    heading: "Consultar o encerramento da aquisição",
    description: "A ficha está encerrada. Consulte os fatos e motivos preservados; esta orientação não solicita nova aquisição ou chegada.",
  };
  if (input.status === "draft") return {
    ...base, pending: true, heading: "Conferir a preparação antes de emitir",
    description: "A COM ainda é um rascunho. Sua preparação não comprova aprovação, aquisição, chegada ou entrada no estoque.",
  };
  if (input.status === "pending_approval") return {
    ...base, pending: true, heading: "Conferir a aprovação da aquisição",
    description: "As quantidades propostas aguardam a decisão autorizada. Aprovar não altera o previsto original nem registra aquisição ou recebimento.",
  };
  if (!progress?.lines.length) return {
    ...base, pending: false, heading: "Consultar as etapas da aquisição",
    description: "A referência das quantidades não está disponível. Atualize a ficha; a ausência desses dados não foi tratada como conclusão.",
  };
  if (progress.validationPending) return {
    ...base, pending: true, heading: "Conferir as parcelas de chegada",
    description: (progress.expectationClosed ? "A aquisição restante foi encerrada, mas há parcelas aguardando validação. " : "Há parcelas aguardando validação. ")
      + "Consulte autor, instante e quantidades de cada declaração. Informar chegada ainda não credita essa parcela no estoque.",
  };
  if (progress.physicalPending) return {
    ...base, pending: true, heading: donation ? "Informar a chegada da doação" : "Informar a chegada da aquisição",
    description: (progress.expectationClosed ? "O encerramento da aquisição restante preservou materiais adquiridos ainda sem chegada válida. " : "Há materiais adquiridos ainda sem chegada válida. ")
      + "Uma parcela rejeitada permanece no histórico e não cria entrada. Registre somente uma chegada efetiva.",
  };
  if (progress.expectationPending) return {
    ...base, pending: true, heading: donation ? "Registrar os materiais da doação" : "Registrar a aquisição dos materiais",
    description: "Ainda há expectativa de aquisição autorizada. Registre somente as quantidades efetivamente adquiridas; esse ato não confirma chegada nem entrada no estoque.",
  };
  if (progress.expectationClosed) return {
    ...base, pending: false, heading: "Consultar a aquisição restante encerrada",
    description: "O encerramento e as parcelas estão preservados. A quantidade não adquirida não foi recebida. As entradas validadas pertencem aos seus atos próprios; a COM não atende uma REQ sem ENT aceita.",
  };
  if (progress.lines.some(line => quantity(line.purchasedQuantity).gt(0))) return {
    ...base, pending: false, heading: "Consultar as entradas validadas",
    description: "As etapas de aquisição e chegada estão satisfeitas pelos registros desta ficha. Consulte suas parcelas, autores e instantes. A entrada familiar não comprova entrega à equipe.",
  };
  return {
    ...base, pending: false, heading: "Conferir a aquisição autorizada",
    description: "Não há aquisição ou encerramento suficientes para indicar conclusão. Consulte os registros autorizados; nenhuma entrada foi presumida.",
  };
}
