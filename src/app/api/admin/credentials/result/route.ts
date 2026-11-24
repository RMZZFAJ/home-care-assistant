import { NextResponse } from "next/server";
import { api, authenticate, patientContext, readJson, rpc } from "@/lib/server/api";
import { credentialReviewRecovery, credentialReviewReference } from "@/lib/validation/professional-credential";

export async function POST(request: Request) {
  return api("credential.review.result", async () => {
    const input = await readJson(request, credentialReviewReference, 2_000);
    const auth = await authenticate();
    const patient = await patientContext(auth, input.careRecipientId, "access.manage", true);
    const data = await rpc(auth.client, "professional_credential_review_result", {
      p_patient: patient.id,
      p_subject: input.subjectId,
      p_expected: input.expectedRevision,
      p_key: input.idempotencyKey,
    });
    return NextResponse.json({ data: credentialReviewRecovery.parse(data) }, { headers: { "Cache-Control": "private, no-store" } });
  });
}
