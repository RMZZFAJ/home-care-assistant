import { z } from "zod";
import type { DocumentSummary, DeliveryListItem } from "@/types/documents";

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const amount = z.string().regex(/^\d+(?:\.\d+)?$/);
const row = z.object({
  id: z.uuid(), version: z.number().int().positive(),
  type: z.enum(["REQ", "COM", "ENT", "BAL"]),
  code: z.string().min(1).nullable(), protocol: z.string().min(1).nullable(),
  status: z.string().min(1).max(80), created_at: z.string().datetime({ offset: true }),
  recipient_id: z.uuid().nullable(),
  fulfillment: z.object({ fulfilled: count, total: count })
    .refine(value => value.fulfilled <= value.total).nullable().optional(),
  task: z.object({ code: z.string(), label: z.string() }).nullable().optional(),
  document_lines: z.array(z.object({
    id: z.uuid(), fully_checked: z.boolean(), accepted_quantity: amount, quantity: amount,
  })).nullable().optional(),
}).passthrough();
const filters = z.object({
  search: z.string().nullable(), type: z.string().nullable(), status: z.string().nullable(),
  from: z.string().nullable(), to: z.string().nullable(),
});
const response = z.object({
  careRecipientId: z.uuid(), data: z.array(row), total: count,
  page: z.number().int().min(1).max(100000), pageSize: z.number().int().min(1).max(100),
  filters,
});
export type DocumentListScope = {
  careRecipientId: string; page: number; pageSize: number;
  search: string; type: string; status: string; from: string; to: string;
};
export function parseDocumentListRead(value: unknown, expected: DocumentListScope): {
  data: DocumentSummary[]; total: number; page: number; pageSize: number;
} {
  const parsed = response.safeParse(value);
  if (!parsed.success) throw new Error("A resposta da lista não pôde ser conferida. Consulte as fichas novamente.");
  const result = parsed.data;
  const length = Math.min(result.pageSize, Math.max(0, result.total - (result.page - 1) * result.pageSize));
  if (result.careRecipientId !== expected.careRecipientId || result.page !== expected.page || result.pageSize !== expected.pageSize
    || Object.entries(result.filters).some(([key, field]) => field !== (expected[key as keyof DocumentListScope].toString().trim() || null))
    || result.data.length !== length || new Set(result.data.map(item => item.id)).size !== result.data.length
    || (expected.type !== "" && result.data.some(item => item.type !== expected.type))) {
    throw new Error("A resposta recebida não corresponde à consulta das fichas. Consulte a lista novamente.");
  }
  return { ...result, data: result.data.map(item => ({ ...item, fulfillment: item.fulfillment ?? undefined, document_lines: item.document_lines ?? undefined })) };
}

const preservedName = z.string().refine(value => value.trim().length > 0).nullable();
const deliveryFacts = z.object({
  source: z.enum(["FAMILY", "CARE_TEAM"]).nullable(),
  destination: z.enum(["FAMILY", "CARE_TEAM"]).nullable(),
  recordedByName: preservedName, recipientName: preservedName,
  counterpartyName: preservedName, receivedByName: preservedName,
}).refine(value => value.source === null ? value.destination === null : value.destination !== null && value.destination !== value.source);
const deliveryResponse = response.extend({
  data: z.array(row.extend({
    type: z.literal("ENT"), deliverySummary: deliveryFacts,
    document_lines: z.array(z.object({ id: z.uuid(), fully_checked: z.boolean(), accepted_quantity: amount, quantity: amount })),
  })),
  filters: z.object({
    scope: z.enum(["own", "team"]),
    status: z.enum(["", "tasks", "transfer_pending", "transfer_ready", "pending_receipt", "disputed", "cancellation_pending", "confirmed", "cancelled", "administratively_closed"]),
  }).refine(value => value.status !== "tasks" || value.scope === "own"),
});
export type DeliveryListScope = { careRecipientId: string; scope: string; status: string; page: number; pageSize: number };
export function parseDeliveryListRead(value: unknown, expected: DeliveryListScope): {
  data: DeliveryListItem[]; total: number; page: number; pageSize: number;
} {
  const parsed = deliveryResponse.safeParse(value);
  if (!parsed.success) throw new Error("A resposta das entregas não pôde ser conferida. Consulte a lista novamente.");
  const result = parsed.data;
  const length = Math.min(result.pageSize, Math.max(0, result.total - (result.page - 1) * result.pageSize));
  if (result.careRecipientId !== expected.careRecipientId || result.page !== expected.page || result.pageSize !== expected.pageSize
    || result.filters.scope !== expected.scope || result.filters.status !== expected.status
    || result.data.length !== length || new Set(result.data.map(item => item.id)).size !== result.data.length
    || result.data.some(item => item.type !== "ENT")) {
    throw new Error("A resposta recebida não corresponde à consulta das entregas. Consulte a lista novamente.");
  }
  return { ...result, data: result.data.map(item => ({ ...item, fulfillment: item.fulfillment ?? undefined, document_lines: item.document_lines ?? undefined })) };
}
