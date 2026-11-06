import { NextResponse } from "next/server";
import {
  api,
  ApiError,
  authenticate,
  patientContext,
  readJson,
  rpc,
} from "@/lib/server/api";
import { catalogueIdentityCommandSchema } from "@/lib/validation/catalogue";

export async function GET(request: Request) {
  return api("catalog.identity.read", async () => {
    const params = new URL(request.url).searchParams,
      auth = await authenticate();
    const patient = await patientContext(
      auth,
      params.get("careRecipientId"),
      "catalog.manage",
    );
    const product = params.get("productId"),
      successor = params.get("successorId"),
      page = Number(params.get("page") ?? "1");
    if (
      !product ||
      product.length > 120 ||
      (successor !== null && (!successor || successor.length > 120)) ||
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 100000
    )
      throw new ApiError(
        "VALIDATION_ERROR",
        "Confira os materiais e a página consultada.",
      );
    return NextResponse.json(
      {
        data: await rpc(auth.client, "catalogue_identity_context", {
          p_patient: patient.id,
          p_product: product,
          p_successor: successor,
          p_page: page,
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
export async function POST(request: Request) {
  return api("catalog.identity.write", async () => {
    const input = await readJson(request, catalogueIdentityCommandSchema),
      auth = await authenticate();
    // The database distinguishes a new change from recovery of this actor's
    // already committed key. Recovery requires live read, not renewed write.
    const patient = await patientContext(auth, input.careRecipientId);
    return NextResponse.json(
      {
        data: await rpc(auth.client, "catalogue_identity_command", {
          p_patient: patient.id,
          p_product: input.productId,
          p_successor: input.successorId,
          p_reference: input.referenceHash,
          p_body: { action: input.action, reason: input.reason },
          p_key: input.idempotencyKey,
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
