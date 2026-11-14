import { NextResponse } from "next/server";
import {
  api,
  authenticate,
  patientContext,
  readJson,
  rpc,
} from "@/lib/server/api";
import {
  consumptionPreparationCommitSchema,
  parseConsumptionPreparationConfirmation,
} from "@/lib/validation/consumption-preparations";
export async function POST(request: Request) {
  return api("consumption.preparation.commit", async () => {
    const v = await readJson(request, consumptionPreparationCommitSchema),
      auth = await authenticate();
    await patientContext(auth, v.careRecipientId);
    const value = await rpc(auth.client, "commit_consumption_preparation", {
      p_patient: v.careRecipientId,
      p_purpose: v.purpose,
      p_target: v.targetResourceId,
      p_id: v.draftCommit.id,
      p_expected: v.draftCommit.revision,
      p_key: v.idempotencyKey,
      p_body: { referenceHash: v.referenceHash, command: v.command },
    });
    const data = parseConsumptionPreparationConfirmation(value, v, auth.userId);
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
