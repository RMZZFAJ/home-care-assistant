import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticate, parseQuery, readJson, rpc } from "@/lib/server/api";
import { administrativeAttempt, administrativeScope } from "@/lib/validation/administrative-preparation";
import { administrativeScopeArgs, authorizeAdministrativePreparation, runAdministrativePreparation } from "@/lib/server/administrative-preparation";

export async function GET(request: Request) {
  return api("admin.preparation.read", async () => {
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some(key => params.getAll(key).length > 1)) {
      throw new ApiError("VALIDATION_ERROR", "Revise os filtros desta consulta.", 400);
    }
    const query = parseQuery(administrativeScope.extend({
      key: z.uuid().nullable(), selection: z.string().max(120).nullable(), option: z.string().max(16).nullable(),
    }), {
      targetId: null, key: null, selection: null, option: null, ...Object.fromEntries(params),
    });
    const auth = await authenticate();
    if (!query.key) await authorizeAdministrativePreparation(auth, query);
    return NextResponse.json(await rpc(auth.client, "administrative_preparation_read", {
      ...administrativeScopeArgs(query), p_key: query.key, p_selection: query.selection, p_option: query.option,
    }));
  });
}

export async function POST(request: Request) {
  return api("admin.preparation.write", async () => {
    const attempt = await readJson(request, administrativeAttempt, 8_000);
    if (attempt.action === "commit") throw new ApiError("VALIDATION_ERROR", "Use a confirmação administrativa.", 400);
    return NextResponse.json(await runAdministrativePreparation(await authenticate(), attempt));
  });
}
