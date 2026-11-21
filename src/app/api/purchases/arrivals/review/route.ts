import { NextResponse } from "next/server";
import { ApiError, api, authenticate, readJson, rpc } from "@/lib/server/api";
import { arrivalReviewBatch, arrivalReviewQueueQuery } from "@/lib/validation/purchase-arrival-review";

export async function GET(request: Request) {
  return api("purchase-arrivals.review.read", async () => {
    const parsed = arrivalReviewQueueQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Confira a referência das chegadas.");
    const query = parsed.data, auth = await authenticate();
    const data = query.arrivalId
      ? await rpc(auth.client, "com_unlinked_arrival_review", { p_patient: query.careRecipientId, p_arrival: query.arrivalId })
      : await rpc(auth.client, "com_arrival_review_queue", {
        p_patient: query.careRecipientId, p_document: query.documentId ?? null,
        p_before_at: query.beforeAt ?? null, p_before_id: query.beforeId ?? null,
      });
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
  });
}

export async function POST(request: Request) {
  return api("purchase-arrivals.review.confirm", async () => {
    const input = await readJson(request, arrivalReviewBatch, 640_000), auth = await authenticate();
    return NextResponse.json({ data: await rpc(auth.client, "execute_com_arrival_review", {
      p_patient: input.careRecipientId, p_key: input.key, p_entries: input.entries,
    }) });
  });
}
