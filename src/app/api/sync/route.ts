import { NextResponse } from "next/server";
import { api, authenticate, rpc } from "@/lib/server/api";

export async function GET() {
  return api("workspace.sync", async () => {
    const { client } = await authenticate();
    const [revision, activeContext] = await Promise.all([
      rpc(client, "workspace_revision"), rpc(client, "my_active_context"),
    ]);
    return NextResponse.json({ revision: String(revision), activeContext });
  });
}
