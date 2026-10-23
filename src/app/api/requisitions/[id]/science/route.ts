import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticate, parseUuid, readJson, rpc } from "@/lib/server/api";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api("requisition.science", async () => {
    const input = await readJson(request, z.object({ mode: z.enum(["express", "app_visible"]), expectedVersion: z.number().int().positive() }).strict());
    const auth = await authenticate();
    return NextResponse.json({ data: await rpc(auth.client, "acknowledge_requisition", { p_id: parseUuid((await context.params).id), p_mode: input.mode, p_version: input.expectedVersion }) });
  });
}
