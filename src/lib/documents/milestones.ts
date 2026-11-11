import { quantity } from "@/lib/quantity";
import type { SupplyDocument } from "@/types/documents";
import { currentBalanceRecount } from "./balance-follow-up";
export type DocumentMilestone = {
  label: string;
  state: "done" | "pending" | "unknown" | "waived" | "closed";
  detail: string;
  percent?: number;
};

function linePercent(completed: number, total: number) {
  return Number.isFinite(completed) && total > 0
    ? Math.max(0, Math.min(100, (completed / total) * 100))
    : undefined;
}
type MilestoneFacts = Pick<
  SupplyDocument,
  | "type"
  | "protocol"
  | "status"
  | "purchaseProgress"
  | "fullyCheckedLines"
  | "totalLines"
> & {
  balanceReview?: Pick<
    NonNullable<SupplyDocument["balanceReview"]>,
    "reviewRequired" | "referenceState" | "reconciliationApplied"
  > & Partial<Pick<NonNullable<SupplyDocument["balanceReview"]>, "policyReviewRequired" | "reviewSatisfied" | "hasItemDifferences" | "reviews" | "countVersion">>;
  balanceRecount?: Pick<
    NonNullable<SupplyDocument["balanceRecount"]>,
    "activeAssignment" | "requiresDesignation"
  > & Partial<Pick<NonNullable<SupplyDocument["balanceRecount"]>, "lastAssignment">>;
  transfer?: Pick<NonNullable<SupplyDocument["transfer"]>, "state" | "agreement">;
};

export function requisitionMilestones(input: {
  historical: boolean;
  issued: boolean;
  scienceRequired: boolean;
  scienceSatisfied: boolean;
  fulfilled: number;
  total: number;
  state: string;
}): DocumentMilestone[] {
  const ended = ["cancelled", "archived"].includes(input.state);
  return [
    {
      label: "Emissão",
      state: input.historical ? "unknown" : input.issued ? "done" : "pending",
      detail: input.historical
        ? "Original não comprovado"
        : input.issued
          ? "Ficha emitida"
          : "Ainda não emitida",
    },
    {
      label: "Ciência familiar",
      state: input.historical
        ? "unknown"
        : !input.scienceRequired
          ? "waived"
          : input.scienceSatisfied
            ? "done"
            : "pending",
      detail: input.historical
        ? "Não comprovada no original"
        : !input.scienceRequired
          ? "Dispensada pela regra; não registra ciência"
          : input.scienceSatisfied
            ? "Critério familiar satisfeito"
            : "Critério familiar pendente",
    },
    {
      label: "Atendimento",
      percent: input.historical
        ? undefined
        : linePercent(input.fulfilled, input.total),
      state: input.historical
        ? "unknown"
        : input.total > 0 && input.fulfilled === input.total
          ? "done"
          : "pending",
      detail: input.historical
        ? "Atendimento original não apurado"
        : `${input.fulfilled}/${input.total} itens atendidos por ENT aceita`,
    },
    {
      label: "Conclusão",
      state: input.historical
        ? "unknown"
        : input.state === "completed"
          ? "done"
          : ended
            ? "closed"
            : "pending",
      detail: input.historical
        ? "Consulte o registro histórico"
        : input.state === "completed"
          ? "Conclusão operacional registrada"
          : input.state === "cancelled"
            ? "Cancelada; efeitos anteriores preservados"
            : input.state === "archived"
              ? "Arquivada; consulte as ressalvas"
              : input.state === "completed_science_pending"
                ? "Atendimento concluído; ciência ainda pendente"
                : "Acompanhamento em curso",
    },
  ];
}

