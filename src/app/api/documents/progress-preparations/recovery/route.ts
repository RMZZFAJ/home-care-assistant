import { progressPublicationBody } from "@/lib/validation/document-progress";
import { NextResponse } from "next/server";
import {
  api,
  authenticate,
  patientContext,
  readJson,
  rpc,
} from "@/lib/server/api";
import {
  progressPreparationCommitSchema,
  parseProgressRecovery,
} from "@/lib/validation/progress-preparations";
export async function POST(request: Request) {
  return api("progress.preparation.recovery", async () => {
    const v = await readJson(request, progressPreparationCommitSchema),
      auth = await authenticate();
    await patientContext(auth, v.careRecipientId);
    const value = await rpc(auth.client, "progress_preparation_recovery", {
      p_patient: v.careRecipientId,
      p_purpose: v.purpose,
      p_target: v.targetResourceId,
      p_id: v.draftCommit.id,
      p_expected: v.draftCommit.revision,
      p_key: v.key,
      p_body: progressPublicationBody(v),
    });
    return NextResponse.json(
      { data: parseProgressRecovery(value, v, auth.userId) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  });
}
