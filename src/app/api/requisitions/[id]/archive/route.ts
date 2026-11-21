import { requisitionDraftFields, requireRequisitionDraftFields } from "@/lib/validation/requisition-decisions";
import { commitRequisitionDraft } from "@/lib/server/requisition-draft";
import { executeDocumentArchive } from "@/lib/server/document-archive";
import { documentArchiveCommand } from "@/lib/documents/document-archive";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  api,
  ApiError,
  authenticate,
  databaseError,
  parseUuid,
  patientContext,
  readJson,
  rpc,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const maxDuration = 60;
const archiveInput = z.union([
  documentArchiveCommand,
  z.strictObject({ ...requisitionDraftFields, reason: z.string().trim().min(3).max(1000) })
    .superRefine(requireRequisitionDraftFields),
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api("requisition.archive", async () => {
    const input = await readJson(request, archiveInput, 4096);
    const auth = await authenticate();
    const id = parseUuid((await context.params).id);
    const { data: document, error } = await auth.client
      .from("requisitions")
      .select("care_recipient_id")
      .eq("id", id)
      .maybeSingle();
    if (error) databaseError(error);
    if (!document)
      throw new ApiError("NOT_FOUND", "Requisição não encontrada.", 404);
    if (!("action" in input) && input.draftCommit) {
      await patientContext(auth, document.care_recipient_id);
      return NextResponse.json({ data: await commitRequisitionDraft(auth.client, id, "archive", input, { reason: input.reason }) });
    }
    await patientContext(auth, document.care_recipient_id, "req.archive", true);
    if ("action" in input) return executeDocumentArchive(auth.client, id, input);
    return NextResponse.json({
      data: await rpc(auth.client, "archive_requisition", {
        p_id: id,
        p_reason: input.reason,
      }),
    });
  });
}
