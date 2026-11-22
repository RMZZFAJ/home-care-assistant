import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticate, parseUuid, readJson, rpc } from "@/lib/server/api";
import { metaConfiguration } from "@/lib/notifications/provider";
import { webPushConfiguration } from "@/lib/server/web-push";
const channels = () => ({ internal: true, push: process.env.WEB_PUSH_EXTERNAL_ENABLED === "true" && webPushConfiguration() !== null, whatsapp: metaConfiguration() !== null, email: false });
export async function GET(request: Request, context: { params: Promise<{ id: string; }>; }) {
  return api("documents.communications.read", async () => {
    const { id } = await context.params, page = new URL(request.url).searchParams.get("page") ?? "1";
    if (!/^[1-9]\d{0,5}$/.test(page)) throw new ApiError("VALIDATION_ERROR", "Escolha uma página válida.");
    const auth = await authenticate();
    return NextResponse.json({ data: await rpc(auth.client, "document_communications", { p_document: parseUuid(id), p_page: Number(page) }), channels: channels() }, { headers: { "Cache-Control": "private, no-store" } });
  });
}
export async function POST(request: Request, context: { params: Promise<{ id: string; }>; }) {
  return api("documents.communications.resend", async () => {
    const { id } = await context.params;
    const input = await readJson(request, z.object({ key: z.uuid(), originalId: z.uuid(), channel: z.enum(["internal", "push", "whatsapp", "email"]) }).strict());
    const auth = await authenticate();
    if (!channels()[input.channel]) {
      const recovered = await rpc(auth.client, "document_communication_recovery", { p_document: parseUuid(id), p_original: input.originalId, p_channel: input.channel, p_key: input.key });
      if (recovered) return NextResponse.json(recovered, { headers: { "Cache-Control": "private, no-store" } });
      throw new ApiError("WORKER_NOT_CONFIGURED", "Este canal está indisponível neste ambiente.", 409);
    }
    return NextResponse.json(await rpc(auth.client, "document_communication_resend", { p_document: parseUuid(id), p_original: input.originalId, p_channel: input.channel, p_key: input.key }), { headers: { "Cache-Control": "private, no-store" } });
  });
}
