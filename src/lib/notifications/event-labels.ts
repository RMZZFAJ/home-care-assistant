const labels: Record<string, string> = {
  "ent.transfer.declared": "Transferência declarada para concordância",
  "ent.transfer.agreed": "Concordância própria da contraparte registrada",
  "ent.transfer.declined": "Transferência recusada pela contraparte",
  "ent.transfer.withdrawn": "Declaração encerrada sem expedição",
  "bal.cycle.configured": "Programação do balanço atualizada",
  "bal.cycle.opened": "Obrigação semanal disponibilizada",
  "bal.cycle.assigned": "Balanço atribuído ao plantão",
  "bal.cycle.missed": "Balanço não realizado no prazo",
  "bal.cycle.overdue": "Prazo da obrigação semanal ultrapassado",
  "bal.cycle.available": "Contagem disponibilizada no plantão programado",
  "bal.cycle.unassigned": "Balanço sem plantão único elegível",
  "bal.cycle.invalidated": "Atribuição superada por alteração da escala",
  "bal.cycle.deferral_requested": "Adiamento aguardando aprovação familiar",
  "bal.cycle.deferral_rejected": "Adiamento rejeitado pela família",
  "bal.cycle.deferred": "Adiamento autorizado pela família",
  "bal.cycle.recount_assigned": "Reconto formalmente designado",
  "bal.cycle.recount_transferred": "Responsabilidade do reconto transferida no mesmo plantão",
  "bal.cycle.recount_unassigned": "Reconto aguardando nova designação autorizada",
  "bal.cycle.recount_recorded": "Nova contagem física do reconto registrada",
  "bal.cycle.counted": "Contagem atual registrada e pendências regularizadas",
  "bal.cycle.assignment_resolved": "Responsabilidade do balanço definida",
  "schedule.type": "Tipo de plantão atualizado",
  "schedule.published": "Programação de plantões publicada",
  "schedule.proposed": "Programação proposta para aprovação",
  "schedule.approve": "Programação aprovada",
  "schedule.reject": "Programação rejeitada",
  "schedule.change": "Plantão alterado",
  "schedule.cancel": "Plantão cancelado",
  "schedule.end_series": "Recorrência encerrada",
  "schedule.change_requested": "Alteração de plantão solicitada",
  "schedule.change_decided": "Alteração de plantão decidida",
  "stock.alert": "Estoque abaixo do limite configurado",
  "occurrence.received": "Ocorrência recebida para revisão",
  "bal.reminder": "Lembrete de balanço da equipe",
  "shift.reminder": "Comunicação de materiais do período",
  "req.remaining_need_declared": "Nova necessidade vinculada declarada",
  "req.issued": "Requisição emitida",
  "req.registered_author": "Requisição encaminhada para ciência familiar",
  "req.science_recorded": "Ciência individual registrada",
  "req.science_satisfied": "Ciência familiar exigida satisfeita",
  "req.science_requirement_changed": "Critério familiar atualizado para uma pessoa habilitada",
  "req.completed": "Requisição atendida operacionalmente",
  "req.fulfillment_updated": "Atendimento atualizado pelas entregas vinculadas",
  "req.reopened": "Atendimento reaberto por pendência",
  "req.reminder": "Lembrete de requisição pendente",
  "req.archived.manual": "Arquivamento manual justificado",
  "req.archived.automatic": "Arquivamento automático",
  "ent.reminder": "Lembrete de conferência",
  "req.status": "Etapa da requisição atualizada",
  "req.item_resolved": "Item extra identificado",
  "com.issued": "Ficha de compra ou doação emitida",
  "com.approve": "Itens de compra ou doação aprovados",
  "com.purchase": "Aquisição registrada",
  "com.receive": "Recebimento informado",
  "com.validate_receipt": "Recebimento validado",
  "com.reject_receipt": "Recebimento rejeitado",
  "com.close_expectation": "Expectativa não adquirida encerrada",
  "com.cancel": "Ficha de compra ou doação cancelada",
  "ent.issued": "Materiais expedidos",
  "ent.receive": "Recebimento conferido",
  "ent.resolve": "Divergência conciliada",
  "ent.reassign": "Destinatário atualizado",
  "ent.cancel": "Cancelamento registrado",
  "ent.consent_cancel": "Cancelamento consentido",
  "ent.refuse_cancellation": "Pedido de cancelamento recusado pelo recebedor",
  "ent.withdraw_cancellation": "Pedido de cancelamento retirado pelo solicitante",
  "ent.propose_regularization":"Regularização administrativa proposta",
  "ent.review_regularization":"Conferência independente da regularização registrada",
  "ent.withdraw_regularization":"Proposta de regularização encerrada sem movimento",
  "ent.record_regularization_finding":"Apuração futura registrada com autoria própria",
  "bal.issued": "Balanço registrado",
  "bal.recount": "Nova contagem registrada",
  "bal.approve": "Revisão do balanço registrada",
  "bal.cancel": "Balanço cancelado",
  "attachment.bound": "Anexo vinculado",
};
export function isKnownDocumentEvent(action: string) {
  return Object.hasOwn(labels, action);
}
export function documentEventLabel(action?: string, origin?: "purchase" | "donation") {
  if (!action) return "Atualização disponível";
  if (origin === "donation") {
    const donation: Record<string, string> = { "com.issued": "Ficha de doação emitida", "com.approve": "Itens da doação aprovados", "com.cancel": "Ficha de doação cancelada" };
    if (Object.hasOwn(donation, action)) return donation[action];
  }
  return (
    (isKnownDocumentEvent(action) ? labels[action] : undefined) ??
    (action.endsWith(".draft")
      ? "Rascunho salvo"
      : action.endsWith(".submit")
        ? "Ficha emitida"
        : "Atualização registrada")
  );
}