export function supplyMilestones(data: MilestoneFacts): DocumentMilestone[] {
  if (data.type === "ENT" && data.transfer && data.transfer.state !== "dispatched") {
    const transfer = data.transfer;
    const ended = ["declined", "withdrawn"].includes(transfer.state);
    return [
      { label: "Declaração", state: "done", detail: "Preparação registrada; ainda sem emissão ENT" },
      { label: "Concordância", state: transfer.agreement?.decision === "agree" ? "done" : ended ? "closed" : "pending",
        detail: transfer.agreement?.decision === "agree" ? "Decisão própria registrada; não é recebimento" : transfer.state === "declined" ? "Contraparte recusou a declaração" : ended ? "Encerrada sem nova decisão" : "Aguardando a contraparte designada" },
      { label: "Expedição", state: ended ? "closed" : "pending", detail: ended ? "Encerrada sem expedir materiais" : "Concordância não expede materiais" },
      { label: "Recebimento", state: ended ? "closed" : "pending", detail: "Sem expedição; nenhum recebimento presumido" },
    ];
  }
  const issued: DocumentMilestone = {
    label: "Emissão",
    state: data.protocol ? "done" : "pending",
    detail: data.protocol
      ? "Protocolo atribuído"
      : "Sem expedição ou emissão definitiva",
  };
  const closed = ["cancelled", "administratively_closed", "rejected"].includes(
    data.status,
  );
  if (data.type === "COM") {
    const progress = data.purchaseProgress;
    const operational = Boolean(data.protocol) && !["draft", "pending_approval"].includes(data.status);
    const acquired =
      progress?.lines.filter(
        (line) =>
          quantity(line.approvedQuantity).gt(0) &&
          quantity(line.purchasedQuantity).gte(quantity(line.approvedQuantity)),
      ).length ?? 0;
    const waived =
      progress?.lines.some((line) => quantity(line.waivedQuantity).gt(0)) ??
      false;
    const hasAcquisition =
      progress?.lines.some((line) => quantity(line.purchasedQuantity).gt(0)) ??
      false;
    const received =
      operational &&
      progress &&
      hasAcquisition &&
      !progress.physicalPending &&
      !progress.validationPending;
    const settled =
      operational &&
      progress &&
      (hasAcquisition || progress.expectationClosed) &&
      !progress.expectationPending &&
      !progress.physicalPending &&
      !progress.validationPending;
    return [
      issued,
      {
        label: "Aquisição",
        percent: progress
          ? linePercent(acquired, progress.lines.length)
          : undefined,
        state: progress
          ? operational && acquired === progress.lines.length && acquired > 0
            ? "done"
            : closed ? "closed" : operational && waived && !progress.expectationPending
              ? "waived"
              : "pending"
          : "unknown",
        detail: data.status === "draft"
          ? "Preparação não comprova aquisição"
          : data.status === "pending_approval"
            ? "Aguardando decisão de aprovação"
            : progress
          ? `${acquired}/${progress.lines.length} linhas integralmente adquiridas${waived ? "; aquisição restante encerrada" : ""}`
          : "Referência de aquisição indisponível",
      },
      {
        label: "Recebimento",
        state: received
          ? "done"
          : closed ? "closed" : operational && progress && !hasAcquisition && progress.expectationClosed
            ? "waived"
            : progress
              ? "pending"
              : "unknown",
        detail: received
          ? "Chegadas conferidas"
          : closed
            ? "Encerramento preservado; sem recebimento presumido"
            : progress?.validationPending
            ? "Conferência de chegada pendente"
            : !hasAcquisition && progress?.expectationClosed
              ? "Expectativa encerrada sem nova chegada"
              : "Consulte chegadas e conferências",
      },
      {
        label: "Conclusão",
        state: closed
          ? "closed"
          : settled
            ? "done"
            : progress
              ? "pending"
              : "unknown",
        detail: closed
          ? "Documento encerrado; consulte o histórico"
          : settled
            ? progress.expectationClosed
              ? "Expectativa encerrada com decisão registrada"
              : "Etapas documentais satisfeitas"
            : "Expectativa e efeitos continuam independentes",
      },
    ];
  }
  if (data.type === "ENT") {
    const fullReceipt = Boolean(data.protocol) && data.totalLines > 0 && data.fullyCheckedLines === data.totalLines;
    const differences = data.totalLines > 0 && data.fullyCheckedLines >= 0 && data.fullyCheckedLines < data.totalLines;
    return [
      issued,
      {
        label: "Expedição",
        state: data.protocol ? "done" : "pending",
        detail: data.protocol
          ? "Expedição registrada"
          : "Declaração não comprova expedição",
      },
      {
        label: "Recebimento",
        state:
          data.status === "confirmed"
            ? fullReceipt ? "done" : differences ? "closed" : "unknown"
            : closed ? "unknown" : "pending",
        detail: `${data.fullyCheckedLines}/${data.totalLines} linhas integralmente conferidas${closed ? "; histórico físico preservado" : data.status === "confirmed" && !fullReceipt ? differences ? "; diferenças conciliadas não são recebimento" : "; referência integral indisponível" : ""}`,
        percent: closed
          ? undefined
          : linePercent(data.fullyCheckedLines, data.totalLines),
      },
      {
        label: "Conclusão",
        state: closed
          ? "closed"
          : data.status === "confirmed"
            ? "done"
            : "pending",
        detail:
          data.status === "administratively_closed"
            ? "Encerramento administrativo; não presume recebimento"
            : data.status === "cancelled"
              ? "Cancelamento formal registrado"
              : data.status === "confirmed"
                ? fullReceipt ? "Recebimento confirmado" : differences ? "Conferência e conciliação concluídas" : "Conclusão registrada; recebimento integral não comprovado"
                : "Consulte o aceite e eventuais divergências",
      },
    ];
  }
  if (data.type !== "BAL") return [issued];
  const review = data.balanceReview;
  const counted =
    Boolean(data.protocol) && ["submitted", "approved"].includes(data.status);
  const recountPending = Boolean(
    currentBalanceRecount(data.balanceRecount) ||
      data.balanceRecount?.requiresDesignation,
  );
  // Approval and reconciliation are separate facts. A later movement does not
  // undo a recorded reconciliation, but a new recount prevents finality.
  const complete =
    counted &&
    data.status === "approved" &&
    review?.reconciliationApplied === true &&
    !review.hasItemDifferences &&
    !recountPending;
  return [
    issued,
    {
      label: "Contagem",
      state: counted ? "done" : closed ? "unknown" : "pending",
      detail: counted
        ? "Contagem documental registrada"
        : closed
          ? "Consulte a contagem e seus registros anteriores"
          : "Rascunho não conclui a obrigação",
    },
    {
      label: "Revisão",
      state:
        review?.policyReviewRequired === false && review.reviews?.some(row => row.count_version === review.countVersion)
          ? "done"
          : review?.reviewSatisfied && review.policyReviewRequired
            ? "done"
            : review?.reviewRequired === false && !review.policyReviewRequired
          ? "waived"
          : data.status === "approved"
            ? "done"
            : review
              ? "pending"
              : "unknown",
      detail:
        review?.policyReviewRequired === false && review.reviews?.some(row => row.count_version === review.countVersion)
          ? "Parecer facultativo registrado"
          : review?.reviewSatisfied && review.policyReviewRequired
            ? "Revisões exigidas registradas; aplicação é ato separado"
            : review?.reviewRequired === false && !review.policyReviewRequired
          ? "Revisão facultativa nesta contagem"
          : data.status === "approved"
            ? "Revisões exigidas registradas"
            : "Consulte autoria e versão das revisões",
    },
    {
      label: "Conclusão",
      state: closed
        ? "closed"
        : recountPending || review?.hasItemDifferences
          ? "pending"
          : complete
            ? "done"
            : "unknown",
      detail: closed
        ? "Documento encerrado; histórico preservado"
        : review?.hasItemDifferences
          ? "Diferença apontada; correção depende de ato próprio"
          : recountPending
          ? "Reconto ou nova designação pendente"
          : complete
            ? "Contagem aprovada e conciliação registrada"
            : review?.referenceState !== "current" &&
                data.status === "submitted"
              ? "Referência anterior não permite concluir a conciliação"
              : "Consulte o efeito e as ressalvas da contagem",
    },
  ];
}
