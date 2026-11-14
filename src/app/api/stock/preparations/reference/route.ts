import { stockPreparationContext } from "@/lib/server/stock-preparation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticate, rpc } from "@/lib/server/api";
const query = z
  .object({
    careRecipientId: z.uuid(),
    productId: z.string().trim().min(1).max(120),
    referenceId: z.uuid().optional(),
  })
  .strict();
export async function GET(request: Request) {
  return api("stock.preparation.reference", async () => {
    const parsed = query.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success)
      throw new ApiError(
        "VALIDATION_ERROR",
        "Confira o paciente, o material e o movimento consultados.",
      );
    const input = parsed.data,
      auth = await authenticate();
    await stockPreparationContext(auth, input.careRecipientId);
    const data = await rpc(
      auth.client,
      "stock_movement_preparation_reference",
      {
        p_patient: input.careRecipientId,
        p_product: input.productId,
        p_reference: input.referenceId ?? null,
      },
    );
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
