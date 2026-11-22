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
  unread: z.boolean(), surface: z.enum(["bell", "center"]),
  availability: z.enum(["ready", "patient_context_required"]), careRecipientId: z.string().uuid().optional(),
}).superRefine((page, context) => {
  const expectedLength = Math.min(page.pageSize, Math.max(0, page.total - (page.page - 1) * page.pageSize));
  if (page.data.length !== expectedLength || new Set(page.data.map(row => row.id)).size !== page.data.length ||
      (page.unread && page.data.some(row => row.seen_at !== null)) ||
      (page.surface === "bell" && page.data.some(row => row.silent)) ||
      (page.availability === "ready" && (!page.careRecipientId || page.data.some(row => row.care_recipient_id !== page.careRecipientId))) ||
      (page.availability === "patient_context_required" && (page.data.length > 0 || page.total > 0 || page.unreadCount > 0)))
    context.addIssue({ code: "custom", message: "Inconsistent inbox page" });
});
export type InboxNotification = z.infer<typeof rowSchema>;
export type InboxPage = z.infer<typeof pageSchema>;
export type InboxQuery = Pick<InboxPage, "page" | "pageSize" | "unread" | "surface">;
export function parseInboxPage(value: unknown, expectedPatient?: string, expectedQuery?: InboxQuery): InboxPage {
  const result = pageSchema.safeParse(value);
  if (!result.success || (expectedPatient && result.data.availability === "ready" && result.data.careRecipientId !== expectedPatient) ||
      (expectedQuery && Object.entries(expectedQuery).some(([key, value]) => result.data[key as keyof InboxQuery] !== value)))
    throw new Error("A resposta da consulta de notificações não pôde ser lida. Consulte novamente.");
  return result.data;
}
