import { NextResponse } from "next/server";
import {
  api,
  ApiError,
  authenticate,
  patientContext,
  parseQuery,
  readJson,
  rpc,
} from "@/lib/server/api";
import { scheduleResourceQuery } from "@/lib/schedules/resource-transport";
import { scheduleResourceCommandSchema } from "@/lib/validation/schedule-resource-preparations";
export async function GET(request: Request) {
  return api("schedule.resource_preparation.read", async () => {
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].length !== 3)
      throw new ApiError(
        "VALIDATION_ERROR",
        "Confira o contexto deste preenchimento.",
      );
    const v = parseQuery(scheduleResourceQuery, Object.fromEntries(params)),
      auth = await authenticate();
    await patientContext(auth, v.careRecipientId);
    const data = await rpc(
      auth.client,
      "schedule_resource_preparation_context",
      {
        p_patient: v.careRecipientId,
        p_purpose: v.purpose,
        p_target: v.targetResourceId,
      },
    );
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  });
}
export async function POST(request: Request) {
  return api("schedule.resource_preparation.write", async () => {
    const v = await readJson(request, scheduleResourceCommandSchema),
      auth = await authenticate();
    await patientContext(auth, v.careRecipientId);
    const data = await rpc(
      auth.client,
      "schedule_resource_preparation_command",
      {
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
      },
    );
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  });
}
