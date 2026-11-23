import { NextResponse } from "next/server";
import { z } from "zod";
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
const recoveryCommand = z.union([
  schedulePreparationCommitSchema,
  z.object({ packet: schedulePreparationCommitSchema, resolutionKey: z.uuid() })
    .strict()
    .refine((value) => value.resolutionKey !== value.packet.idempotencyKey),
]);
export async function POST(request: Request) {
  return api("schedule.preparation.recovery", async () => {
    const input = await readJson(request, recoveryCommand);
    const v = "packet" in input ? input.packet : input;
    const resolutionKey = "resolutionKey" in input ? input.resolutionKey : undefined;
    const auth = await authenticate();
    await patientContext(auth, v.careRecipientId);
    const args = {
      p_patient: v.careRecipientId,
      p_purpose: v.purpose,
      p_id: v.draftCommit.id,
      p_expected: v.draftCommit.revision,
      p_key: v.idempotencyKey,
      p_body: v.command,
    };
    const data = resolutionKey
      ? await rpc(auth.client, "resolve_schedule_creation_attempt", {
          ...args,
          p_original_key: args.p_key,
          p_key: resolutionKey,
        })
      : await rpc(auth.client, "schedule_preparation_recovery", args);
    return NextResponse.json(
      { data: parseScheduleRecovery(data, v, auth.userId) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  });
}
