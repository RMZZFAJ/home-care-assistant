const common = [
  { id: "identification", label: "Identificação" },
  { id: "medicamentos", label: "Medicamentos" },
  { id: "higiene", label: "Higiene" },
  { id: "dieta", label: "Dieta" },
] as const;
export const draftFlowStages = {
  REQ_ARCHIVE: [{ id: "req_archive", label: "Arquivamento da requisição" }],
  REQ_CANCEL: [{ id: "req_cancel", label: "Cancelamento da requisição" }],
  REQ_RESOLVE_EXTRA: [{ id: "req_resolve_extra", label: "Identificação de item extra" }],
  REQ: [...common, { id: "extras", label: "Itens extras" }, { id: "notes", label: "Observações" }, { id: "review", label: "Revisão" }],
  SUPPLY: [...common, { id: "notes", label: "Observações" }, { id: "review", label: "Revisão" }],
  BAL: [{ id: "count", label: "Contagem" }, { id: "review", label: "Revisão" }],
  RECEIVE: [{ id: "receipt", label: "Conferência pessoal" }],
  APPROVE: [{ id: "approval", label: "Decisão de aprovação" }],
  PURCHASE: [{ id: "acquisition", label: "Aquisição" }],
  ARRIVAL: [{ id: "arrival", label: "Chegada" }],
  VALIDATE_RECEIPT: [{ id: "receipt_validation", label: "Validação da parcela" }],
  REJECT_RECEIPT: [{ id: "receipt_rejection", label: "Rejeição da parcela" }],
  CLOSE_EXPECTATION: [{ id: "expectation_closure", label: "Encerramento da expectativa" }],
  CANCEL_COM: [{ id: "com_cancellation", label: "Cancelamento da COM" }],
  REASSIGN_ENT: [{ id: "ent_reassignment", label: "Troca de destinatário" }],
  RESOLVE_ENT: [{ id: "ent_resolution", label: "Conciliação da entrega" }],
  CANCEL_ENT: [{ id: "ent_cancellation", label: "Pedido de cancelamento da ENT" }],
  REFUSE_ENT: [{ id: "ent_cancellation_refusal", label: "Recusa do cancelamento" }],
  WITHDRAW_ENT: [{ id: "ent_cancellation_withdrawal", label: "Retirada do meu pedido" }],
  CONSENT_ENT: [{ id: "ent_cancellation_consent", label: "Consentimento e conciliação" }],
  REGULARIZATION_PROPOSE: [{ id: "ent_regularization_proposal", label: "Proposta de regularização" }],
  REGULARIZATION_APPROVE: [{ id: "ent_regularization_approval", label: "Conferência administrativa" }],
  REGULARIZATION_REJECT: [{ id: "ent_regularization_rejection", label: "Rejeição da proposta" }],
  REGULARIZATION_WITHDRAW: [{ id: "ent_regularization_withdrawal", label: "Retirada ou encerramento da proposta" }],
  REGULARIZATION_FINDING: [{ id: "ent_regularization_finding", label: "Apuração própria" }],
  TRANSFER_DECLARE: [{ id: "ent_transfer_declaration", label: "Declaração da transferência" }],
  TRANSFER_AGREE: [{ id: "ent_transfer_agree", label: "Concordância da transferência" }],
  TRANSFER_DECLINE: [{ id: "ent_transfer_decline", label: "Recusa da transferência" }],
  TRANSFER_WITHDRAW: [{ id: "ent_transfer_withdraw", label: "Encerramento da transferência" }],
  TRANSFER_DISPATCH: [{ id: "ent_transfer_dispatch", label: "Expedição da transferência" }],
  DIVERGENCE: [{ id: "divergence", label: "Resolução da divergência" }],
} as const;
export const draftStageIds = ["req_archive", "req_cancel", "req_resolve_extra","identification", "medicamentos", "higiene", "dieta", "extras", "notes", "review", "count", "receipt", "divergence", "approval", "acquisition", "arrival", "receipt_validation", "receipt_rejection", "expectation_closure", "com_cancellation", "ent_reassignment", "ent_resolution", "ent_cancellation", "ent_cancellation_refusal", "ent_cancellation_withdrawal", "ent_cancellation_consent","ent_regularization_proposal","ent_regularization_approval","ent_regularization_rejection","ent_regularization_withdrawal","ent_regularization_finding","ent_transfer_agree","ent_transfer_decline","ent_transfer_withdraw","ent_transfer_dispatch","ent_transfer_declaration"] as const;
export type DraftFlow = keyof typeof draftFlowStages;
export type DraftNavigation = { version: 1; stage: typeof draftStageIds[number] };
export function draftFlow(kind: string, purpose = "create", content?: unknown): DraftFlow | null {
  if (kind === "REQ" && purpose === "archive") return "REQ_ARCHIVE";
  if (kind === "REQ" && purpose === "cancel") return "REQ_CANCEL";
  if (kind === "REQ" && purpose === "resolve_extra") return "REQ_RESOLVE_EXTRA";
  if (kind === "COM" && purpose === "approve") return "APPROVE";
  if (kind === "COM" && purpose === "purchase") return "PURCHASE";
  if (kind === "COM" && purpose === "receive") return "ARRIVAL";
  if (kind === "COM" && purpose === "validate_receipt") return "VALIDATE_RECEIPT";
  if (kind === "COM" && purpose === "reject_receipt") return "REJECT_RECEIPT";
  if (kind === "COM" && purpose === "close_expectation") return "CLOSE_EXPECTATION";
  if (kind === "COM" && purpose === "cancel") return "CANCEL_COM";
  if (kind === "ENT" && purpose === "receive") return "RECEIVE";
  if (kind === "ENT" && purpose === "divergence") return "DIVERGENCE";
  if (kind === "ENT" && purpose === "reassign") return "REASSIGN_ENT";
  if (kind === "ENT" && purpose === "resolve") return "RESOLVE_ENT";
  if (kind === "ENT" && purpose === "cancel") return "CANCEL_ENT";
  if (kind === "ENT" && purpose === "refuse_cancellation") return "REFUSE_ENT";
  if (kind === "ENT" && purpose === "withdraw_cancellation") return "WITHDRAW_ENT";
  if (kind === "ENT" && purpose === "consent_cancel") return "CONSENT_ENT";
  if (kind === "ENT" && purpose === "propose_regularization") return "REGULARIZATION_PROPOSE";
  if (kind === "ENT" && purpose === "approve_regularization") return "REGULARIZATION_APPROVE";
  if (kind === "ENT" && purpose === "reject_regularization") return "REGULARIZATION_REJECT";
  if (kind === "ENT" && purpose === "withdraw_regularization") return "REGULARIZATION_WITHDRAW";
  if (kind === "ENT" && purpose === "record_regularization_finding") return "REGULARIZATION_FINDING";
  if (kind === "ENT" && ["transfer_declare_family","transfer_declare_team"].includes(purpose)) return "TRANSFER_DECLARE";
  if (kind === "ENT" && purpose === "transfer_agree") return "TRANSFER_AGREE";
  if (kind === "ENT" && purpose === "transfer_decline") return "TRANSFER_DECLINE";
  if (kind === "ENT" && purpose === "transfer_withdraw") return "TRANSFER_WITHDRAW";
  if (kind === "ENT" && purpose === "transfer_dispatch") return "TRANSFER_DISPATCH";
  if (!["create", "revise"].includes(purpose)) return null;
  if (kind === "REQ") return purpose === "create" ? "REQ" : null;
  if (kind === "BAL") {
    const context = content && typeof content === "object" && "context" in content ? content.context : null;
    return context && typeof context === "object" && "mode" in context && context.mode === "scheduled" ? "BAL" : "SUPPLY";
  }
  return kind === "COM" || kind === "ENT" ? "SUPPLY" : null;
}
export function navigationForStep(flow: DraftFlow, index: number): DraftNavigation {
  const entry = draftFlowStages[flow][index];
  if (!Number.isInteger(index) || !entry) throw new Error("Etapa privada indisponível.");
  return { version: 1, stage: entry.id };
}
export function navigationAllowed(kind: string, purpose: string, navigation: DraftNavigation | null | undefined, content?: unknown) {
  if (!navigation) return true;
  const flow = draftFlow(kind, purpose, content);
  return navigation.version === 1 && flow !== null && draftFlowStages[flow].some(entry => entry.id === navigation.stage);
}
/** Old drafts resume at the established first step; their missing stage stays explicit. */
export function stepForNavigation(flow: DraftFlow, navigation?: DraftNavigation | null) {
  return navigation ? Math.max(0, draftFlowStages[flow].findIndex(entry => entry.id === navigation.stage)) : 0;
}
export function navigationLabel(navigation?: DraftNavigation | null) {
  return navigation ? Object.values(draftFlowStages).flat().find(entry => entry.id === navigation.stage)?.label ?? "Etapa indisponível" : "Etapa não preservada neste rascunho";
}
