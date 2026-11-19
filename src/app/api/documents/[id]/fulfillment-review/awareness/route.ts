import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticate, parseUuid, readJson, rpc } from "@/lib/server/api";

type Context = { params: Promise<{ id: string }> };
const headers = { "Cache-Control": "private, no-store" };

async function decisionNotice(context: Context, acknowledge: string | null) {
  const { id } = await context.params;
  const auth = await authenticate();
  const data = await rpc(auth.client, "document_family_decision_notice", {
    p_document: parseUuid(id), p_acknowledge: acknowledge,
  });
  return NextResponse.json({ data }, { headers });
}

export async function GET(_request: Request, context: Context) {
  return api("documents.fulfillment.awareness.read", () => decisionNotice(context, null));
}

export async function POST(request: Request, context: Context) {
  return api("documents.fulfillment.awareness.record", async () => {
    const { reviewId } = await readJson(request, z.object({ reviewId: z.uuid() }).strict());
    return decisionNotice(context, reviewId);
  });
}
