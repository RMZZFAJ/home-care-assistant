import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticate, parseQuery, readJson, requireGlobal, rpc } from "@/lib/server/api";
import { operationEnvironment, operationsCommand, operationsDiagnostics, operationsHistory, operationsReceipt } from "@/lib/operations/contracts";

const query = z.object({ environment: operationEnvironment.default("shared_database"), page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(20), state: z.enum(["active", "resolved", "all"]).default("active"), history: z.enum(["policy", "incident"]).optional(), incident: z.uuid().optional() }).strict().refine(value => value.history === "incident" ? Boolean(value.incident) : !value.incident, { message: "Informe o incidente do histórico solicitado." });
export async function GET(request: Request) {
  return api("operations.read", async () => {
    const auth = await authenticate(); requireGlobal(auth);
    const input = parseQuery(query, Object.fromEntries(new URL(request.url).searchParams));
    if (input.history) {
      const data = operationsHistory.parse(await rpc(auth.client, "operations_history", { p_environment: input.environment, p_incident: input.history === "incident" ? input.incident ?? null : null, p_page: input.page, p_size: input.pageSize }));
      return NextResponse.json({ data });
    }
    return NextResponse.json({ data: operationsDiagnostics.parse(await rpc(auth.client, "operations_diagnostics", { p_environment: input.environment, p_page: input.page, p_size: input.pageSize, p_state: input.state })) });
  });
}
export async function POST(request: Request) {
  return api("operations.command", async () => {
    const input = await readJson(request, operationsCommand, 8192), auth = await authenticate(); requireGlobal(auth);
    const data = operationsReceipt.parse(await rpc(auth.client, "operations_command", { p_environment: input.environment, p_action: input.action, p_id: input.incidentId, p_expected: input.expectedVersion, p_payload: input.action === "configure" ? { policy: input.policy } : { reason: input.reason }, p_key: input.idempotencyKey }));
    return NextResponse.json({ data });
  });
}
