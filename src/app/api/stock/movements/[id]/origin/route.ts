import { NextResponse } from "next/server";
import { api, authenticate, parseUuid, patientContext } from "@/lib/server/api";
import { stockMovementOrigin } from "@/lib/server/stock-origin";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api("stock.origin", async () => {
    const movementId = parseUuid((await context.params).id),
      auth = await authenticate();
    const patient = await patientContext(
      auth,
      new URL(request.url).searchParams.get("careRecipientId"),
    );
    return NextResponse.json(
      { data: await stockMovementOrigin(auth.client, patient.id, movementId) },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
