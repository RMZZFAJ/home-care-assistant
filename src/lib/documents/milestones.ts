import { quantity } from "@/lib/quantity";
import type { SupplyDocument } from "@/types/documents";
export type DocumentMilestone = {
  label: string;
  state: "done" | "pending" | "unknown" | "waived" | "closed";
  detail: string;
};
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
  >;
  balanceRecount?: Pick<
    NonNullable<SupplyDocument["balanceRecount"]>,
    "activeAssignment" | "requiresDesignation"
  >;
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
      progress &&
      hasAcquisition &&
      !progress.physicalPending &&
      !progress.validationPending;
    const settled =
      progress &&
      !progress.expectationPending &&
      !progress.physicalPending &&
      !progress.validationPending;
    return [
      issued,
      {
        label: "Aquisição",
        state: progress
          ? acquired === progress.lines.length && acquired > 0
            ? "done"
            : waived && !progress.expectationPending
              ? "waived"
              : "pending"
          : "unknown",
        detail: progress
          ? `${acquired}/${progress.lines.length} linhas integralmente adquiridas${waived ? "; há parcela dispensada" : ""}`
          : "Referência de aquisição indisponível",
      },
      {
        label: "Recebimento",
        state: received
          ? "done"
          : progress && !hasAcquisition && progress.expectationClosed
            ? "waived"
            : progress
              ? "pending"
              : "unknown",
        detail: received
          ? "Chegadas conferidas"
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
  if (data.type === "ENT")
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
          data.status === "confirmed" ? "done" : closed ? "unknown" : "pending",
        detail: `${data.fullyCheckedLines}/${data.totalLines} linhas integralmente conferidas${closed ? "; histórico físico preservado" : ""}`,
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
                ? "Recebimento confirmado"
                : "Consulte o aceite e eventuais divergências",
      },
    ];
  if (data.type !== "BAL") return [issued];
  const review = data.balanceReview;
  const counted =
    Boolean(data.protocol) && ["submitted", "approved"].includes(data.status);
  const recountPending = Boolean(
    data.balanceRecount?.activeAssignment ||
      data.balanceRecount?.requiresDesignation,
  );
  // Approval and reconciliation are separate facts. A later movement does not
  // undo a recorded reconciliation, but a new recount prevents finality.
  const complete =
    data.status === "approved" &&
    review?.reconciliationApplied === true &&
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
        review?.reviewRequired === false
          ? "waived"
          : data.status === "approved"
            ? "done"
            : review
              ? "pending"
              : "unknown",
      detail:
        review?.reviewRequired === false
          ? "Revisão facultativa nesta contagem"
          : data.status === "approved"
            ? "Revisões exigidas registradas"
            : "Consulte autoria e versão das revisões",
    },
    {
      label: "Conclusão",
      state: closed
        ? "closed"
        : recountPending
          ? "pending"
          : complete
            ? "done"
            : "unknown",
      detail: closed
        ? "Documento encerrado; histórico preservado"
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
