import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticate, databaseError, parseQuery, readJson, rpc } from "@/lib/server/api";
import { authorizeCatalogue, catalogueScopeArgs } from "@/lib/server/catalogue-preparation";
import { catalogueScope, reviewedCatalogueCommand, reviewedCatalogueProductReference, validCatalogueScope, verifyReviewedCatalogueReceipt } from "@/lib/validation/catalogue-preparation";

const query = catalogueScope.extend({ selection: z.string().min(1).max(120).nullable() }).refine(validCatalogueScope);
const headers = { "cache-control": "private, no-store" };

export async function GET(request: Request) {
  return api("admin.catalogue-actions.reference", async () => {
    const params = new URL(request.url).searchParams;
    const read = (key: string) => {
      const values = params.getAll(key);
      if (values.length > 1) throw new ApiError("VALIDATION_ERROR", "Confira a consulta do catálogo.", 400);
      return values[0] ?? null;
    };
    const scope = parseQuery(query, {
      patientId: read("patientId"), mode: read("mode"), purpose: read("purpose"),
      targetId: read("targetId"), selection: read("selection"),
    });
    const auth = await authenticate();
    await authorizeCatalogue(auth, scope);
    const reference = await rpc(auth.client, "reviewed_catalogue_reference", {
      ...catalogueScopeArgs(scope), p_selection: scope.selection,
    });
    const data = ["create", "edit", "adopt"].includes(scope.purpose)
      ? reviewedCatalogueProductReference.parse(reference) : reference;
    return NextResponse.json(data, { headers });
  });
}

export async function POST(request: Request) {
  return api("admin.catalogue-actions.confirm", async () => {
    const command = await readJson(request, reviewedCatalogueCommand, 40_000);
    const auth = await authenticate();
    await authorizeCatalogue(auth, command, command.intent === null);
    const { data, error } = await auth.client.rpc("reviewed_catalogue_command", {
      ...catalogueScopeArgs(command), p_key: command.key, p_fields: command.intent?.fields ?? null,
      p_reference_hash: command.intent?.referenceHash ?? null,
    });
    if (error?.message === "ambiguous product alias")
      throw new ApiError("VERSION_CONFLICT", "Já existe um item com esse nome ou nome alternativo. Confira o cadastro ou use uma identificação distinta.", 409);
    if (/^unit with (operational|presentation) history is immutable/.test(error?.message ?? ""))
      throw new ApiError("VALIDATION_ERROR", "A unidade usada no histórico deste material deve ser preservada. Para outra unidade, cadastre outro item.", 400);
    if (error) databaseError(error);
    return NextResponse.json(verifyReviewedCatalogueReceipt(auth.userId, command, data), { headers });
  });
}
