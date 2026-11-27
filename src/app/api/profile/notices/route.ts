import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticate, parseUuid, readJson, rpc } from "@/lib/server/api";

const options = { headers: { "Cache-Control": "private, no-store" } };

export async function GET(request: Request) {
  return api("profile.notices.read", async () => {
    const params = new URL(request.url).searchParams;
    const key = params.has("attempt") ? parseUuid(params.get("attempt")) : null;
    const auth = await authenticate();
    return NextResponse.json({ data: await rpc(auth.client, "my_notice_preferences", { p_key: key }) }, options);
  });
}

export async function POST(request: Request) {
  return api("profile.notices.save", async () => {
    const input = await readJson(request, z.object({
      internal: z.boolean(), email: z.boolean(), whatsapp: z.boolean(),
      expectedVersion: z.number().int().min(0).max(2147483647), idempotencyKey: z.string().uuid(),
    }).strict());
    const auth = await authenticate();
    const data = await rpc(auth.client, "set_my_notice_preferences", {
      p_internal: input.internal, p_email: input.email, p_whatsapp: input.whatsapp,
      p_version: input.expectedVersion, p_key: input.idempotencyKey,
    });
    return NextResponse.json({ data }, options);
  });
}
