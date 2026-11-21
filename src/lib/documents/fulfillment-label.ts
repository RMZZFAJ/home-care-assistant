export function fulfillmentLabel(state: { attended: boolean; serviceStatus?: string; } | undefined) {
  if (!state) return "Situação não preservada";
  if (state.serviceStatus === "review_required") return "Aguardando nova avaliação familiar";
  if (state.serviceStatus === "partial") return "Parcialmente atendido";
  return state.attended ? "Atendido conforme avaliação familiar e recebimento" : "Pendente de atendimento";
}
