import { NextResponse } from "next/server";
import { api, ApiError, authenticate, rpc } from "@/lib/server/api";
import { purchaseCoverageQuery } from "@/lib/validation/purchase-coverage";

export async function GET(request: Request) {
  return api("purchase-arrivals.targets", async () => {
    const input = purchaseCoverageQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!input.success) throw new ApiError("VALIDATION_ERROR", "Confira o material e a compra de origem.");
    const { careRecipientId, productId, sourceDocumentId } = input.data;
    const { client } = await authenticate();
    const data = await rpc(client, "purchase_arrival_targets", {
      p_patient: careRecipientId, p_product: productId, p_source: sourceDocumentId ?? null,
    });
    return NextResponse.json({ careRecipientId, productId, sourceDocumentId: sourceDocumentId ?? null, data }, { headers: { "Cache-Control": "no-store" } });
  });
}
