import { NextResponse } from "next/server";
import { api, authenticate, parseUuid, rpc } from "@/lib/server/api";

export async function GET(request: Request) {
  return api("balances.recount.read", async () => {
    const id = parseUuid(new URL(request.url).searchParams.get("documentId"));
    const auth = await authenticate();
    return NextResponse.json({
      data: await rpc(auth.client, "balance_recount_context", { p_id: id }),
    });
  });
}
