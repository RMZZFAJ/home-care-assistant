import { NextResponse } from "next/server";
import type { z } from "zod";
import { api, ApiError, authenticate, patientContext, parseQuery, readJson, rpc } from "./api";

type Scope = { careRecipientId: string; purpose: string; targetResourceId: string };
type Command = Scope & {
  id: string | null;
  expectedRevision: number | null;
  idempotencyKey: string;
  action: string;
  content?: unknown;
  navigation?: unknown;
};

/** Shared HTTP boundary; each domain keeps its exact schemas and native RPCs. */
export function createPrivatePreparationRoutes<Q extends Scope, W extends Command>({
  operation, rpcPrefix, scope, command, cacheControl = "no-store",
}: {
  operation: string; rpcPrefix: string; scope: z.ZodType<Q>; command: z.ZodType<W>; cacheControl?: string;
}) {
  const response = (data: unknown) => NextResponse.json({ data }, { headers: { "Cache-Control": cacheControl } });
  return {
    GET: async (request: Request) => api(operation + ".read", async () => {
      const params = new URL(request.url).searchParams;
      if (new Set(params.keys()).size !== params.size) throw new ApiError("VALIDATION_ERROR", "Informe cada filtro somente uma vez.", 400);
      const input = parseQuery(scope, Object.fromEntries(params));
      const auth = await authenticate();
      await patientContext(auth, input.careRecipientId);
      return response(await rpc(auth.client, rpcPrefix + "_context", {
        p_patient: input.careRecipientId, p_purpose: input.purpose, p_target: input.targetResourceId,
      }));
    }),
    POST: async (request: Request) => api(operation + ".write", async () => {
      const input = await readJson(request, command);
      const auth = await authenticate();
      await patientContext(auth, input.careRecipientId);
      return response(await rpc(auth.client, rpcPrefix + "_command", {
        p_patient: input.careRecipientId, p_purpose: input.purpose, p_target: input.targetResourceId,
        p_id: input.id, p_expected: input.expectedRevision, p_key: input.idempotencyKey,
        p_body: { action: input.action, ...(input.action === "save" ? { content: input.content, navigation: input.navigation } : {}) },
      }));
    }),
  };
}
