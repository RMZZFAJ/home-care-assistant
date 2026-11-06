import { NextResponse } from "next/server";
import {
  api,
  ApiError,
  authenticate,
  patientContext,
  readJson,
  rpc,
  uuid,
} from "@/lib/server/api";
import { creationDraftCommandSchema } from "@/lib/validation/creation-drafts";
export async function GET(request: Request) {
  return api("drafts.read", async () => {
    const params = new URL(request.url).searchParams,
      kind = params.get("kind"),
      target = params.get("targetDocumentId");
    if (
      !["REQ", "BAL"].includes(kind ?? "") ||
      (target !== null && !uuid.safeParse(target).success) ||
      (kind === "REQ" && target !== null)
    )
      throw new ApiError(
        "VALIDATION_ERROR",
        "Confira o tipo e o contexto do rascunho.",
      );
    const auth = await authenticate(),
      patient = await patientContext(auth, params.get("careRecipientId"));
    return NextResponse.json(
      {
        data: await rpc(auth.client, "creation_draft_context", {
          p_patient: patient.id,
          p_kind: kind,
          p_target: target,
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
export async function POST(request: Request) {
  return api("drafts.write", async () => {
    const input = await readJson(request, creationDraftCommandSchema),
      auth = await authenticate();
    // The RPC distinguishes new saves/discards from own-key recovery and result
    // acknowledgement. Live kind-specific read is required in every path.
    const patient = await patientContext(auth, input.careRecipientId);
    return NextResponse.json(
      {
        data: await rpc(auth.client, "creation_draft_command", {
          p_patient: patient.id,
          p_kind: input.kind,
          p_target: input.targetDocumentId,
          p_id: input.id,
          p_expected: input.expectedRevision,
          p_key: input.idempotencyKey,
          p_body:
            input.action === "save"
              ? { action: input.action, content: input.content }
              : { action: input.action },
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
