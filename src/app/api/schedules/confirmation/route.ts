import { NextResponse } from "next/server";
import { z } from "zod";
import {
  api,
  authenticate,
  patientContext,
  rpc,
  ApiError,
} from "@/lib/server/api";
const query = z
  .object({ careRecipientId: z.uuid(), idempotencyKey: z.uuid() })
  .strict();
export async function GET(request: Request) {
  return api("schedules.confirmation", async () => {
    const params = new URL(request.url).searchParams;
    const parsed = query.safeParse(Object.fromEntries(params));
    if (!parsed.success || [...params.keys()].length !== 2)
      throw new ApiError(
        "INVALID_OPERATION",
        "Confira a referência da tentativa de escala.",
        400,
      );
    const auth = await authenticate();
    const patient = await patientContext(auth, parsed.data.careRecipientId);
    return NextResponse.json(
      await rpc(auth.client, "schedule_confirmation", {
        p_patient: patient.id,
        p_key: parsed.data.idempotencyKey,
      }),
    );
  });
}
