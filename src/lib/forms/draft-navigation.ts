const common = [
  { id: "identification", label: "Identificação" },
  { id: "medicamentos", label: "Medicamentos" },
  { id: "higiene", label: "Higiene" },
  { id: "dieta", label: "Dieta" },
] as const;
export const draftFlowStages = {
  REQ: [...common, { id: "extras", label: "Itens extras" }, { id: "notes", label: "Observações" }, { id: "review", label: "Revisão" }],
  SUPPLY: [...common, { id: "notes", label: "Observações" }, { id: "review", label: "Revisão" }],
  BAL: [{ id: "count", label: "Contagem" }, { id: "review", label: "Revisão" }],
  RECEIVE: [{ id: "receipt", label: "Conferência pessoal" }],
  DIVERGENCE: [{ id: "divergence", label: "Resolução da divergência" }],
} as const;
export const draftStageIds = ["identification", "medicamentos", "higiene", "dieta", "extras", "notes", "review", "count", "receipt", "divergence"] as const;
export type DraftFlow = keyof typeof draftFlowStages;
export type DraftNavigation = { version: 1; stage: typeof draftStageIds[number] };
export function draftFlow(kind: string, purpose = "create", content?: unknown): DraftFlow | null {
  if (kind === "ENT" && purpose === "receive") return "RECEIVE";
  if (kind === "ENT" && purpose === "divergence") return "DIVERGENCE";
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
