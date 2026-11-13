import { quantity } from "@/lib/quantity";

type FollowUpFacts = {
  historical: boolean;
  status: string;
  archivedAt: string | null;
  completedAt: string | null;
  scienceSatisfied: boolean;
  designationPending: boolean;
  eligible: boolean;
  personalScience: boolean;
  fulfilled: number;
  total: number;
};
type RequisitionFollowUp = {
  heading: string;
  description: string;
  pending: boolean;
  label: string;
  section: "materials" | "workflow" | "history";
};

/** Orient from independent recorded facts; opening a section never performs an act. */
export function requisitionFollowUp(facts: FollowUpFacts): RequisitionFollowUp {
  if (facts.historical) return {
    heading: "Consultar o registro histórico",
    description: "Ciência e atendimento do original não são presumidos. Consulte os fatos e as versões preservados.",
    pending: false, label: "Versões e integridade", section: "history",
  };
  if (facts.status === "cancelled" || facts.archivedAt) return {
    heading: facts.status === "cancelled" ? "Consultar o cancelamento" : "Consultar o arquivamento",
    description: "Os fatos e efeitos anteriores permanecem no histórico. Uma nova necessidade deve ser declarada em outra requisição vinculada.",
    pending: false, label: "Versões e integridade", section: "history",
  };
  if (facts.total <= 0) return {
    heading: "Consultar os materiais da requisição",
    description: "Não há itens apurados para indicar o progresso do atendimento. Consulte o conteúdo preservado; nenhuma conclusão foi inferida.",
    pending: false, label: "Materiais e atendimento", section: "materials",
  };
  if (facts.fulfilled < facts.total) return {
    heading: "Acompanhar as entregas vinculadas",
    description: `${facts.total - facts.fulfilled} de ${facts.total} itens permanecem em aberto. A família avalia se a entrega atende parcial ou completamente à necessidade. Uma diferença entre expedido e recebido exige nova avaliação familiar; compra e expedição não comprovam recebimento.${!facts.scienceSatisfied ? " A ciência familiar é independente e não impede o atendimento." : ""}`,
    pending: true, label: "Materiais e atendimento", section: "materials",
  };
  if (!facts.scienceSatisfied) return {
    heading: facts.designationPending
      ? "Revisar a designação para ciência familiar"
      : facts.eligible && !facts.personalScience
        ? "Conferir minha ciência e a conclusão"
        : "Acompanhar a ciência familiar",
    description: facts.designationPending
      ? "O atendimento dos itens está completo, mas a ciência obrigatória depende de uma pessoa familiar habilitada. Consulte a designação com a administração local. Arquivar não registra ciência."
      : "O atendimento dos itens está completo e a ciência familiar obrigatória permanece pendente. Cada pessoa registra somente a própria ciência. O arquivamento manual exige autoridade e justificativa; não substitui essa ciência.",
    pending: true, label: "Ciência e responsáveis", section: "workflow",
  };
  return {
    heading: facts.completedAt ? "Acompanhar a conclusão e o arquivamento" : "Conferir o registro de conclusão",
    description: "Os itens têm atendimento confirmado e a regra de ciência está satisfeita. Consulte os registros de conclusão e arquivamento; ciência dispensada não atribui confirmação a nenhuma pessoa.",
    pending: false, label: "Ciência e responsáveis", section: "workflow",
  };
}

export type RequisitionDelivery = {
  id: string;
  code: string | null;
  status: string;
  acceptedQuantity: string | null;
};

/** A delivery can link several of its lines to the same REQ item. */
export function requisitionDeliveries(rows: RequisitionDelivery[]): RequisitionDelivery[] {
  const documents = new Map<string, RequisitionDelivery>();
  for (const row of rows) {
    const previous = documents.get(row.id);
    let acceptedQuantity: string | null = null;
    try {
      const value = row.acceptedQuantity === null ? null : quantity(row.acceptedQuantity);
      if (value?.isFinite() && value.gte(0) && (!previous || previous.acceptedQuantity !== null)) {
        acceptedQuantity = value.plus(previous?.acceptedQuantity ?? "0").toFixed();
      }
    } catch {
      // Missing or unreadable acceptance is unknown, never a presumed zero.
    }
    documents.set(row.id, { ...row, acceptedQuantity });
  }
  return [...documents.values()].sort((a, b) =>
    (a.code ?? "").localeCompare(b.code ?? "") || a.id.localeCompare(b.id));
}
