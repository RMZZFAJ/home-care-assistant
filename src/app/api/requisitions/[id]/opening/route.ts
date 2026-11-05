import { NextResponse } from "next/server";
import { api, authenticate, parseUuid, rpc } from "@/lib/server/api";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return api("requisition.opening.context", async () => {
    const auth = await authenticate();
    return NextResponse.json({ data: await rpc(auth.client, "requisition_opening_context", { p_id: parseUuid((await context.params).id) }) }, { headers: { "cache-control": "private, no-store" } });
  });
}
