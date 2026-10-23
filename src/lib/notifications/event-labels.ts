const labels: Record<string, string> = {
  "stock.alert": "Estoque abaixo do limite configurado",
  "occurrence.received": "Ocorrência recebida para revisão",
  "bal.reminder": "Lembrete de balanço da equipe",
  "shift.reminder": "Comunicação de materiais do período",
  "req.issued": "Requisição emitida",
  "req.registered_author": "Requisição encaminhada para ciência familiar",
  "req.science_recorded": "Ciência individual registrada",
  "req.science_satisfied": "Ciência familiar exigida satisfeita",
  "req.completed": "Requisição atendida operacionalmente",
  "req.fulfillment_updated": "Atendimento atualizado pelas entregas vinculadas",
  "req.reopened": "Atendimento reaberto por pendência",
  "req.reminder": "Lembrete de requisição pendente",
  "req.archived.manual": "Arquivamento manual justificado",
  "req.archived.automatic": "Arquivamento automático",
  "ent.reminder": "Lembrete de conferência",
  "req.status": "Etapa da requisição atualizada",
  "req.item_resolved": "Item extra identificado",
  "com.issued": "Compra registrada",
  "com.approve": "Itens da compra aprovados",
  "com.purchase": "Aquisição registrada",
  "com.receive": "Recebimento informado",
  "com.validate_receipt": "Recebimento validado",
  "com.reject_receipt": "Recebimento rejeitado",
  "com.cancel": "Compra cancelada",
  "ent.issued": "Materiais expedidos",
  "ent.receive": "Recebimento conferido",
  "ent.resolve": "Divergência conciliada",
  "ent.reassign": "Destinatário atualizado",
  "ent.cancel": "Cancelamento registrado",
  "ent.consent_cancel": "Cancelamento consentido",
  "bal.issued": "Balanço registrado",
  "bal.recount": "Nova contagem registrada",
  "bal.approve": "Revisão do balanço registrada",
  "bal.cancel": "Balanço cancelado",
  "attachment.bound": "Anexo vinculado",
};
export function documentEventLabel(action?: string) {
  if (!action) return "Atualização disponível";
  return (
    labels[action] ??
    (action.endsWith(".draft")
      ? "Rascunho salvo"
      : action.endsWith(".submit")
        ? "Ficha emitida"
        : "Atualização registrada")
  );
}
