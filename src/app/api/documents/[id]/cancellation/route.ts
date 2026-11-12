import { NextResponse } from "next/server";
import { api, ApiError, authenticate, parseUuid, readJson, rpc } from "@/lib/server/api";
import { cancellationAcknowledgementSchema, parseCancellationAwareness } from "@/lib/documents/cancellation-awareness";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  return api("documents.cancellation.read", async () => {
    const id = parseUuid((await context.params).id), auth = await authenticate();
    const raw = await rpc(auth.client, "document_cancellation_awareness", { p_id: id });
    return NextResponse.json({ data: parseCancellationAwareness(raw, id, auth.userId) });
  });
}
export async function POST(request: Request, context: Context) {
  return api("documents.cancellation.acknowledge", async () => {
    const id = parseUuid((await context.params).id);
    const input = await readJson(request, cancellationAcknowledgementSchema);
    const auth = await authenticate();
    const raw = await rpc(auth.client, "acknowledge_document_cancellation", {
      p_id: id, p_event: input.cancellationEventId, p_key: input.idempotencyKey,
    });
    const data = parseCancellationAwareness(raw, id, auth.userId);
    if (!data.personalAcknowledgement || data.cancellation?.id !== input.cancellationEventId)
      throw new ApiError("PERSISTENCE_UNCONFIRMED", "Consulte sua ciência deste cancelamento antes de repetir a mesma tentativa.", 503, true);
    return NextResponse.json({ data, persistence: "confirmed" });
  });
}
