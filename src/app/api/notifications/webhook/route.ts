import { NextResponse } from "next/server";
import { api, ApiError, boundedText, rpc } from "@/lib/server/api";
import { createWorkerClient } from "@/lib/server/service-client";
import {
  metaInbound,
  metaStatuses,
  secretMatches,
  verifyMetaSignature,
} from "@/lib/notifications/webhook";
import { tokenHash } from "@/lib/notifications/flows";
import { parseConsumptionMessage } from "@/lib/notifications/consumption-parser";

export async function GET(request: Request) {
  return api("notification.webhook.verify", async () => {
    const params = new URL(request.url).searchParams;
    if (
      params.get("hub.mode") !== "subscribe" ||
      !secretMatches(
        params.get("hub.verify_token"),
        process.env.META_WEBHOOK_VERIFY_TOKEN,
      )
    )
      throw new ApiError("FORBIDDEN", "Verificação inválida.", 403);
    const challenge = params.get("hub.challenge");
    if (!challenge || !/^\d{1,100}$/.test(challenge))
      throw new ApiError("VALIDATION_ERROR", "Desafio inválido.");
    return new Response(challenge, {
      headers: { "content-type": "text/plain" },
    });
  });
}
export async function POST(request: Request) {
  return api("notification.webhook.receive", async () => {
    const body = await boundedText(request, 100_000);
    if (
      !verifyMetaSignature(
        body,
        request.headers.get("x-hub-signature-256"),
        process.env.META_APP_SECRET,
      )
    )
      throw new ApiError("FORBIDDEN", "Assinatura inválida.", 403);
    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      throw new ApiError("INVALID_JSON", "Evento inválido.");
    }
    const statuses = metaStatuses(payload);
    if (!statuses) throw new ApiError("VALIDATION_ERROR", "Evento inválido.");
    const client = createWorkerClient();
    for (const status of statuses) {
      await rpc(client, "notification_webhook", {
        p_provider_reference: status.providerReference,
        p_state: status.state,
        p_notification_id: status.notificationId ?? null,
      });
      if (status.errorCode)
        await rpc(client, "notification_safe_failure", {
          p_reference: status.providerReference,
          p_code: status.errorCode,
        });
    }
    const messages = metaInbound(payload) ?? [];
    for (const message of messages) {
      const button =
        message.button?.payload ?? message.interactive?.button_reply.id;
      if (button?.startsWith("HCA_ACCEPT:")) {
        await rpc(client, "accept_whatsapp_receipt", {
          p_provider_id: message.id,
          p_phone: message.from,
          p_hash: tokenHash(button.slice(11)),
        });
        continue;
      }
      if (button?.startsWith("HCA_SCIENCE:")) {
        await rpc(client, "confirm_whatsapp_science", { p_provider_id: message.id, p_phone: message.from, p_hash: tokenHash(button.slice(12)) });
        continue;
      }
      if (button?.startsWith("HCA_NO_ISSUES:")) {
        await rpc(client, "acknowledge_no_issues", { p_provider_id: message.id, p_phone: message.from, p_hash: tokenHash(button.slice("HCA_NO_ISSUES:".length)) });
        continue;
      }
      if (message.type === "text" && message.text?.body) {
        const context = (await rpc(client, "inbound_report_context", {
          p_phone: message.from,
        })) as {
          catalog: Parameters<typeof parseConsumptionMessage>[1];
        } | null;
        if (!context) continue;
        const parsed = parseConsumptionMessage(
          message.text.body,
          context.catalog,
        );
        await rpc(client, "ingest_whatsapp_report", {
          p_provider_id: message.id,
          p_phone: message.from,
          p_text: message.text.body,
          p_lines: parsed.needsReview ? [] : parsed.lines,
          p_kind: parsed.kind,
        });
      }
    }
    return NextResponse.json({
      received: true,
      processed: statuses.length + messages.length,
    });
  });
}
