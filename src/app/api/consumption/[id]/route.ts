import { NextResponse } from "next/server";
import { api, authenticate, parseUuid, rpc } from "@/lib/server/api";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api("consumption.detail", async () => {
    const auth = await authenticate();
    return NextResponse.json({
      data: await rpc(auth.client, "consumption_report", {
        p_id: parseUuid((await context.params).id),
      }),
    });
  });
}
