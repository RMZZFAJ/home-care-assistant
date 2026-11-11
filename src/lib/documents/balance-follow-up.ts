import type { SupplyDocument } from "@/types/documents";
import type { BalanceRecountContext } from "@/types/balances";

type Facts = Pick<SupplyDocument, "status" | "protocol" | "balanceReview" | "balanceRecount">;
type Step = { heading: string; description: string; pending: boolean; label: string; section: "workflow" | "history"; statusLabel?: string };

type Recount = Pick<BalanceRecountContext, "activeAssignment" | "requiresDesignation"> & Partial<Pick<BalanceRecountContext, "lastAssignment">>;
export function currentBalanceRecount(context?: Recount) {
  const assignment = context?.activeAssignment;
  return assignment?.kind === "recount" && assignment.cycle_id
    && context?.lastAssignment?.cycle_id === assignment.cycle_id ? assignment : null;
}

export function balanceFollowUp(data: Facts): Step {
  const workflow = { label: "Contagem e revisão", section: "workflow" as const };
  if (["cancelled", "rejected"].includes(data.status)) return {
    heading: "Consultar o encerramento do balanço",
    description: "O encerramento preserva as contagens e decisões existentes. Consulte o ato e seus efeitos comprovados; não foi presumida uma contagem concluída, uma nova conciliação ou reversão do estoque.",
    pending: false, label: "Versões e integridade", section: "history",
  };
  if (data.status === "draft") return {
    ...workflow, heading: "Concluir a contagem do balanço", pending: true,
    description: "A preparação ainda não conclui a obrigação de contar. Confira os materiais e a referência antes da confirmação; uma designação ou um rascunho não equivale a uma contagem física registrada.",
  };
  if (currentBalanceRecount(data.balanceRecount)) return {
    ...workflow, heading: "Acompanhar o reconto designado", pending: true,
    description: "Há uma responsabilidade de reconto designada. A designação ainda não é a nova contagem; a contagem anterior, sua autoria e eventual efeito já registrado permanecem preservados.",
  };
  if (data.balanceRecount?.requiresDesignation) return {
    ...workflow, heading: "Designar o reconto do balanço", pending: true,
    description: "O reconto aguarda designação autorizada. Consulte o acompanhamento de balanços para definir a responsabilidade; a ausência de contador não encerra a pendência nem apaga a contagem anterior.",
  };
  const review = data.balanceReview;
  if (!data.protocol || !review) return {
    ...workflow, heading: "Consultar os fatos da contagem", pending: false,
    description: "Os dados disponíveis não comprovam todas as etapas da contagem e da conciliação. Atualize a ficha antes de concluir seu efeito ou uma nova providência; não foi presumida aprovação.",
  };
  if (review.hasItemDifferences) return {
    ...workflow, heading: "Acompanhar as diferenças apontadas no balanço", pending: true,
    description: "Há materiais com diferença declarada em parecer. O parecer não corrige o estoque; consulte o encaminhamento e o ato autorizado de reconto ou ajuste, preservando a contagem original.",
  };
  if (data.status === "submitted" && !review.reconciliationApplied && review.referenceState !== "current") return {
    ...workflow, heading: "Conferir a referência do balanço", pending: true,
    description: review.referenceState === "historical"
      ? "O estoque recebeu movimentos posteriores à referência desta contagem. Essa referência não permite concluir a conciliação atual; consulte o reconto autorizado, preservando a contagem e os pareceres anteriores."
      : "A referência necessária para apurar o efeito desta contagem não está disponível. Consulte o reconto autorizado; não foi presumido saldo zero, aprovação ou conciliação.",
  };
  if (data.status === "approved" && review.reconciliationApplied) return {
    ...workflow, heading: "Consultar a contagem conciliada", pending: false,
    description: "A contagem aprovada tem conciliação registrada. Consulte as diferenças e as revisões com autoria própria. Movimentos posteriores não apagam esse efeito histórico nem autorizam reaplicá-lo; o saldo atual é uma consulta distinta.",
  };
  if (data.status === "submitted" && review.reviewSatisfied) return {
    ...workflow, heading: "Confirmar a aplicação da contagem ao estoque", pending: true,
    description: "As revisões previstas foram registradas. A aplicação ainda depende de uma confirmação própria por pessoa habilitada e da referência válida. Os pareceres, sozinhos, não alteraram o estoque.",
  };
  if (data.status === "submitted" && review.reviewRequired) return {
    ...workflow, heading: "Acompanhar as revisões do balanço", pending: true,
    description: "A contagem foi registrada e aguarda as revisões previstas na política atual. Cada parecer tem autoria própria, distinta de quem contou. Consulte separadamente os pareceres, a referência e o efeito de conciliação, sem presumir conclusão.",
  };
  return {
    ...workflow, heading: "Consultar o efeito da contagem", pending: !review.reconciliationApplied,
    description: "Consulte a contagem, os pareceres e o efeito efetivamente registrado. O estado documental, sozinho, não comprova ajuste de estoque; não repita uma operação para tentar atualizar esta consulta.",
  };
}
