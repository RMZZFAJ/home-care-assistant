import { NextResponse } from "next/server";
import { z } from "zod";
import {
  api,
  ApiError,
  authenticate,
  patientContext,
  parseQuery,
  rpc,
} from "@/lib/server/api";
import { scheduleResourceQuery } from "@/lib/schedules/resource-transport";
import {
  scheduleResourceReferenceSchema,
  checkScheduleResourceReference,
} from "@/lib/schedules/resource-preparations";
const result = z
  .object({
    reference: scheduleResourceReferenceSchema,
    professionals: z.array(z.object({ id: z.uuid(), name: z.string() })),
  })
  .strict();
export async function GET(request: Request) {
  return api("schedule.resource_preparation.reference", async () => {
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].length !== 3)
      throw new ApiError(
        "VALIDATION_ERROR",
        "Confira a referência deste preenchimento.",
      );
    const v = parseQuery(scheduleResourceQuery, Object.fromEntries(params)),
      auth = await authenticate();
    await patientContext(auth, v.careRecipientId);
    const data = result.parse(
      await rpc(auth.client, "schedule_resource_preparation_reference", {
        p_patient: v.careRecipientId,
        p_purpose: v.purpose,
        p_target: v.targetResourceId,
      }),
    );
    checkScheduleResourceReference(data.reference, {
      patientId: v.careRecipientId,
      purpose: v.purpose,
      targetResourceId: v.targetResourceId,
    });
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  });
}
