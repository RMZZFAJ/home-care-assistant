import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticate, parseQuery, readJson, rpc } from "@/lib/server/api";
import { verificationCodeSchema } from "@/lib/documents/public-verification";
const input = z.object({ code: verificationCodeSchema }).strict();
export async function GET(request: Request) {
  return api("verification.details", async () => {
    const query = parseQuery(input, Object.fromEntries(new URL(request.url).searchParams));
    const auth = await authenticate();
    return NextResponse.json({ data: await rpc(auth.client, "pdf_verification_details", { p_code: query.code, p_select_context: false }) }, { headers: { "Cache-Control": "private, no-store" } });
  });
}
export async function POST(request: Request) {
  return api("verification.context", async () => {
    const body = await readJson(request, input), auth = await authenticate();
    return NextResponse.json({ data: await rpc(auth.client, "pdf_verification_details", { p_code: body.code, p_select_context: true }) }, { headers: { "Cache-Control": "private, no-store" } });
  });
}
