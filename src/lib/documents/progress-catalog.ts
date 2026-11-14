import { documentEventLabel } from "@/lib/notifications/event-labels";

export const progressRelevance = {
  normal: { label: "Registro", icon: "clock", tone: "neutral" },
  milestone: { label: "Marco importante", icon: "check", tone: "success" },
  attention: { label: "Atenção", icon: "alert", tone: "warning" },
} as const;
export type ProgressRelevance = keyof typeof progressRelevance;
const milestones = new Set([
  "req.issued", "req.science_satisfied", "req.completed", "com.issued", "com.validate_receipt",
  "ent.issued", "ent.receive", "ent.resolve", "ent.transfer.agreed", "bal.issued", "bal.approve", "bal.apply",
]);
const attention = new Set([
  "req.reopened", "com.reject_receipt", "com.cancel", "ent.cancel", "ent.consent_cancel",
  "ent.refuse_cancellation", "ent.propose_regularization", "ent.transfer.declined", "bal.cancel", "bal.recount",
]);
/** Origin and relevance are independent; a manual milestone remains a manual record. */
export function progressEventPresentation(row: {
  source: "manual" | "automatic";
  relevance?: ProgressRelevance;
  action?: string;
}) {
  const relevance: ProgressRelevance = row.source === "manual"
    ? (row.relevance ?? "normal")
    : row.action && attention.has(row.action) ? "attention"
      : row.action && milestones.has(row.action) ? "milestone" : "normal";
  return {
    relevance,
    ...progressRelevance[relevance],
    origin: row.source === "manual" ? "Registro manual" : "Fato automático",
    originIcon: row.source === "manual" ? "edit" as const : "history" as const,
    event: row.source === "automatic" ? documentEventLabel(row.action) : null,
  };
}

export const progressCareRoles = { admin: "Administrador do paciente", family: "Familiar", supervisor: "Supervisão", professional: "Profissional", reader: "Leitor" } as const;
