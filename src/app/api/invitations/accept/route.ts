import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticatedIdentity, readJson, rpc } from "@/lib/server/api";

export async function POST(request: Request) {
  return api("invitation.accept", async () => {
    const { token } = await readJson(request, z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict());
    const auth = await authenticatedIdentity();
    const data = await rpc(auth.client, "accept_invitation", { p_token_hash: createHash("sha256").update(token).digest("hex") });
    return NextResponse.json({ data });
  });
}
