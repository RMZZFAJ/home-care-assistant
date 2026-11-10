import { NextResponse } from "next/server";
import { z } from "zod";
import {
  api,
  ApiError,
  authenticate,
  patientContext,
  rpc,
} from "@/lib/server/api";
import { balancePreparationListSchema } from "@/lib/validation/balance-preparations";
const query = z
  .object({
    careRecipientId: z.uuid(),
    before: z.iso.datetime({ offset: true }).optional(),
    beforeId: z.uuid().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict()
  .refine(
    (v) => (v.before === undefined) === (v.beforeId === undefined),
    "Confira a página solicitada.",
  );
export async function GET(request: Request) {
  return api("balances.preparation.list", async () => {
    const parsed = query.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success)
      throw new ApiError(
        "VALIDATION_ERROR",
        "Confira a página e o paciente consultados.",
      );
    const input = parsed.data,
      auth = await authenticate();
    await patientContext(auth, input.careRecipientId, "bal.read");
    const result = balancePreparationListSchema.safeParse(
      await rpc(auth.client, "balance_preparation_list", {
        p_patient: input.careRecipientId,
        p_before: input.before ?? null,
        p_before_id: input.beforeId ?? null,
        p_limit: input.limit,
      }),
    );
    if (!result.success)
      throw new ApiError(
        "INTERNAL_ERROR",
        "Não foi possível consultar seus preenchimentos. Consulte novamente.",
        500,
        true,
      );
    return NextResponse.json(
      { data: result.data },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
