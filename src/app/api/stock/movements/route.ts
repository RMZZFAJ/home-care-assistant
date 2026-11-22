import { NextResponse } from "next/server";
import {
  api,
  ApiError,
  authenticate,
  databaseError,
  pageParameters,
  patientContext,
  readJson,
  rpc,
  saoPauloDateBoundary,
} from "@/lib/server/api";
import { familyStockMovementSchema } from "@/lib/validation/stock";
export async function GET(request: Request) {
  return api("stock.list", async () => {
    const auth = await authenticate();
    const params = new URL(request.url).searchParams;
    const patient = await patientContext(auth, params.get("careRecipientId"));
    const { page, pageSize } = pageParameters(params);
    const from = params.get("from");
    const to = params.get("to");
    if (from && to && from > to)
      throw new ApiError("INVALID_DATE", "Período inválido.");
    const history = (await rpc(auth.client, "stock_history", {
      p_patient: patient.id,
      p_product: params.get("productId") || null,
      p_from: from ? saoPauloDateBoundary(from) : null,
      p_to: to ? saoPauloDateBoundary(to, true) : null,
      p_location: params.get("location") || null,
      p_page: page,
      p_size: pageSize,
    })) as { data: unknown[]; total: number };
    const balances = await auth.client
      .from("current_stock_balances")
      .select("product_id,location,balance")
      .eq("care_recipient_id", patient.id);
    if (balances.error) databaseError(balances.error);
    return NextResponse.json({
      ...history,
      careRecipientId: patient.id,
      filters: { productId: params.get("productId") || null, location: params.get("location") || null, from: from || null, to: to || null },
      balances: balances.data ?? [],
      page,
      pageSize,
    });
  });
}

export async function POST(request: Request) {
  return api("stock.family.write", async () => {
    const input = await readJson(request, familyStockMovementSchema);
    const auth = await authenticate();
    await patientContext(
      auth,
      input.careRecipientId,
      "stock.family.manage",
      true,
    );
    const id = await rpc(auth.client, "family_stock_movement", {
      p_patient: input.careRecipientId,
      p_product: input.productId,
      p_quantity: input.quantity,
      p_action: input.action,
      p_reason: input.reason,
      p_key: input.idempotencyKey,
      p_reference: input.referenceId ?? null,
    });
    return NextResponse.json({ id, persistence: "confirmed" }, { status: 201 });
  });
}
