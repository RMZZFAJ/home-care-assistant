import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticate, parseUuid, readJson, rpc } from "@/lib/server/api";
export async function POST(request: Request, context: { params: Promise<{ id: string ;}> ;}) {
  return api("documents.fulfillment.review", async () => {
    const { id } = await context.params, input = await readJson(request, z.object({ key: z.uuid(), lineId: z.uuid(), decision: z.enum(["partial", "complete"]), reason: z.string().max(1000), version: z.number().int().positive() }).strict()), auth = await authenticate();
    return NextResponse.json(await rpc(auth.client, "review_request_fulfillment", { p_document: parseUuid(id), p_line: input.lineId, p_decision: input.decision, p_reason: input.reason, p_key: input.key, p_version: input.version }), { headers: { "Cache-Control": "private, no-store" } });
  });
}
