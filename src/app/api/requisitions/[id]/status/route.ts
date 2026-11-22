import { requisitionDraftFields, requireRequisitionDraftFields } from "@/lib/validation/requisition-decisions";
import { commitRequisitionDraft } from "@/lib/server/requisition-draft";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  api,
  ApiError,
  authenticate,
  databaseError,
  patientContext,
  readJson,
  rpc,
  uuid,
} from "@/lib/server/api";

const schema = z
  .object({
    ...requisitionDraftFields,
    status: z.literal("cancelled"),
    reason: z.string().trim().min(3).max(1000),
  })
  .strict().superRefine(requireRequisitionDraftFields);
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api("requisitions.transition", async () => {
    const input = await readJson(request, schema);
    const auth = await authenticate();
    const { id } = await context.params;
    if (!uuid.safeParse(id).success)
      throw new ApiError("VALIDATION_ERROR", "Identificador inválido.");
    const { data: row, error } = await auth.client
      .from("requisitions")
      .select("care_recipient_id")
      .eq("id", id)
      .maybeSingle();
    if (error) databaseError(error);
    if (!row)
      throw new ApiError("NOT_FOUND", "Requisição não encontrada.", 404);
    if (input.draftCommit) {
      await patientContext(auth, row.care_recipient_id);
      return NextResponse.json({ data: await commitRequisitionDraft(auth.client, id, "cancel", input, { reason: input.reason }) });
    }
    await patientContext(auth, row.care_recipient_id, "request", true);
    const data = await rpc(auth.client, "transition_requisition_status", {
      p_requisition_id: id,
      p_to_status: input.status,
      p_reason: input.reason ?? null,
    });
    return NextResponse.json({ data });
  });
}
