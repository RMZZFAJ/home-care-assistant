import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticate, readJson, rpc } from "@/lib/server/api";

export async function GET() {
  return api("profile.science.read", async () => {
    const auth = await authenticate();
    return NextResponse.json({ data: await rpc(auth.client, "my_requisition_science_preference") });
  });
}
export async function POST(request: Request) {
  return api("profile.science.save", async () => {
    const input = await readJson(request, z.object({ mode: z.enum(["manual", "dialog", "tacit"]), consent: z.boolean(), expectedVersion: z.number().int().min(0).max(2147483647), idempotencyKey: z.string().uuid() }).strict()
      .refine(value => value.mode === "manual" || value.consent, { path: ["consent"], message: "Confirme sua escolha antes de salvar." }));
    const auth = await authenticate();
    return NextResponse.json({ data: await rpc(auth.client, "set_requisition_science_preference", { p_mode: input.mode, p_consent: input.consent, p_version: input.expectedVersion, p_key: input.idempotencyKey }) });
  });
}
