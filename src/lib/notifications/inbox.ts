import { z } from "zod";

const optionalId = z.string().uuid().nullish().transform(value => value ?? undefined);
const rowSchema = z.object({
  id: z.string().uuid(), care_recipient_id: z.string().uuid(), document_id: optionalId, requisition_id: optionalId,
  consumption_report_id: optionalId, reminder_id: optionalId, alert_event_id: optionalId,
  event_key: z.string().nullish().transform(value => value ?? undefined), silent: z.boolean(),
  state: z.string(), channel: z.string(), seen_at: z.string().datetime({ offset: true }).nullable(), created_at: z.string().datetime({ offset: true }),
  operational_documents: z.object({ code: z.string().nullable(), type: z.string(), status: z.string().optional() }).nullable(),
  document_events: z.object({ action: z.string() }).nullable(),
});
const pageSchema = z.object({
  data: z.array(rowSchema).max(100), total: z.number().int().nonnegative(), unreadCount: z.number().int().nonnegative(),
  page: z.number().int().positive(), pageSize: z.number().int().min(1).max(100),
  availability: z.enum(["ready", "patient_context_required"]), careRecipientId: z.string().uuid().optional(),
}).superRefine((page, context) => {
  if (page.data.length > page.pageSize || page.data.length > page.total ||
      (page.availability === "ready" && (!page.careRecipientId || page.data.some(row => row.care_recipient_id !== page.careRecipientId))) ||
      (page.availability === "patient_context_required" && (page.data.length > 0 || page.total > 0 || page.unreadCount > 0)))
    context.addIssue({ code: "custom", message: "Inconsistent inbox page" });
});
export type InboxNotification = z.infer<typeof rowSchema>;
export type InboxPage = z.infer<typeof pageSchema>;
export function parseInboxPage(value: unknown, expectedPatient?: string): InboxPage {
  const result = pageSchema.safeParse(value);
  if (!result.success || (expectedPatient && result.data.availability === "ready" && result.data.careRecipientId !== expectedPatient))
    throw new Error("A resposta da consulta de notificações não pôde ser lida. Consulte novamente.");
  return result.data;
}
