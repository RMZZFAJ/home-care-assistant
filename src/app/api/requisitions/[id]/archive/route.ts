import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticate, parseUuid, readJson, rpc } from "@/lib/server/api";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api("requisition.archive", async () => {
    const input = await readJson(request, z.object({ reason: z.string().trim().min(3).max(1000) }).strict());
    const auth = await authenticate();
    return NextResponse.json({ data: await rpc(auth.client, "archive_requisition", { p_id: parseUuid((await context.params).id), p_reason: input.reason }) });
  });
}
