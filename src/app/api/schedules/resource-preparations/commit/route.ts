import { NextResponse } from "next/server";
import {
  api,
  authenticate,
  patientContext,
  readJson,
  rpc,
} from "@/lib/server/api";
import { scheduleResourceRpcPacket } from "@/lib/schedules/resource-transport";
import {
  scheduleResourceCommitSchema,
  parseScheduleResourceConfirmation,
} from "@/lib/validation/schedule-resource-preparations";
export async function POST(request: Request) {
  return api("schedule.resource_preparation.commit", async () => {
    const v = await readJson(request, scheduleResourceCommitSchema),
      auth = await authenticate();
    await patientContext(auth, v.careRecipientId);
    const data = await rpc(
      auth.client,
      "commit_schedule_resource_preparation",
      scheduleResourceRpcPacket(v),
    );
    return NextResponse.json(
      { data: parseScheduleResourceConfirmation(data, v, auth.userId) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  });
}
