import { NextResponse } from "next/server";
import { api, ApiError, authenticate, databaseError, parseQuery, patientContext } from "@/lib/server/api";
import { catalogueMaterialHistory, catalogueMaterialHistoryQuery } from "@/lib/validation/catalogue-material-history";

export async function GET(request: Request) {
  return api("catalog.history.read", async () => {
    const params = new URL(request.url).searchParams;
    if (new Set(params.keys()).size !== params.size)
      throw new ApiError("VALIDATION_ERROR", "Confira os dados da consulta do histórico.", 400);
    const query = parseQuery(catalogueMaterialHistoryQuery, Object.fromEntries(params));
    const auth = await authenticate();
    const patient = await patientContext(auth, query.careRecipientId, "catalog.manage");
    const { data, error } = await auth.client.rpc("catalogue_material_history", {
      p_patient: patient.id, p_product: query.productId, p_page: query.page,
    });
    if (error?.code === "PT404")
      throw new ApiError("NOT_FOUND", "Material não encontrado nesta residência.", 404);
    if (error) databaseError(error);
    const history = catalogueMaterialHistory.parse(data);
    if (history.patientId !== patient.id || history.material.id !== query.productId || history.page !== query.page)
      throw new Error("Catalogue history scope mismatch");
    return NextResponse.json(history, { headers: { "Cache-Control": "private, no-store" } });
  });
}
