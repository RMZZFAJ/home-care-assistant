import { NextResponse } from "next/server";
import { api, ApiError, authenticate, databaseError, parseQuery, patientContext, readJson, rpc } from "@/lib/server/api";
import { householdListCommand, householdListQuery } from "@/lib/validation/household-material-lists";

const noStore = { headers: { "Cache-Control": "no-store" } };

export async function GET(request: Request) {
  return api("catalog.material-lists.read", async () => {
    const input = parseQuery(householdListQuery, Object.fromEntries(new URL(request.url).searchParams));
    const auth = await authenticate();
    const patient = await patientContext(auth, input.careRecipientId, input.kind.toLowerCase() + ".read");
    return NextResponse.json({
      data: await rpc(auth.client, "household_material_lists", { p_patient: patient.id, p_kind: input.kind }),
    }, noStore);
  });
}

export async function POST(request: Request) {
  return api("catalog.material-lists.save", async () => {
    const input = await readJson(request, householdListCommand);
    const auth = await authenticate();
    const patient = await patientContext(auth, input.careRecipientId, input.kind.toLowerCase() + ".read");
    const { data, error } = await auth.client.rpc("save_household_material_list", {
      p_patient: patient.id, p_kind: input.kind, p_id: input.id, p_revision: input.expectedRevision,
      p_name: input.name, p_products: input.productIds, p_key: input.idempotencyKey,
    });
    if (error?.code === "PT409" && error.message === "stale household list revision")
      throw new ApiError("VERSION_CONFLICT", "A lista mudou. Volte para consultar a versão atual antes de editar novamente.", 409);
    if (error?.code === "23505" && error.message === "household list name exists")
      throw new ApiError("DUPLICATE", "Já existe uma lista da casa com esse nome.", 409);
    if (error?.code === "22023" && error.message === "household list material unavailable")
      throw new ApiError("VALIDATION_ERROR", "Um material deixou de estar disponível. Confira o catálogo antes de salvar.", 422);
    if (error) databaseError(error);
    return NextResponse.json({ data }, noStore);
  });
}
