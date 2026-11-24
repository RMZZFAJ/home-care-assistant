import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticate, parseQuery, readJson, requireGlobal, rpc } from "@/lib/server/api";
import { operationEnvironment, operationIncident, operationsCommand, operationsDiagnostics, operationsHistory, operationsOutcome, operationsReceipt, operationsRecovery } from "@/lib/operations/contracts";

const query = z.object({ environment: operationEnvironment.default("shared_database"), page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(20), state: z.enum(["active", "resolved", "all"]).default("active"), history: z.enum(["policy", "incident"]).optional(), incident: z.uuid().optional() }).strict().refine(value => value.history === "incident" ? Boolean(value.incident) : !(value.history && value.incident), { message: "Informe o incidente do histórico solicitado." });
const command = z.union([operationsCommand, operationsRecovery]);
const reply = (data: unknown) => NextResponse.json({ data }, { headers: { "cache-control": "private, no-store" } });
export async function GET(request: Request) {
  return api("operations.read", async () => {
    const auth = await authenticate(); requireGlobal(auth);
    const params = new URL(request.url).searchParams;
    if (Array.from(params.keys()).some(key => params.getAll(key).length !== 1))
      throw new ApiError("VALIDATION_ERROR", "Use cada filtro técnico uma única vez.");
    const input = parseQuery(query, Object.fromEntries(params));
    if (input.history) {
      const data = operationsHistory.parse(await rpc(auth.client, "operations_history", { p_environment: input.environment, p_incident: input.history === "incident" ? input.incident ?? null : null, p_page: input.page, p_size: input.pageSize }));
      return reply(data);
    }
    if (input.incident) {
      const data = operationIncident.parse(await rpc(auth.client, "operations_incident", { p_environment: input.environment, p_id: input.incident }));
      if (data.environment !== input.environment || data.incident.id !== input.incident.toLowerCase())
        throw new Error("Resposta de outro incidente ou ambiente.");
      return reply(data);
    }
    return reply(operationsDiagnostics.parse(await rpc(auth.client, "operations_diagnostics", { p_environment: input.environment, p_page: input.page, p_size: input.pageSize, p_state: input.state })));
  });
}
export async function POST(request: Request) {
  return api("operations.command", async () => {
    const input = await readJson(request, command, 8192), auth = await authenticate(); requireGlobal(auth);
    if (input.expectedActorId && input.expectedActorId !== auth.userId)
      throw new ApiError("CONTEXT_REQUIRED", "A conta mudou. Volte à administração global da tentativa.");
    if (input.action === "recover")
      return reply(operationsOutcome.parse(await rpc(auth.client, "operations_recover", { p_environment: input.environment, p_key: input.idempotencyKey })));
    const data = operationsReceipt.parse(await rpc(auth.client, "operations_command", { p_environment: input.environment, p_action: input.action, p_id: input.incidentId, p_expected: input.expectedVersion, p_payload: input.action === "configure" ? { policy: input.policy } : { reason: input.reason }, p_key: input.idempotencyKey }));
    return reply(data);
  });
}
