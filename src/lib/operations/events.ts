import type { OperationEnvironment, TechnicalEvent } from "./contracts";

/** Constants/correlation only. Never accepts a message, URL, user, patient or payload. */
export function apiFailureEvent(operation: string, code: string, status: number, environment: OperationEnvironment, correlationId: string, observedAt: string): TechnicalEvent | null {
  const base = { environment, correlationId, idempotencyKey: correlationId, observedAt };
  if (code === "INVALID_ORIGIN") return { ...base, component: "security", code: "SECURITY_REJECTED", metrics: { sourceCode: "INVALID_ORIGIN", count: 1 } };
  if (code === "PDF_BYTES_DIVERGE") return { ...base, component: "integrity", code: "INTEGRITY_FAILURE", metrics: { sourceCode: "PDF_BYTES_DIVERGE", count: 1 } };
  if (status < 500) return null;
  if (code === "DATABASE_UNAVAILABLE" || code === "AUTH_UNAVAILABLE") return { ...base, component: "database", code: "DATABASE_UNAVAILABLE", metrics: { sourceCode: "DATABASE_UNAVAILABLE", count: 1 } };
  if (/pdf|issuance|signature/.test(operation)) return { ...base, component: "signature", code: "SIGNATURE_FAILURE", metrics: { sourceCode: code === "NOT_CONFIGURED" || code === "WORKER_NOT_CONFIGURED" ? "SIGNING_NOT_CONFIGURED" : "INTERNAL_ERROR", count: 1 } };
  if (code === "PUSH_RESULT_UNCONFIRMED") return { ...base, component: "push", code: "PUSH_UNCERTAIN", metrics: { sourceCode: "PUSH_RESULT_UNCONFIRMED", count: 1 } };
  return { ...base, component: operation === "notification.worker" ? "worker" : "application", code: "API_ERROR", metrics: { sourceCode: code === "WORKER_NOT_CONFIGURED" ? "WORKER_NOT_CONFIGURED" : "INTERNAL_ERROR", count: 1 } };
}
