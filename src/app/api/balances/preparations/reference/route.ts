import { NextResponse } from "next/server";
import { z } from "zod";
import {
  api,
  ApiError,
  authenticate,
  patientContext,
  rpc,
} from "@/lib/server/api";
import {
  balancePreparationPurposeSchema,
  balancePreparationReferenceSchema,
} from "@/lib/validation/balance-preparations";
const query = z
  .object({
    careRecipientId: z.uuid(),
    purpose: balancePreparationPurposeSchema,
    targetResourceId: z.uuid(),
  })
  .strict();
export async function GET(request: Request) {
  return api("balances.preparation.reference", async () => {
    const parsed = query.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success)
      throw new ApiError(
        "VALIDATION_ERROR",
        "Confira o paciente, a intenção e a referência consultada.",
      );
    const input = parsed.data,
      auth = await authenticate();
    await patientContext(auth, input.careRecipientId, "bal.read");
    const result = balancePreparationReferenceSchema.safeParse(
      await rpc(auth.client, "balance_preparation_reference", {
        p_patient: input.careRecipientId,
        p_purpose: input.purpose,
        p_target: input.targetResourceId,
      }),
    );
    if (
      !result.success ||
      result.data.patientId !== input.careRecipientId ||
      result.data.purpose !== input.purpose ||
      result.data.targetResourceId !== input.targetResourceId
    )
      throw new ApiError(
        "INTERNAL_ERROR",
        "Não foi possível conferir a referência do balanço. Consulte novamente.",
        500,
        true,
      );
    return NextResponse.json(
      { data: result.data },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
