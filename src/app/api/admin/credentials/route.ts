import { NextResponse } from "next/server";
import { api, ApiError, authenticate, databaseError, parseUuid, patientContext, readJson, rpc } from "@/lib/server/api";
import { credentialCursor, credentialReviewInput, credentialReviewResult } from "@/lib/validation/professional-credential";

export async function GET(request: Request) {
  return api("credential.read", async () => {
    const params = new URL(request.url).searchParams, subject = parseUuid(params.get("userId"));
    const beforeAt = params.get("beforeAt"), beforeId = params.get("beforeId");
    const cursor = beforeAt === null && beforeId === null ? null : credentialCursor.safeParse({ beforeAt, beforeId });
    if (cursor && !cursor.success) throw new ApiError("VALIDATION_ERROR", "Consulte novamente o histórico da credencial.", 400);
    const auth = await authenticate(), patient = await patientContext(auth, params.get("careRecipientId"), "access.manage");
    const page = cursor?.success ? cursor.data : null;
    return NextResponse.json({ data: await rpc(auth.client, "patient_professional_credential", {
      p_patient: patient.id, p_subject: subject, p_before: page?.beforeAt ?? null, p_before_id: page?.beforeId ?? null,
    }) }, { headers: { "Cache-Control": "private, no-store" } });
  });
}
export async function POST(request: Request) {
  return api("credential.review", async () => {
    const input = await readJson(request, credentialReviewInput, 8_000), auth = await authenticate();
    const patient = await patientContext(auth, input.careRecipientId, "access.manage", true);
    const { data, error } = await auth.client.rpc("review_professional_credential", {
      p_patient: patient.id, p_subject: input.subjectId, p_expected: input.expectedRevision,
      p_outcome: input.outcome, p_note: input.note, p_key: input.idempotencyKey,
    });
    if (error?.code === "PT409") throw new ApiError("VERSION_CONFLICT", "Os dados ou a intenção da conferência mudaram. Consulte a versão atual antes de registrar outra conferência.", 409);
    if (error) databaseError(error);
    return NextResponse.json({ data: credentialReviewResult.parse(data) }, { headers: { "Cache-Control": "private, no-store" } });
  });
}
