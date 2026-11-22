import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticate, parseUuid, readJson, rpc } from "@/lib/server/api";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api("documents.decision.reconcile", async () => {
    const input = await readJson(request, z.object({ key: z.uuid() }).strict());
    const auth = await authenticate(), id = parseUuid((await context.params).id);
    // Closes a missing technical key so a delayed original cannot apply later.
    // No unfinished form, business act, stock movement or document event is saved.
    return NextResponse.json({ data: await rpc(auth.client, "settle_document_decision", { p_document: id, p_key: input.key }) });
  });
}
