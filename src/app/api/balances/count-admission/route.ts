import { api, ApiError, authenticate, patientContext, readJson, rpc } from "@/lib/server/api";
import { balanceCountAdmission, balanceCountAdmissionRequest } from "@/lib/validation/balances";

export async function POST(request: Request) {
  return api("balances.count.admission", async () => {
    const input = await readJson(request, balanceCountAdmissionRequest),
      auth = await authenticate();
    await patientContext(auth, input.careRecipientId, "bal.count", true);
    const data = balanceCountAdmission.parse(await rpc(auth.client, "admit_balance_count", {
      p_patient: input.careRecipientId, p_assignment: input.assignmentId, p_version: input.assignmentVersion,
      p_document: input.documentId, p_document_version: input.documentVersion,
    }));
    if (data.assignmentId !== input.assignmentId || data.assignmentVersion !== input.assignmentVersion ||
      data.documentId !== input.documentId || data.documentVersion !== input.documentVersion) {
      throw new ApiError("INTERNAL_ERROR", "O início confirmado pertence a outra contagem.", 500);
    }
    return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  });
}
