import { NextResponse } from "next/server";
import {
  api,
  authenticate,
  patientContext,
  readJson,
  rpc,
} from "@/lib/server/api";
import { balancePreparationCommitSchema } from "@/lib/validation/balance-preparations";
export async function POST(request: Request) {
  return api("balances.preparation.commit", async () => {
    const input = await readJson(request, balancePreparationCommitSchema),
      auth = await authenticate();
    await patientContext(auth, input.careRecipientId, "bal.read", true);
    const data = await rpc(auth.client, "commit_balance_preparation", {
      p_patient: input.careRecipientId,
      p_purpose: input.purpose,
      p_target: input.targetResourceId,
      p_id: input.draftCommit.id,
      p_expected: input.draftCommit.revision,
      p_key: input.idempotencyKey,
      p_body: {
        command: input.command,
        referenceHash: input.referenceHash,
        expectedVersion: input.expectedVersion,
      },
    });
    return NextResponse.json(
      { data, persistence: "confirmed" },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
