import { NextResponse } from "next/server";
import { api, authenticate, parseUuid, rpc } from "@/lib/server/api";
export async function GET(request: Request, context: { params: Promise<{ id: string; }>; }) {
  return api("documents.progress.location", async () => {
    const { id } = await context.params;
    const auth = await authenticate();
    const data = await rpc(auth.client, "document_progress_location", { p_document: parseUuid(id), p_note: parseUuid(new URL(request.url).searchParams.get("record") ?? "") });
    return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  });
}
