import { z } from "zod";

export const scheduleHistoryQuerySchema = z.object({
  query: z.string().trim().max(160).default(""), action: z.string().trim().min(1).max(160).optional(),
  reference: z.string().uuid().optional(), from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).refine(query => !query.from || !query.to || query.from <= query.to, { message: "A data inicial deve ser anterior ou igual à final.", path: ["to"] });
const filters = z.object({ query: z.string(), action: z.string(), reference: z.string(), from: z.string(), to: z.string() });
const event = z.object({
  id: z.string().uuid(), care_recipient_id: z.string().uuid(), series_id: z.string().uuid().nullable(), shift_id: z.string().uuid().nullable(), professional_id: z.string().uuid().nullable(),
  actor_id: z.string().uuid(), actor_name_snapshot: z.string().nullable(), action: z.string(), reason: z.string(), created_at: z.string().datetime({ offset: true }),
});
const readSchema = z.object({
  data: z.array(event).max(100), total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().min(1).max(100),
  careRecipientId: z.string().uuid(), readerId: z.string().uuid(), scope: z.enum(["team", "own"]), filters,
});
export type ScheduleHistoryFilters = z.infer<typeof filters>;
export type ScheduleHistorySelection = ScheduleHistoryFilters & { careRecipientId: string; readerId: string; page: number; pageSize: number };
export function parseScheduleHistoryRead(value: unknown, expected: ScheduleHistorySelection) {
  const result = readSchema.safeParse(value);
  if (result.success) {
    const page = result.data, length = Math.min(page.pageSize, Math.max(0, page.total - (page.page - 1) * page.pageSize));
    const sameFilters = Object.entries(page.filters).every(([key, value]) => value === expected[key as keyof ScheduleHistoryFilters]);
    const sameRows = page.data.every(row => row.care_recipient_id === expected.careRecipientId &&
      (page.scope !== "own" || row.professional_id === expected.readerId) && (!expected.action || row.action === expected.action) &&
      (!expected.reference || [row.id, row.shift_id, row.series_id].includes(expected.reference)));
    if (page.careRecipientId === expected.careRecipientId && page.readerId === expected.readerId && page.page === expected.page && page.pageSize === expected.pageSize &&
        sameFilters && sameRows && page.data.length === length && new Set(page.data.map(row => row.id)).size === length) return page;
  }
  throw new Error("A resposta da consulta do histórico da agenda não pôde ser lida. Consulte novamente.");
}
