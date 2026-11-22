import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticate, parseUuid, readJson, rpc } from "@/lib/server/api";
import { documentDecisionIntention } from "@/lib/validation/document-decisions";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api("documents.decision", async () => {
    const input = await readJson(request, z.object({ key: z.uuid(), intention: documentDecisionIntention }).strict());
    const auth = await authenticate(), id = parseUuid((await context.params).id);
    return NextResponse.json({ data: await rpc(auth.client, "execute_document_decision", { p_document: id, p_key: input.key, p_intention: input.intention }) });
  });
}
