import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticate, parseUuid, readJson, rpc } from "@/lib/server/api";

const options = { headers: { "Cache-Control": "private, no-store" } };

export async function GET(request: Request) {
  return api("profile.science.read", async () => {
    const params = new URL(request.url).searchParams;
    const auth = await authenticate();
    const data = params.has("attempt")
      ? await rpc(auth.client, "my_science_preference_attempt", { p_key: parseUuid(params.get("attempt")) })
      : await rpc(auth.client, "my_requisition_science_preference");
    return NextResponse.json({ data }, options);
  });
}
export async function POST(request: Request) {
  return api("profile.science.save", async () => {
    const input = await readJson(request, z.object({ mode: z.enum(["manual", "dialog", "tacit"]), consent: z.boolean(), expectedVersion: z.number().int().min(0).max(2147483647), idempotencyKey: z.string().uuid() }).strict()
      .refine(value => value.mode === "manual" || value.consent, { path: ["consent"], message: "Confirme sua escolha antes de salvar." }));
    const auth = await authenticate();
    const saved = await rpc(auth.client, "set_requisition_science_preference", { p_mode: input.mode, p_consent: input.consent, p_version: input.expectedVersion, p_key: input.idempotencyKey });
    return NextResponse.json({ data: { ...saved, attemptId: input.idempotencyKey } }, options);
  });
}
