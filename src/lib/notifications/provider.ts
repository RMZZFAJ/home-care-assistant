import { z } from "zod";
import {
  namedBody,
  templateButtons,
  type TemplateDefinition,
} from "./template-registry";

export type NotificationJob = {
  id: string;
  channel: string;
  destination: string | null;
  requisition_id: string | null;
  alert_event_id?: string | null;
  document_id?: string | null;
  code?: string;
  documentType?: string;
  acceptanceToken?: string;
  attachment?: { bytes: Uint8Array; filename: string };
  event_key?: string;
  template?: TemplateDefinition;
  templateValues?: Record<string, string | undefined>;
  preparationError?: string;
  urlSuffix?: string;
  consumption_report_id?: string | null;
  reminder_id?: string | null;
};
export type DeliveryResult = {
  state: "accepted" | "delivered" | "pending" | "failed" | "uncertain";
  providerReference?: string;
  error?: string;
};
export interface NotificationProvider {
  send(job: NotificationJob): Promise<DeliveryResult>;
}
export type MetaConfiguration = {
  accessToken: string;
  phoneNumberId: string;
  graphVersion: string;
  template?: string;
  language: string;
  documentTemplate?: string;
  acceptanceTemplate?: string;
  urlButtonIndex?: string;
};

export function metaConfiguration(
  env: Record<string, string | undefined> = process.env,
): MetaConfiguration | null {
  if (env.NOTIFICATIONS_EXTERNAL_ENABLED !== "true") return null;
  const parsed = z
    .object({
      accessToken: z.string().min(1),
      phoneNumberId: z.string().regex(/^\d+$/),
      graphVersion: z.string().regex(/^v\d+\.\d+$/),
      template: z
        .string()
        .regex(/^[a-z0-9_]+$/)
        .optional(),
      language: z.string().regex(/^[a-z]{2}(?:_[A-Z]{2})?$/),
    })
    .safeParse({
      accessToken: env.META_WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: env.META_WHATSAPP_PHONE_NUMBER_ID,
      graphVersion: env.META_GRAPH_API_VERSION,
      template: env.META_WHATSAPP_TEMPLATE,
      language: env.META_WHATSAPP_TEMPLATE_LANGUAGE ?? "pt_BR",
    });
  return parsed.success
    ? {
        ...parsed.data,
        documentTemplate: env.META_WHATSAPP_DOCUMENT_TEMPLATE,
        acceptanceTemplate: env.META_WHATSAPP_ACCEPTANCE_TEMPLATE,
        urlButtonIndex: /^[0-9]$/.test(env.META_WHATSAPP_URL_BUTTON_INDEX ?? "")
          ? env.META_WHATSAPP_URL_BUTTON_INDEX
          : undefined,
      }
    : null;
}

