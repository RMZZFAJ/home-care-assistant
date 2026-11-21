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
import { parsePrivateDraft } from "@/lib/validation/private-draft-results";
import { scheduleResourcePurposeSchema } from "@/lib/schedules/resource-preparations";
const query = z
  .object({
    careRecipientId: z.uuid(),
    before: z.iso.datetime({ offset: true }).optional(),
    beforeId: z.uuid().optional(),
  })
  .strict()
  .refine((v) => Boolean(v.before) === Boolean(v.beforeId));
const row = z.object({
  purpose: scheduleResourcePurposeSchema,
  targetResourceId: z.uuid(),
});
export async function GET(request: Request) {
  return api("schedule.resource_preparation.list", async () => {
    const params = new URL(request.url).searchParams;
    if (new Set(params.keys()).size !== [...params.keys()].length)
      throw new ApiError(
        "VALIDATION_ERROR",
        "Confira a paginação dos seus preenchimentos.",
      );
    const v = parseQuery(query, Object.fromEntries(params)),
      auth = await authenticate();
    await patientContext(auth, v.careRecipientId);
    const raw = await rpc(auth.client, "schedule_resource_preparation_list", {
      p_patient: v.careRecipientId,
      p_before: v.before ?? null,
      p_before_id: v.beforeId ?? null,
      p_limit: 20,
    });
    const data = z
      .array(z.unknown())
      .parse(raw)
      .map((item) => {
        const s = row.parse(item);
        return parsePrivateDraft(item, {
          userId: auth.userId,
          patientId: v.careRecipientId,
          kind: "SCHEDULE",
          targetDocumentId: null,
          purpose: s.purpose,
          targetResourceId: s.targetResourceId,
        });
      });
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  });
}
