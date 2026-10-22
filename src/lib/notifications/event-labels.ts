const labels: Record<string, string> = {
  "req.issued": "Requisição emitida",
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
