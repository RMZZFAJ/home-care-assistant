import { NextResponse } from "next/server";
import { api, authenticate, readJson, rpc, parseUuid } from "@/lib/server/api";
import { supplyCommandSchema } from "@/lib/validation/documents";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  return api("documents.detail", async () => {
    const { id } = await context.params;
    const auth = await authenticate();
    return NextResponse.json({
      data: await rpc(auth.client, "operational_document", {
        p_id: parseUuid(id),
      }),
    });
  });
}
export async function POST(request: Request, context: Context) {
  return api("documents.command", async () => {
    const { id } = await context.params;
    const input = await readJson(request, supplyCommandSchema);
    const auth = await authenticate();
    return NextResponse.json({
      data: await rpc(auth.client, "supply_document_command", {
        p_id: parseUuid(id),
        p_action: input.action,
        p_body: input.body,
        p_key: input.idempotencyKey,
        p_version: input.expectedVersion,
      }),
      persistence: "confirmed",
    });
  });
}