/** Only the official Meta origin is allowed; templates omit patient/clinical data. */
export class MetaWhatsAppProvider implements NotificationProvider {
  constructor(
    private config: MetaConfiguration,
    private fetcher: typeof fetch = fetch,
  ) {}
  async send(job: NotificationJob): Promise<DeliveryResult> {
    if (job.preparationError)
      return { state: "pending", error: job.preparationError };
    if (job.template && job.template.approval !== "APPROVED")
      return { state: "pending", error: "TEMPLATE_NOT_APPROVED" };
    if (!job.template && !this.config.template)
      return { state: "pending", error: "EVENT_TEMPLATE_NOT_CONFIGURED" };
    if (!job.destination || !/^\+?[1-9]\d{7,14}$/.test(job.destination))
      return { state: "failed", error: "INVALID_DESTINATION" };
    try {
      let namedParameters: ReturnType<typeof namedBody> | undefined;
      let registeredButtons: ReturnType<typeof templateButtons> | undefined;
      if (job.template) {
        try {
          namedParameters = namedBody(job.template, job.templateValues ?? {});
          registeredButtons = templateButtons(
            job.template,
            job.urlSuffix ?? job.document_id ?? "",
            job.acceptanceToken,
          );
        } catch (error) {
          return {
            state: "pending",
            error:
              error instanceof Error
                ? error.message
                : "INVALID_TEMPLATE_CONTRACT",
          };
        }
        if (
          job.template.components.some(
            (part) => part.type === "HEADER" && part.format === "DOCUMENT",
          ) &&
          !job.attachment
        )
          return { state: "pending", error: "DOCUMENT_PREPARATION_FAILED" };
      }
      let mediaId: string | undefined;
      if (job.attachment) {
        if (
          !job.template &&
          (!this.config.documentTemplate ||
            !/^[a-z0-9_]+$/.test(this.config.documentTemplate))
        )
          return {
            state: "pending",
            error: "DOCUMENT_TEMPLATE_NOT_CONFIGURED",
          };
        const form = new FormData();
        form.set("messaging_product", "whatsapp");
        form.set("type", "application/pdf");
        form.set(
          "file",
          new Blob([new Uint8Array(job.attachment.bytes)], {
            type: "application/pdf",
          }),
          job.attachment.filename,
        );
        const uploaded = await this.fetcher(
          `https://graph.facebook.com/${this.config.graphVersion}/${this.config.phoneNumberId}/media`,
          {
            method: "POST",
            headers: { authorization: `Bearer ${this.config.accessToken}` },
            body: form,
            redirect: "error",
            signal: AbortSignal.timeout(15_000),
          },
        );
        if (!uploaded.ok)
          return {
            state:
              uploaded.status >= 500 || uploaded.status === 429
                ? "pending"
                : "failed",
            error: "MEDIA_UPLOAD_FAILED",
          };
        const parsed = z
          .object({ id: z.string().regex(/^\d+$/) })
          .safeParse(await uploaded.json().catch(() => null));
        if (!parsed.success)
          return { state: "pending", error: "MEDIA_UPLOAD_FAILED" };
        mediaId = parsed.data.id;
      }
      const response = await this.fetcher(
        `https://graph.facebook.com/${this.config.graphVersion}/${this.config.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${this.config.accessToken}`,
            "content-type": "application/json",
          },
          redirect: "error",
          signal: AbortSignal.timeout(15_000),
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: job.destination.replace(/^\+/, ""),
            type: "template",
            biz_opaque_callback_data: job.id,
            template: {
              name:
                job.template?.name ??
                (job.acceptanceToken && this.config.acceptanceTemplate
                  ? this.config.acceptanceTemplate
                  : mediaId
                    ? this.config.documentTemplate
                    : this.config.template),
              language: {
                code: job.template?.language ?? this.config.language,
              },
              components: [
                ...(mediaId
                  ? [
                      {
                        type: "header",
                        parameters: [
                          {
                            type: "document",
                            document: {
                              id: mediaId,
                              filename: job.attachment!.filename,
                            },
                          },
                        ],
                      },
                    ]
                  : []),
                {
                  type: "body",
                  parameters: namedParameters ?? [
                    {
                      type: "text",
                      text:
                        job.code ??
                        job.requisition_id ??
                        job.alert_event_id ??
                        job.id,
                    },
                  ],
                },
                ...(registeredButtons ??
                  (job.document_id && this.config.urlButtonIndex
                    ? [
                        {
                          type: "button",
                          sub_type: "url",
                          index: this.config.urlButtonIndex,
                          parameters: [{ type: "text", text: job.document_id }],
                        },
                      ]
                    : [])),
                ...(!registeredButtons && job.acceptanceToken
                  ? [
                      {
                        type: "button",
                        sub_type: "quick_reply",
                        index: "1",
                        parameters: [
                          {
                            type: "payload",
                            payload: "HCA_ACCEPT:" + job.acceptanceToken,
                          },
                        ],
                      },
                    ]
                  : []),
              ],
            },
          }),
        },
      );
      // A confirmed rejection can be retried. Server/transport uncertainty cannot.
      if (response.status === 429)
        return { state: "pending", error: "PROVIDER_RATE_LIMIT" };
      if (response.status >= 500)
        return { state: "uncertain", error: "PROVIDER_RESULT_UNCERTAIN" };
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        return {
          state: "failed",
          error:
            error?.error?.code === 130497
              ? "META_COUNTRY_RESTRICTED_130497"
              : "PROVIDER_REJECTED",
        };
      }
      const payload = await response.json().catch(() => null);
      const result = z
        .object({
          messages: z
            .array(z.object({ id: z.string().min(1).max(500) }))
            .min(1),
        })
        .safeParse(payload);
      if (!result.success)
        return { state: "uncertain", error: "PROVIDER_RESULT_UNCERTAIN" };
      return {
        state: "accepted",
        providerReference: result.data.messages[0].id,
      };
    } catch {
      return { state: "uncertain", error: "PROVIDER_RESULT_UNCERTAIN" };
    }
  }
}
