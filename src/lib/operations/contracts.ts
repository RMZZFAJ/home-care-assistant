import { z } from "zod";

export const operationEnvironment = z.enum(["local", "preview", "production", "shared_database", "operator"]);
export const operationComponent = z.enum(["application", "database", "worker", "outbox", "push", "signature", "integrity", "backup", "recovery", "security", "legacy"]);
export const operationCode = z.enum(["HEARTBEAT", "API_ERROR", "DATABASE_UNAVAILABLE", "HEARTBEAT_STALE", "JOB_DELAY", "OUTBOX_UNCERTAIN", "PUSH_UNCERTAIN", "SIGNATURE_PENDING", "SIGNATURE_FAILURE", "INTEGRITY_FAILURE", "BACKUP_VERIFIED", "BACKUP_FAILURE", "BACKUP_LATE", "BACKUP_RETENTION", "RECOVERY_PROBE_VERIFIED", "RECOVERY_FAILURE", "SECURITY_REJECTED", "LEGACY_FAILURE", "LEGACY_GAP", "LEGACY_BACKLOG", "CHANNEL_NOT_CONFIGURED"]);
const instant = z.iso.datetime({ offset: true });
const severity = z.enum(["warning", "critical"]);
const threshold = z.number().int().min(1).max(2_592_000);
export const operationPolicy = z.object({
  heartbeatWarningSeconds: threshold, heartbeatCriticalSeconds: threshold,
  jobWarningSeconds: threshold, jobCriticalSeconds: threshold,
  pdfWarningSeconds: threshold, pdfCriticalSeconds: threshold,
  backupWarningSeconds: threshold, backupCriticalSeconds: threshold,
  securityWindowSeconds: threshold, securityWarningCount: threshold, securityCriticalCount: threshold,
  severity: z.record(operationComponent, severity),
}).strict();
const reason = z.enum(["investigating", "waiting_dependency", "contained", "corrected", "reviewed_history", "false_alarm"]);
const metrics = z.object({ count: z.number().int().min(0).max(1e12).optional(), bytes: z.number().int().min(0).max(1e12).optional(), files: z.number().int().min(0).max(1e12).optional(), sourceMigrations: z.number().int().min(0).max(1e12).optional(), manifestSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(), archiveId: z.uuid().optional(), sourceCode: z.enum(["INTERNAL_ERROR", "DATABASE_UNAVAILABLE", "PDF_BYTES_DIVERGE", "WORKER_NOT_CONFIGURED", "PUSH_RESULT_UNCONFIRMED", "INVALID_ORIGIN", "SIGNING_NOT_CONFIGURED", "INTEGRITY_PROOF_FAILED"]).optional(), retentionComplete: z.boolean().optional() }).strict();
export const technicalEvent = z.object({ environment: operationEnvironment, component: operationComponent, code: operationCode, idempotencyKey: z.uuid(), correlationId: z.uuid(), observedAt: instant, metrics }).strict();
export type TechnicalEvent = z.infer<typeof technicalEvent>;
export type OperationEnvironment = z.infer<typeof operationEnvironment>;
export type OperationComponent = z.infer<typeof operationComponent>;
export const operationsCommand = z.discriminatedUnion("action", [
  z.object({ action: z.literal("configure"), environment: operationEnvironment, incidentId: z.null(), expectedVersion: z.number().int().positive(), policy: operationPolicy, idempotencyKey: z.uuid() }).strict(),
  z.object({ action: z.literal("acknowledge"), environment: operationEnvironment, incidentId: z.uuid(), expectedVersion: z.number().int().positive(), reason: z.enum(["investigating", "waiting_dependency", "contained"]), idempotencyKey: z.uuid() }).strict(),
  z.object({ action: z.literal("resolve"), environment: operationEnvironment, incidentId: z.uuid(), expectedVersion: z.number().int().positive(), reason: z.enum(["corrected", "reviewed_history", "false_alarm"]), idempotencyKey: z.uuid() }).strict(),
]);
export type OperationsCommand = z.infer<typeof operationsCommand>;
const action = z.enum(["opened", "observed", "acknowledged", "resolved", "recovered", "configured", "escalated"]);
const historyLine = z.object({ action, at: instant, version: z.number().int().positive().nullable(), reason: reason.nullable(), operator: z.enum(["system", "global"]) }).strict();
export const incident = z.object({ id: z.uuid(), component: operationComponent, code: operationCode, severity, state: z.enum(["open", "acknowledged", "resolved"]), version: z.number().int().positive(), policyVersion: z.number().int().positive(), firstObservedAt: instant, lastObservedAt: instant, occurrences: z.number().int().positive(), metricCount: z.number().int().nonnegative(), acknowledgedAt: instant.nullable(), resolvedAt: instant.nullable(), correlationId: z.uuid().nullable(), history: z.array(historyLine).max(12) }).strict();
export const operationsDiagnostics = z.object({
  environment: operationEnvironment, consultedAt: instant,
  policy: z.object({ version: z.number().int().positive(), values: operationPolicy }).strict(),
  components: z.array(z.object({ component: operationComponent, observedAt: instant.nullable(), successAt: instant.nullable(), state: z.enum(["attention", "unobserved", "observed"]) }).strict()).max(11),
  data: z.array(incident).max(50), total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().min(1).max(50),
  events: z.array(z.object({ id: z.uuid(), component: operationComponent, code: operationCode, severity: z.enum(["info", "warning", "critical"]), correlationId: z.uuid(), at: instant, metrics }).strict()).max(20),
  policyHistory: z.array(z.object({ at: instant, version: z.number().int().positive(), hash: z.string().regex(/^[a-f0-9]{64}$/), values: operationPolicy, operator: z.enum(["system", "global"]) }).strict()).max(10),
  externalAdapter: z.literal("none"), backupOperationalExternalActive: z.literal(false), operationalGo: z.literal(false), externalAvailabilityProved: z.literal(false),
}).strict();
export const operationsHistory = z.object({ environment: operationEnvironment, incidentId: z.uuid().nullable(), total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().min(1).max(50), data: z.array(historyLine.extend({ id: z.uuid(), policyVersion: z.number().int().positive().nullable(), policyHash: z.string().regex(/^[a-f0-9]{64}$/).nullable(), policy: operationPolicy.nullable() }).strict()).max(50) }).strict();
export const operationsReceipt = z.object({ environment: operationEnvironment, action: z.enum(["configure", "acknowledge", "resolve"]), incidentId: z.uuid().nullable(), version: z.number().int().positive(), idempotencyKey: z.uuid(), recorded: z.literal(true), noop: z.boolean() }).strict();
export type Diagnostics = z.infer<typeof operationsDiagnostics>;
export type Incident = z.infer<typeof incident>;
export type OperationsReceipt = { data: z.infer<typeof operationsReceipt> };
export function operationsConfirmed(value: unknown, packet: OperationsCommand) {
  const parsed = z.object({ data: operationsReceipt }).safeParse(value);
  return parsed.success && parsed.data.data.environment === packet.environment && parsed.data.data.action === packet.action && parsed.data.data.incidentId === packet.incidentId && parsed.data.data.idempotencyKey === packet.idempotencyKey && parsed.data.data.version >= packet.expectedVersion;
}
export const deliveryImpact = z.object({ delayedNotices: z.number().int().nonnegative(), unconfirmedNotices: z.number().int().nonnegative(), recoverableOwnPdfs: z.number().int().nonnegative(), acknowledgementCreated: z.literal(false) }).strict();
export const operationLabels: Record<OperationComponent, string> = { application: "Aplicação", database: "Banco", worker: "Processamento", outbox: "Fila de avisos", push: "Fila Web Push", signature: "Emissão e assinatura", integrity: "Integridade documental", backup: "Cópias de segurança", recovery: "Ensaios de recuperação", security: "Segurança de acesso", legacy: "Agendamentos e lembretes" };
export const environmentLabels: Record<OperationEnvironment, string> = { local: "Desenvolvimento local", preview: "Preview", production: "Aplicação publicada", shared_database: "Banco compartilhado", operator: "Operador de backup" };
export const incidentLabels: Record<z.infer<typeof operationCode>, string> = { HEARTBEAT: "Observação de atividade", API_ERROR: "Erros recentes na aplicação", DATABASE_UNAVAILABLE: "Falha de acesso ao banco", HEARTBEAT_STALE: "Atividade não observada no intervalo", JOB_DELAY: "Tarefas aguardando processamento", OUTBOX_UNCERTAIN: "Avisos com resultado incerto", PUSH_UNCERTAIN: "Push com falha ou resultado incerto", SIGNATURE_PENDING: "Emissões precisam de recuperação", SIGNATURE_FAILURE: "Falha na emissão ou assinatura", INTEGRITY_FAILURE: "Integridade documental recusada", BACKUP_VERIFIED: "Cópia autenticada e verificada", BACKUP_FAILURE: "Cópia não confirmada", BACKUP_LATE: "Cópia recente sem registro técnico", BACKUP_RETENTION: "Retenção precisa de revisão", RECOVERY_PROBE_VERIFIED: "Ensaio isolado de recuperação conferido", RECOVERY_FAILURE: "Ensaio de recuperação não confirmado", SECURITY_REJECTED: "Recusas de origem no intervalo", LEGACY_FAILURE: "Configuração de agendamento inválida", LEGACY_GAP: "Períodos históricos precisam de revisão", LEGACY_BACKLOG: "Recuperação de períodos em andamento", CHANNEL_NOT_CONFIGURED: "Canal externo não configurado" };
