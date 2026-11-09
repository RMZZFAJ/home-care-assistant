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
import { draftPurpose, comOperationPurposes, entDraftPurposes } from "@/lib/validation/supply-drafts";
export async function GET(request: Request) {
  return api("drafts.read", async () => {
    const params = new URL(request.url).searchParams,
      kind = params.get("kind"),
      target = params.get("targetDocumentId"),purpose=params.get("purpose")??"create",extended=kind==="COM"||kind==="ENT";
    if (
      !["REQ", "BAL","COM","ENT"].includes(kind ?? "") ||
      !draftPurpose.safeParse(purpose).success||(!extended&&purpose!=="create")||
      (extended&&((purpose==="create")!==(target===null)||kind==="COM"&&!["create","revise",...comOperationPurposes].includes(purpose)||kind==="ENT"&&!["create","revise",...entDraftPurposes].includes(purpose)))||
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
        data: await rpc(auth.client, extended?"supply_draft_context":"creation_draft_context", {
          p_patient: patient.id,
          p_kind: kind,
          p_target: target,
          ...(extended?{p_purpose:purpose}:{}),
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
        data: await rpc(auth.client, input.kind==="COM"||input.kind==="ENT"?"supply_draft_command":"creation_draft_command", {
          p_patient: patient.id,
          p_kind: input.kind,
          p_target: input.targetDocumentId,
          ...("purpose" in input?{p_purpose:input.purpose}:{}),
          p_id: input.id,
          p_expected: input.expectedRevision,
          p_key: input.idempotencyKey,
          p_body:
            input.action === "save"
              ? { action: input.action, content: input.content, ...(input.navigation ? { navigation: input.navigation } : {}) }
              : { action: input.action },
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
