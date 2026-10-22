import { z } from "zod";

export type NotificationJob = { id: string; channel: string; destination: string | null; requisition_id: string | null; alert_event_id?: string | null };
export type DeliveryResult = { state: "accepted" | "delivered" | "pending" | "failed" | "uncertain"; providerReference?: string; error?: string };
export interface NotificationProvider { send(job: NotificationJob): Promise<DeliveryResult> }
export type MetaConfiguration = { accessToken: string; phoneNumberId: string; graphVersion: string; template: string; language: string };

export function metaConfiguration(env: Record<string, string | undefined> = process.env): MetaConfiguration | null {
  if (env.NOTIFICATIONS_EXTERNAL_ENABLED !== "true") return null;
  const parsed = z.object({ accessToken: z.string().min(1), phoneNumberId: z.string().regex(/^\d+$/), graphVersion: z.string().regex(/^v\d+\.\d+$/), template: z.string().regex(/^[a-z0-9_]+$/), language: z.string().regex(/^[a-z]{2}(?:_[A-Z]{2})?$/) }).safeParse({ accessToken: env.META_WHATSAPP_ACCESS_TOKEN, phoneNumberId: env.META_WHATSAPP_PHONE_NUMBER_ID, graphVersion: env.META_GRAPH_API_VERSION, template: env.META_WHATSAPP_TEMPLATE, language: env.META_WHATSAPP_TEMPLATE_LANGUAGE ?? "pt_BR" });
  return parsed.success ? parsed.data : null;
}

/** Only the official Meta origin is allowed; templates omit patient/clinical data. */
export class MetaWhatsAppProvider implements NotificationProvider {
  constructor(private config: MetaConfiguration, private fetcher: typeof fetch = fetch) {}
  async send(job: NotificationJob): Promise<DeliveryResult> {
    if (!job.destination || !/^\+?[1-9]\d{7,14}$/.test(job.destination)) return { state: "failed", error: "INVALID_DESTINATION" };
    try {
      const response = await this.fetcher(`https://graph.facebook.com/${this.config.graphVersion}/${this.config.phoneNumberId}/messages`, {
        method: "POST", headers: { authorization: `Bearer ${this.config.accessToken}`, "content-type": "application/json" }, redirect: "error", signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({ messaging_product: "whatsapp", to: job.destination.replace(/^\+/, ""), type: "template", biz_opaque_callback_data: job.id, template: { name: this.config.template, language: { code: this.config.language }, components: [{ type: "body", parameters: [{ type: "text", text: job.requisition_id ?? job.alert_event_id ?? job.id }] }] } }),
      });
      // A confirmed rejection can be retried. Server/transport uncertainty cannot.
      if (response.status === 429) return { state: "pending", error: "PROVIDER_RATE_LIMIT" };
      if (response.status >= 500) return { state: "uncertain", error: "PROVIDER_RESULT_UNCERTAIN" };
      if (!response.ok) return { state: "failed", error: "PROVIDER_REJECTED" };
      const payload = await response.json().catch(() => null);
      const result = z.object({ messages: z.array(z.object({ id: z.string().min(1).max(500) })).min(1) }).safeParse(payload);
      if (!result.success) return { state: "uncertain", error: "PROVIDER_RESULT_UNCERTAIN" };
      return { state: "accepted", providerReference: result.data.messages[0].id };
    } catch { return { state: "uncertain", error: "PROVIDER_RESULT_UNCERTAIN" }; }
  }
}
