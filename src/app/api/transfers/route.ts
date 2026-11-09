import { NextResponse } from "next/server";
import {
  api,
  authenticate,
  patientContext,
  readJson,
  rpc,
} from "@/lib/server/api";
import { createTransferSchema } from "@/lib/validation/transfers";

export async function POST(request: Request) {
  return api("transfers.declare", async () => {
    const input = await readJson(request, createTransferSchema),
      auth = await authenticate();
    // Live read is required even when recovering one's confirmed declaration
    // after loss of write authority. The transactional RPC decides new writes.
    const patient = await patientContext(
      auth,
      input.careRecipientId,
      "ent.read",
    );
    return NextResponse.json({
      data: input.draftCommit ? (await rpc(auth.client,"commit_supply_draft",{p_id:input.draftCommit.id,p_expected:input.draftCommit.revision,p_target:null,p_key:input.idempotencyKey,p_body:{action:"declare_transfer",body:input.declaration}}) as {result:unknown}).result : await rpc(auth.client, "create_transfer_declaration", {
        p_patient: patient.id,
        p_body: input.declaration,
        p_key: input.idempotencyKey,
      }),
      persistence: "confirmed",
    });
  });
}
