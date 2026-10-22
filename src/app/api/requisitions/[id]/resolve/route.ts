import { NextResponse } from "next/server";
import { z } from "zod";
import {
  api,
  ApiError,
  authenticate,
  databaseError,
  patientContext,
  readJson,
  rpc,
  uuid,
} from "@/lib/server/api";

const schema = z
  .object({
    itemId: uuid,
    productId: z.string().min(1).max(120),
    reason: z.string().trim().min(3).max(1000),
    idempotencyKey: uuid,
  })
  .strict();
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api("requisitions.resolve-item", async () => {
    const { id } = await context.params;
    if (!uuid.safeParse(id).success)
      throw new ApiError("VALIDATION_ERROR", "Identificador inválido.");
    const input = await readJson(request, schema);
    const auth = await authenticate();
    const { data, error } = await auth.client
      .from("requisition_items")
      .select("care_recipient_id")
      .eq("id", input.itemId)
      .eq("requisition_id", id)
      .maybeSingle();
    if (error) databaseError(error);
    if (!data) throw new ApiError("NOT_FOUND", "Item não encontrado.", 404);
    await patientContext(auth, data.care_recipient_id, "catalog.manage", true);
    return NextResponse.json({
      data: await rpc(auth.client, "resolve_requisition_item", {
        p_item: input.itemId,
        p_product: input.productId,
        p_reason: input.reason,
        p_key: input.idempotencyKey,
      }),
    });
  });
}
