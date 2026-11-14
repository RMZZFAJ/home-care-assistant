import { NextResponse } from "next/server";
import { z } from "zod";
import {
  api,
  ApiError,
  authenticate,
  patientContext,
  readJson,
  rpc,
} from "@/lib/server/api";
import {
  balancePreparationCommandSchema,
  balancePreparationPurposeSchema,
} from "@/lib/validation/balance-preparations";
const query = z
  .object({
    careRecipientId: z.uuid(),
    purpose: balancePreparationPurposeSchema,
    targetResourceId: z.uuid(),
  })
  .strict();
export async function GET(request: Request) {
  return api("balances.preparation.read", async () => {
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
    const data = await rpc(auth.client, "balance_preparation_context", {
      p_patient: input.careRecipientId,
      p_purpose: input.purpose,
      p_target: input.targetResourceId,
    });
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
export async function POST(request: Request) {
  return api("balances.preparation.write", async () => {
    const input = await readJson(request, balancePreparationCommandSchema),
      auth = await authenticate();
    await patientContext(auth, input.careRecipientId, "bal.read", true);
    const data = await rpc(auth.client, "balance_preparation_command", {
      p_patient: input.careRecipientId,
      p_purpose: input.purpose,
      p_target: input.targetResourceId,
      p_id: input.id,
      p_expected: input.expectedRevision,
      p_key: input.idempotencyKey,
      p_body:
        input.action === "save"
          ? {
              action: input.action,
              content: input.content,
              navigation: input.navigation,
            }
          : { action: input.action },
    });
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
