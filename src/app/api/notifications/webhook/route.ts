import { NextResponse } from "next/server";
import { api, ApiError, boundedText, rpc } from "@/lib/server/api";
import { createWorkerClient } from "@/lib/server/service-client";
import { metaStatuses, secretMatches, verifyMetaSignature } from "@/lib/notifications/webhook";

export async function GET(request: Request) {
  return api("notification.webhook.verify", async () => {
    const params = new URL(request.url).searchParams;
    if (params.get("hub.mode") !== "subscribe" || !secretMatches(params.get("hub.verify_token"), process.env.META_WEBHOOK_VERIFY_TOKEN)) throw new ApiError("FORBIDDEN", "Verificação inválida.", 403);
    const challenge = params.get("hub.challenge");
    if (!challenge || !/^\d{1,100}$/.test(challenge)) throw new ApiError("VALIDATION_ERROR", "Desafio inválido.");
    return new Response(challenge, { headers: { "content-type": "text/plain" } });
  });
}
export async function POST(request: Request) {
  return api("notification.webhook.receive", async () => {
    const body = await boundedText(request, 100_000);
    if (!verifyMetaSignature(body, request.headers.get("x-hub-signature-256"), process.env.META_APP_SECRET)) throw new ApiError("FORBIDDEN", "Assinatura inválida.", 403);
    let payload: unknown;
    try { payload = JSON.parse(body); } catch { throw new ApiError("INVALID_JSON", "Evento inválido."); }
    const statuses = metaStatuses(payload);
    if (!statuses) throw new ApiError("VALIDATION_ERROR", "Evento inválido.");
    const client = createWorkerClient();
    for (const status of statuses) await rpc(client, "notification_webhook", { p_provider_reference: status.providerReference, p_state: status.state, p_notification_id: status.notificationId ?? null });
    return NextResponse.json({ received: true, processed: statuses.length });
  });
}
