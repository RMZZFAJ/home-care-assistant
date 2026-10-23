import { NextResponse } from "next/server";
import {
  api,
  ApiError,
  authenticate,
  pageParameters,
  patientContext,
  readJson,
  rpc,
  saoPauloDateBoundary,
} from "@/lib/server/api";
import { createSupplySchema } from "@/lib/validation/documents";

export async function GET(request: Request) {
  return api("documents.list", async () => {
    const auth = await authenticate();
    const params = new URL(request.url).searchParams;
    const patient = await patientContext(auth, params.get("careRecipientId"));
    const { page, pageSize } = pageParameters(params);
    const type = params.get("type") || null,
      status = params.get("status") || null,
      search = params.get("search")?.trim() || null;
    if (
      (type && !["REQ", "COM", "ENT", "BAL"].includes(type)) ||
      (status && !/^[a-z_]{1,40}$/.test(status)) ||
      (search && !/^[A-Za-z0-9-]{1,100}$/.test(search))
    )
      throw new ApiError("VALIDATION_ERROR", "Revise os filtros de documento.");
    const result = await rpc(auth.client, "operational_document_list", {
      p_patient: patient.id,
      p_type: type,
      p_status: status,
      p_search: search,
      p_from: params.get("from")
        ? saoPauloDateBoundary(params.get("from")!)
        : null,
      p_to: params.get("to")
        ? saoPauloDateBoundary(params.get("to")!, true)
        : null,
      p_page: page,
      p_size: pageSize,
    });
    return NextResponse.json(result);
  });
}
export async function POST(request: Request) {
  return api("documents.create", async () => {
    const input = await readJson(request, createSupplySchema);
    const auth = await authenticate();
    await patientContext(
      auth,
      input.careRecipientId,
      input.type === "COM"
        ? "com.create"
        : input.type === "ENT"
          ? "ent.create"
          : "bal.count",
      true,
    );
    const data = await rpc(auth.client, "create_supply_document", {
      p_patient: input.careRecipientId,
      p_type: input.type,
      p_payload: input.payload,
      p_key: input.idempotencyKey,
      p_draft: input.draft,
    });
    return NextResponse.json(
      { data, persistence: "confirmed" },
      { status: 201 },
    );
  });
}
