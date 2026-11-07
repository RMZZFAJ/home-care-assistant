import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, readJson, rpc } from "@/lib/server/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  return api("invitation.preview", async () => {
    const { token } = await readJson(request, z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict());
    const client = await createSupabaseServerClient();
    if (!client) throw new ApiError("NOT_CONFIGURED", "Serviço de acesso indisponível.", 503);
    const data = await rpc(client, "invitation_preview", { p_token_hash: createHash("sha256").update(token).digest("hex") });
    return NextResponse.json({ data });
  });
}
