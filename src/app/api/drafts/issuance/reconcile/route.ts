import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticate, patientContext, readJson, rpc, uuid } from "@/lib/server/api";
import { issuanceReconciliationReceipt } from "@/lib/validation/issuance-reconciliation";

const schema = z.object({
  careRecipientId: uuid,
  id: uuid,
  revision: z.number().int().min(1).max(2_147_483_647),
  idempotencyKey: uuid,
}).strict();

export async function POST(request: Request) {
  return api("drafts.issuance.reconcile", async () => {
    const input = await readJson(request, schema);
    const auth = await authenticate();
    const patient = await patientContext(auth, input.careRecipientId);
    const receipt = issuanceReconciliationReceipt.safeParse(await rpc(auth.client, "reconcile_document_issuance", {
      p_patient: patient.id,
      p_draft: input.id,
      p_revision: input.revision,
      p_key: input.idempotencyKey,
    }));
    if (!receipt.success)
      throw new ApiError("RECEIPT_PENDING", "Não foi possível confirmar o resultado da emissão.", 503);
    return NextResponse.json({ data: receipt.data }, { headers: { "Cache-Control": "no-store" } });
  });
}
