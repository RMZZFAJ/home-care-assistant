import { afterEach, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { apiFailureEvent } from "@/lib/operations/events";
import { operationsConfirmed, technicalEvent, type OperationsCommand } from "@/lib/operations/contracts";
import { DatabaseOperationsSink, observeApiFailure } from "@/lib/server/operations-observer";
import type { SupabaseClient } from "@supabase/supabase-js";

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
const correlation = randomUUID(), now = new Date().toISOString();
it("classification stores only enumerated technical facts and preserves the correlation", () => {
  for (const [operation, code, status, component, eventCode] of [
    ["private.raw.url.patient", "PRIVATE_ERROR_MESSAGE", 500, "application", "API_ERROR"],
    ["notification.worker", "WORKER_NOT_CONFIGURED", 503, "worker", "API_ERROR"],
    ["pdf.download", "PDF_BYTES_DIVERGE", 409, "integrity", "INTEGRITY_FAILURE"],
    ["context.read", "DATABASE_UNAVAILABLE", 503, "database", "DATABASE_UNAVAILABLE"],
    ["context.read", "AUTH_UNAVAILABLE", 503, "database", "DATABASE_UNAVAILABLE"],
    ["pdf.issuance", "NOT_CONFIGURED", 503, "signature", "SIGNATURE_FAILURE"],
    ["push.send", "PUSH_RESULT_UNCONFIRMED", 503, "push", "PUSH_UNCERTAIN"],
    ["admin.configure", "INVALID_ORIGIN", 403, "security", "SECURITY_REJECTED"],
  ] as const) {
    const event = apiFailureEvent(operation, code, status, "preview", correlation, now);
    expect(event?.component).toBe(component); expect(event?.code).toBe(eventCode);
    expect(event?.correlationId).toBe(correlation); expect(technicalEvent.safeParse(event).success).toBe(true);
    expect(JSON.stringify(event)).not.toMatch(/PRIVATE_ERROR_MESSAGE|private.raw.url.patient/);
  }
  expect(apiFailureEvent("draft.write", "FORBIDDEN", 403, "local", correlation, now)).toBeNull();
});

it("technical observation refuses invalid private payloads before invoking a sink", async () => {
  const rpc = vi.fn(), sink = new DatabaseOperationsSink({ rpc } as unknown as SupabaseClient);
  expect(await sink.record({ ...apiFailureEvent("api", "INTERNAL_ERROR", 500, "local", correlation, now)!, metrics: { privateName: "forbidden" } } as never)).toBe("unconfirmed");
  expect(rpc).not.toHaveBeenCalled();
});

it("the database adapter requires an exact receipt and a bounded abort signal", async () => {
  const event = apiFailureEvent("api", "INTERNAL_ERROR", 500, "local", correlation, now)!;
  const abortSignal = vi.fn(async (signal: AbortSignal) => { expect(signal).toBeInstanceOf(AbortSignal); return { data: { recorded: true, idempotencyKey: event.idempotencyKey }, error: null }; });
  const rpc = vi.fn(() => ({ abortSignal }));
  const sink = new DatabaseOperationsSink({ rpc } as unknown as SupabaseClient);
  expect(await sink.record(event)).toBe("confirmed");
  expect(rpc).toHaveBeenCalledWith("record_operations_event", { p_event: event });
  abortSignal.mockResolvedValueOnce({ data: { recorded: true, idempotencyKey: randomUUID() }, error: null });
  expect(await sink.record(event)).toBe("unconfirmed");
  abortSignal.mockRejectedValueOnce(new Error("PRIVATE_DIAGNOSTIC"));
  expect(await sink.record(event)).toBe("unconfirmed");
});

it("unconfigured or unapproved telemetry cannot disclose secrets or alter the original API failure", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {}), transport = vi.fn();
  vi.stubGlobal("fetch", transport);
  try {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://unapproved.invalid"); vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "SECRET_SENTINEL");
    await expect(observeApiFailure("PRIVATE_PATIENT_SENTINEL", "PRIVATE_MESSAGE", 500, correlation)).resolves.toBeUndefined();
    expect(transport).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(warn.mock.calls)).not.toMatch(/SECRET_SENTINEL|PRIVATE_PATIENT_SENTINEL|PRIVATE_MESSAGE/);
    expect(JSON.stringify(warn.mock.calls)).toContain(correlation);
  } finally { vi.unstubAllGlobals(); }
});

it("command confirmation binds environment, action, incident, intention and version", () => {
  const packet: OperationsCommand = { action: "resolve", environment: "preview", incidentId: randomUUID(), expectedVersion: 4, reason: "corrected", idempotencyKey: randomUUID() };
  const receipt = { environment: packet.environment, action: packet.action, incidentId: packet.incidentId, version: 5, idempotencyKey: packet.idempotencyKey, recorded: true, noop: false };
  expect(operationsConfirmed({ data: receipt }, packet)).toBe(true);
  for (const mutation of [{ environment: "production" }, { action: "acknowledge" }, { incidentId: randomUUID() }, { idempotencyKey: randomUUID() }, { version: 3 }, { recorded: false }, { privateName: "forbidden" }]) expect(operationsConfirmed({ data: { ...receipt, ...mutation } }, packet)).toBe(false);
});
