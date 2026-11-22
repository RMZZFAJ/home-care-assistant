import type { ConsumptionReport } from "@/types/consumption";

type ReadStamp = Pick<ConsumptionReport, "id" | "care_recipient_id" | "version" | "status">;

export function consumptionReadStampMatches(value: ReadStamp | null | undefined, id: string, patient: string) {
  return Boolean(value && value.id === id && value.care_recipient_id === patient
    && Number.isInteger(value.version) && value.version > 0 && value.version <= 2147483647
    && ["reported", "confirmed", "rejected"].includes(value.status));
}

// A supplement advances the report version; a decision closes that version.
// A delayed read cannot undo either authoritative fact already received.
export function mergeConsumptionRead<T extends ReadStamp, U extends ReadStamp>(current: T | null, incoming: U): T | U {
  if (current && current.id === incoming.id && current.care_recipient_id === incoming.care_recipient_id
    && (incoming.version < current.version || current.status !== "reported" && incoming.status !== current.status)) return current;
  return incoming;
}

export function consumptionLocationLabel(location: string) {
  return location === "FAMILY" ? "Família" : location === "CARE_TEAM" ? "Equipe" : "Custódia não identificada";
}

export function consumptionFollowUp(report: Pick<ConsumptionReport, "kind" | "status" | "location" | "current_lines" | "movements">) {
  if (report.status === "rejected") return {
    heading: "Consultar a rejeição do relato", pending: false,
    description: "A rejeição tem decisão e motivo próprios, sem desconto de estoque. O relato original e seus complementos permanecem preservados; este acompanhamento não solicita nova confirmação.",
  };
  if (report.status === "confirmed") {
    if (report.kind === "shortage") return {
      heading: "Consultar a falta conferida", pending: false,
      description: "A conferência da falta registra a necessidade, sem desconto de estoque. Consulte a decisão preservada; reconhecer uma falta não equivale a registrar consumo.",
    };
    return report.movements.length ? {
      heading: "Consultar o consumo confirmado", pending: false,
      description: "A decisão está registrada. Os movimentos desta confirmação identificam as quantidades e suas origens próprias; consulte cada material e unidade. O relato e seus complementos, sozinhos, não produziram esse desconto.",
    } : {
      heading: "Consultar os movimentos da confirmação", pending: false,
      description: "A decisão está registrada, mas os movimentos não estão disponíveis nesta consulta. Atualize antes de concluir a origem ou a quantidade descontada; a ausência desses dados não foi tratada como zero.",
    };
  }
  if (report.status === "reported") {
    if (report.kind === "shortage") return {
      heading: "Conferir a falta, sem desconto", pending: true,
      description: "Uma pessoa autorizada pela custódia confere a falta relatada. Essa decisão registra a necessidade e não desconta estoque; os complementos têm autoria e versão próprias.",
    };
    return !report.current_lines.length ? {
      heading: "Completar os materiais do consumo", pending: true,
      description: "O relato textual ainda não permite confirmar desconto. Inclua materiais e quantidades num complemento. Depois, uma pessoa autorizada pela custódia poderá conferir essa versão; complementar não movimenta estoque.",
    } : {
      heading: report.location === "FAMILY" ? "Conferir o consumo da família" : report.location === "CARE_TEAM" ? "Conferir o consumo da equipe" : "Consultar a custódia do consumo",
      pending: true,
      description: "Esta versão tem materiais declarados e aguarda decisão autorizada pela custódia. Relato e complemento não descontam estoque. A confirmação usa as quantidades revisadas e registra a origem de cada movimento.",
    };
  }
  return {
    heading: "Consultar os registros do relato", pending: false,
    description: "A situação atual não permite indicar uma próxima operação. Atualize a consulta; não foi presumida decisão ou movimentação de estoque.",
  };
}
