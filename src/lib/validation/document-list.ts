import { z } from "zod";
import type { DocumentSummary } from "@/types/documents";

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
