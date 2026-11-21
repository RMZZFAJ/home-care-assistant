import { NextResponse } from "next/server";
import { api, authenticate, readJson, rpc } from "@/lib/server/api";
import { arrivalReviewAttempt } from "@/lib/validation/purchase-arrival-review";

export async function POST(request: Request) {
  return api("purchase-arrivals.review.reconcile", async () => {
    const input = await readJson(request, arrivalReviewAttempt), auth = await authenticate();
    return NextResponse.json({ data: await rpc(auth.client, "settle_com_arrival_review", { p_patient: input.careRecipientId, p_key: input.key }) });
  });
}
