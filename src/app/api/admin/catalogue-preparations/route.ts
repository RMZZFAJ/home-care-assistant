import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticate, parseQuery, readJson, rpc } from "@/lib/server/api";
import { authorizeCatalogue, catalogueScopeArgs, runCatalogueAttempt } from "@/lib/server/catalogue-preparation";
import { catalogueAttempt, catalogueScope, validCatalogueScope } from "@/lib/validation/catalogue-preparation";

function privateResponse(data: unknown) {
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: Request) {
  return api("admin.catalogue-preparation.read", async () => {
    const params = new URL(request.url).searchParams;
    const scope = parseQuery(catalogueScope.extend({
      key: z.uuid().nullable(), selection: z.string().max(120).nullable(),
    }).refine(validCatalogueScope), {
      patientId: params.get("patientId"),
      mode: params.get("mode"),
      purpose: params.get("purpose"),
      targetId: params.get("targetId"),
      key: params.get("key"),
      selection: params.get("selection"),
    });
    const auth = await authenticate();
    if (scope.selection !== null) {
      await authorizeCatalogue(auth, scope);
      return privateResponse(await rpc(auth.client, "catalogue_preparation_current", {
        ...catalogueScopeArgs(scope), p_selection: scope.selection || null,
      }));
    }
    await authorizeCatalogue(auth, scope, scope.key !== null);
    return privateResponse(await rpc(auth.client, "catalogue_preparation_read", {
      ...catalogueScopeArgs(scope), p_key: scope.key,
    }));
  });
}

export async function POST(request: Request) {
  return api("admin.catalogue-preparation.write", async () => {
    const attempt = await readJson(request, catalogueAttempt, 40_000);
    if (attempt.action === "commit") throw new ApiError("VALIDATION_ERROR", "Use a confirmação do catálogo.", 400);
    return privateResponse(await runCatalogueAttempt(await authenticate(), attempt));
  });
}
