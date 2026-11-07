import { capabilityLabels } from "./capability-labels";
import { documentEventLabel } from "./notifications/event-labels";

export type GovernanceChange = {
  id: string; kind: string; proposed: Record<string, unknown>; current: Record<string, unknown> | null;
  proposed_by: string; proposerName: string; subjectName: string | null; status: string;
  base_version: number; created_at: string; decided_at: string | null; resolution?: { invitationId?: string };
};
export const governanceKindLabels: Record<string, string> = { settings: "Regras do paciente", capability: "Permissão", membership: "Função no paciente", notification_rule: "Regra de notificação", administration: "Cadastro administrativo" };
export const governanceStatusLabels: Record<string, string> = { pending: "Aguardando aprovação local", awaiting_acceptance: "Aguardando aceite do destinatário", applied: "Aplicada", rejected: "Rejeitada" };
export const governanceFilterLabels = { open: "Aguardando aprovação ou aceite", ...governanceStatusLabels };
const labels: Record<string, string> = {
  balDay: "Dia do balanço", balReview: "Revisão do balanço", balApprovers: "Grupos revisores", balRequirement: "Critério de aprovação do balanço",
  scienceRequired: "Exigir ciência familiar", scienceRoles: "Funções responsáveis pela ciência", scienceUsers: "Pessoas responsáveis pela ciência",
  scienceRequirement: "Critério da ciência", scienceByDispatch: "Ciência pela expedição", scienceAutomatic: "Ciência automática", scienceWhatsApp: "Ciência por WhatsApp", scienceDialog: "Ciência mediante diálogo", scienceTacit: "Preferência de ciência tácita",
  archiveDays: "Dias até arquivamento", reminderHours: "Primeiro lembrete (horas)", reminderRepeatHours: "Repetição do lembrete (horas)", shareWaitSeconds: "Acompanhamento inicial (segundos)", patientShortName: "Nome curto nas mensagens", whatsappSimpleAcceptance: "Aceite simplificado por WhatsApp",
  balReminderUsers: "Destinatários de lembrete do balanço", shiftReminder: "Lembrete de plantão", role: "Função", status: "Situação do vínculo", enabled: "Permissão", capability: "Capacidade", subjectRole: "Função destinatária", subjectUser: "Pessoa destinatária", userId: "Pessoa",
  event: "Evento", channels: "Canais", includePdf: "Incluir PDF", cooldownMinutes: "Intervalo mínimo (minutos)", quietStart: "Início do silêncio", quietEnd: "Fim do silêncio", mode: "Modo de notificação",
  displayName: "Nome do paciente", isActive: "Ativo", isDevelopment: "Ambiente de desenvolvimento", name: "Nome do material", category: "Categoria", unit: "Unidade", aliases: "Nomes alternativos", description: "Descrição", sortOrder: "Ordem na lista", productId: "Material", location: "Custódia", lowThreshold: "Limite de atenção", criticalThreshold: "Limite crítico", isEnabled: "Habilitado", recipientUserId: "Destinatário", recipientGroup: "Grupo destinatário", channel: "Canal", destination: "Destino", includeTeamAlerts: "Incluir alertas da equipe",
};
const translations: Record<string, string> = { admin: "Administrador do paciente", family: "Familiar", supervisor: "Supervisor", professional: "Profissional", reader: "Leitor", active: "Ativo", revoked: "Revogado", optional: "Opcional", required: "Obrigatório", silent: "Silencioso", any: "Qualquer pessoa habilitada", all: "Todos os grupos", internal: "No aplicativo", email: "E-mail", whatsapp: "WhatsApp", FAMILY: "Família", CARE_TEAM: "Equipe de cuidados", supervision: "Supervisão", care_team: "Equipe de cuidados", other: "Outro", medicamentos: "Medicamentos", higiene: "Higiene", dieta: "Dieta" };
const operations: Record<string, string> = { recipient: "Cadastro do paciente", product: "Material do paciente", adoptProduct: "Adicionar material do catálogo", membershipStatus: "Situação do vínculo", alertRule: "Alerta de estoque", notificationRecipient: "Destinatário de notificação" };
const kindFields: Record<string, string[]> = {
  settings: ["balDay", "balReview", "balApprovers", "balRequirement", "scienceRequired", "scienceRoles", "scienceUsers", "scienceRequirement", "scienceByDispatch", "scienceAutomatic", "scienceWhatsApp", "scienceDialog", "scienceTacit", "archiveDays", "reminderHours", "reminderRepeatHours", "shareWaitSeconds", "patientShortName", "whatsappSimpleAcceptance", "balReminderUsers", "shiftReminder"],
  capability: ["capability", "subjectRole", "subjectUser", "enabled"], membership: ["userId", "role"],
  notification_rule: ["event", "role", "channels", "includePdf", "cooldownMinutes", "quietStart", "quietEnd", "mode"],
};
const operationFields: Record<string, string[]> = {
  recipient: ["displayName", "isActive", "isDevelopment"], product: ["name", "category", "unit", "aliases", "isActive", "description", "sortOrder"],
  adoptProduct: ["productId"], membershipStatus: ["userId", "status"], alertRule: ["productId", "location", "lowThreshold", "criticalThreshold", "isEnabled"],
  notificationRecipient: ["recipientUserId", "recipientGroup", "channel", "destination", "includeTeamAlerts", "isEnabled"],
};
const subjectKeys = ["userId", "subjectUser", "recipientUserId"];
const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
function valueLabel(key: string, value: unknown, change: GovernanceChange, directory: { id: string; name: string }[]): string {
  if (key === "enabled" && value === null) return "Herdar a regra da função" + (typeof change.current?._inheritedEnabled === "boolean" ? change.current._inheritedEnabled ? " (permitir)" : " (restringir)" : "");
  if (value === undefined || value === null) return "Não registrado";
  if (subjectKeys.includes(key)) return change.subjectName ?? directory.find(person => person.id === value)?.name ?? "Pessoa sem nome disponível neste registro";
  if (key === "productId") return typeof change.current?._productName === "string" ? change.current._productName : "Material sem nome disponível neste registro";
  if (key === "capability" && typeof value === "string") return capabilityLabels[value] ?? "Capacidade não reconhecida";
  if (key === "event" && typeof value === "string") return documentEventLabel(value);
  if (key === "balDay" && typeof value === "number") return days[value] ?? "Dia não reconhecido";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "string") return translations[value] ?? value;
  if (typeof value === "number") return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 12 }).format(value);
  if (Array.isArray(value)) return value.length ? value.map(item => ["scienceUsers", "balReminderUsers"].includes(key) ? directory.find(person => person.id === item)?.name ?? "Pessoa sem nome disponível" : valueLabel(key, item, change, directory)).join(", ") : "Nenhum";
  if (key === "shiftReminder" && typeof value === "object") {
    const reminder = value as Record<string, unknown>;
    return `${reminder.enabled === true ? "Ativo" : "Inativo"} · ${valueLabel("hour", reminder.hour, change, directory)} h · ${Array.isArray(reminder.days) ? reminder.days.map(day => days[Number(day)] ?? "Dia não reconhecido").join(", ") : "Dias não registrados"} · ${valueLabel("balReminderUsers", reminder.userIds, change, directory)}`;
  }
  return "Valor não reconhecido. Consulte a origem antes de decidir.";
}
export function governanceComparison(change: GovernanceChange, directory: { id: string; name: string }[]) {
  const operation = change.proposed.operation;
  const values = change.kind === "administration" && change.proposed.args && typeof change.proposed.args === "object" && !Array.isArray(change.proposed.args) ? change.proposed.args as Record<string, unknown> : change.proposed;
  const entries = Object.entries(values).filter(([key]) => !["action", "careRecipientId", "id"].includes(key));
  const allowed = change.kind === "administration" && typeof operation === "string" ? operationFields[operation] : kindFields[change.kind];
  const supported = Boolean(allowed) && entries.length > 0 && entries.every(([key]) => allowed?.includes(key))
    && (!entries.some(([key]) => key === "productId") || typeof change.current?._productName === "string");
  return {
    supported,
    title: change.kind === "administration" && typeof operation === "string" ? operations[operation] ?? "Operação não reconhecida" : governanceKindLabels[change.kind] ?? "Tipo de proposta não reconhecido",
    rows: entries.map(([key, value]) => ({ key, label: labels[key] ?? "Campo não reconhecido", current: valueLabel(key, change.current?.[key], change, directory), proposed: valueLabel(key, value, change, directory) })),
  };
}
