import { stockPreparationContext } from "@/lib/server/stock-preparation";
import { NextResponse } from "next/server";
import { api, authenticate, readJson, rpc } from "@/lib/server/api";
import { stockPreparationCommitSchema } from "@/lib/validation/stock-preparations";
export async function POST(request: Request) {
  return api("stock.preparation.commit", async () => {
    const input = await readJson(request, stockPreparationCommitSchema),
      auth = await authenticate();
    // Read authority permits recovery of an already committed personal result.
    // The database revalidates manage authority for every new physical command.
    await stockPreparationContext(auth, input.careRecipientId);
    const data = await rpc(auth.client, "commit_stock_movement_preparation", {
      p_patient: input.careRecipientId,
      p_id: input.draftCommit.id,
      p_expected: input.draftCommit.revision,
      p_key: input.idempotencyKey,
      p_body: { command: input.command, referenceHash: input.referenceHash },
    });
    return NextResponse.json(
      { data, persistence: "confirmed" },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
