import { documentEventLabel } from "./notifications/event-labels";

const actions: Record<string, string> = {
  "access.applied": "Proposta de configuração aplicada", "access.changed.local": "Configuração alterada pela administração local", "access.proposed.global": "Proposta global registrada",
  "patient.initial_administrator": "Administrador inicial vinculado", "patient.created": "Paciente cadastrado", "patient.updated": "Cadastro do paciente atualizado",
  "invitation.created": "Convite criado", "invitation.renewed": "Convite reemitido", "invitation.revoked": "Convite revogado", "invitation.accepted": "Convite aceito", "invitation.declined": "Convite recusado",
  "notification.settings.updated": "Destinatário de notificações atualizado", "notification.retry.requested": "Nova tentativa de notificação solicitada", "stock.alert.configured": "Alerta de estoque configurado",
  "private_draft.save": "Rascunho privado salvo", "private_draft.discard": "Rascunho privado descartado", "private_draft.acknowledge": "Resultado do rascunho consultado",
};
const entities: Record<string, string> = { patient: "Paciente", care_recipient: "Paciente", profile: "Conta", membership: "Vínculo com o paciente", access_change: "Proposta de configuração", product: "Material", recipient_product: "Material do paciente", requisition: "Requisição", document: "Ficha operacional", operational_document: "Ficha operacional", invitation: "Convite", private_draft: "Rascunho privado", stock_movement: "Movimento de estoque", stock_alert_rule: "Alerta de estoque", notification: "Notificação", consumption_report: "Relato de falta ou consumo" };
export function auditActionLabel(action: string) {
  const label = actions[action] ?? documentEventLabel(action);
  return label === "Atualização registrada" ? "Evento registrado sem rótulo específico" : label;
}
export function auditEntityLabel(entity: string) { return entities[entity] ?? "Recurso sem rótulo específico"; }
