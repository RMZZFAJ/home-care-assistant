import { NextResponse } from "next/server";
import { z } from "zod";
import {
  api,
  authenticate,
  patientContext,
  parseQuery,
  readJson,
  rpc,
} from "@/lib/server/api";
import { consumptionPreparationPurposes } from "@/lib/forms/consumption-preparation-purposes";
import { consumptionPreparationCommandSchema } from "@/lib/validation/consumption-preparations";
const scope = z
  .object({
    careRecipientId: z.uuid(),
    purpose: z.enum(consumptionPreparationPurposes),
    targetResourceId: z.uuid(),
  })
  .strict();
export async function GET(request: Request) {
  return api("consumption.preparation.read", async () => {
    const v = parseQuery(
        scope,
        Object.fromEntries(new URL(request.url).searchParams),
      ),
      auth = await authenticate();
    await patientContext(auth, v.careRecipientId);
    const data = await rpc(auth.client, "consumption_preparation_context", {
      p_patient: v.careRecipientId,
      p_purpose: v.purpose,
      p_target: v.targetResourceId,
    });
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
export async function POST(request: Request) {
  return api("consumption.preparation.write", async () => {
    const v = await readJson(request, consumptionPreparationCommandSchema),
      auth = await authenticate();
    await patientContext(auth, v.careRecipientId);
    const data = await rpc(auth.client, "consumption_preparation_command", {
      p_patient: v.careRecipientId,
      p_purpose: v.purpose,
      p_target: v.targetResourceId,
      p_id: v.id,
      p_expected: v.expectedRevision,
      p_key: v.idempotencyKey,
      p_body: {
        action: v.action,
        ...(v.action === "save"
          ? { content: v.content, navigation: v.navigation }
          : {}),
      },
    });
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
