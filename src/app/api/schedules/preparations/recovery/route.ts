import { NextResponse } from "next/server";
import {
  api,
  authenticate,
  patientContext,
  readJson,
  rpc,
} from "@/lib/server/api";
import {
  schedulePreparationCommitSchema,
  parseScheduleRecovery,
} from "@/lib/validation/schedule-preparations";
export async function POST(request: Request) {
  return api("schedule.preparation.recovery", async () => {
    const v = await readJson(request, schedulePreparationCommitSchema),
      auth = await authenticate();
    await patientContext(auth, v.careRecipientId);
    const data = await rpc(auth.client, "schedule_preparation_recovery", {
      p_patient: v.careRecipientId,
      p_purpose: v.purpose,
      p_id: v.draftCommit.id,
      p_expected: v.draftCommit.revision,
      p_key: v.idempotencyKey,
      p_body: v.command,
    });
    return NextResponse.json(
      { data: parseScheduleRecovery(data, v, auth.userId) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  });
}
