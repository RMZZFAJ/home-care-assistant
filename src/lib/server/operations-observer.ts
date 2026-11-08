import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { technicalEvent, type TechnicalEvent, type OperationComponent, type OperationEnvironment } from "@/lib/operations/contracts";
import { apiFailureEvent } from "@/lib/operations/events";

export interface OperationsSink { record(event: TechnicalEvent): Promise<"confirmed" | "unconfirmed"> }
export class DatabaseOperationsSink implements OperationsSink {
  constructor(private readonly client: SupabaseClient) {}
  async record(event: TechnicalEvent): Promise<"confirmed" | "unconfirmed"> {
    const input = technicalEvent.safeParse(event);
    if (!input.success) return "unconfirmed";
    try {
      const result = await this.client.rpc("record_operations_event", { p_event: input.data }).abortSignal(AbortSignal.timeout(300));
      return !result.error && result.data?.recorded === true && result.data?.idempotencyKey === event.idempotencyKey ? "confirmed" : "unconfirmed";
    } catch { return "unconfirmed"; }
  }
}
export function serverOperationEnvironment(): OperationEnvironment {
  return process.env.VERCEL_ENV === "production" ? "production" : process.env.VERCEL_ENV === "preview" ? "preview" : "local";
}
function configuredSink() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const target = new URL(url);
  const remote = target.protocol === "https:" && target.hostname === "qwfrqychokvhdzakibid.supabase.co" && target.port === "";
  const local = target.protocol === "http:" && ["127.0.0.1", "localhost"].includes(target.hostname) && target.port === "54321";
  if ((!remote && !local) || target.username || target.password || target.pathname !== "/" || target.search || target.hash) return null;
  return new DatabaseOperationsSink(createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }));
}
export async function observeApiFailure(operation: string, code: string, status: number, correlationId: string) {
  const event = apiFailureEvent(operation, code, status, serverOperationEnvironment(), correlationId, new Date().toISOString());
  if (!event) return;
  try {
    const sink = configuredSink();
    if (sink && await sink.record(event) === "confirmed") return;
  } catch { /* The original API result remains authoritative. */ }
  console.warn(JSON.stringify({ operation: "operations.observe", code: "OBSERVATION_UNCONFIRMED", correlationId }));
}
export async function observeHeartbeat(client: SupabaseClient, component: Extract<OperationComponent, "application" | "worker">) {
  const id = randomUUID();
  return new DatabaseOperationsSink(client).record({ environment: serverOperationEnvironment(), component, code: "HEARTBEAT", idempotencyKey: id, correlationId: id, observedAt: new Date().toISOString(), metrics: {} });
}
export async function observeApplicationHeartbeat() {
  try {
    const sink = configuredSink(); if (!sink) return;
    const id = randomUUID();
    await sink.record({ environment: serverOperationEnvironment(), component: "application", code: "HEARTBEAT", idempotencyKey: id, correlationId: id, observedAt: new Date().toISOString(), metrics: {} });
  } catch { /* Public compatibility must not depend on privileged telemetry. */ }
}
