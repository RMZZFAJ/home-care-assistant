import { z } from "zod";

export const auditQuerySchema = z.object({
  query: z.string().trim().max(160).default(""),
  reference: z.string().uuid().optional(),
  action: z.string().trim().min(1).max(160).optional(),
  entityType: z.string().trim().min(1).max(80).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).refine(query => !query.from || !query.to || query.from <= query.to, { message: "A data inicial deve ser anterior ou igual à final.", path: ["to"] });
const auditPageSchema = z.object({
  data: z.array(z.object({
    id: z.string().uuid(), actor_id: z.string().uuid().nullable(), actor_name_current: z.string().nullable(),
    action: z.string(), entity_type: z.string(), entity_id: z.string().uuid().nullable(), metadata: z.record(z.string(), z.unknown()),
    created_at: z.string().datetime({ offset: true }),
  })),
  total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().min(1).max(100),
  actions: z.array(z.string()), entityTypes: z.array(z.string()),
}).superRefine((page, context) => {
  const length = Math.min(page.pageSize, Math.max(0, page.total - (page.page - 1) * page.pageSize));
  if (page.data.length !== length || new Set(page.data.map(row => row.id)).size !== length)
    context.addIssue({ code: "custom", message: "Incomplete audit page" });
});
export type AuditPage = z.infer<typeof auditPageSchema>;
export function parseAuditPage(value: unknown): AuditPage {
  const parsed = auditPageSchema.safeParse(value);
  if (!parsed.success) throw new Error("A resposta da consulta do histórico não pôde ser lida. Atualize esta seção.");
  return parsed.data;
}
const filterSchema = z.object({ query: z.string(), reference: z.string(), action: z.string(), entityType: z.string(), from: z.string(), to: z.string() });
const readSchema = auditPageSchema.safeExtend({ careRecipientId: z.string().uuid(), filters: filterSchema });
export type AuditFilters = z.infer<typeof filterSchema>;
export type AuditReadSelection = AuditFilters & { careRecipientId: string; page: number; pageSize: number };
export function parseAuditListRead(value: unknown, expected: AuditReadSelection) {
  const parsed = readSchema.safeParse(value);
  if (parsed.success) {
    const page = parsed.data;
    const filtersMatch = Object.entries(page.filters).every(([name, value]) => value === expected[name as keyof AuditFilters]);
    const rowsMatch = page.data.every(row => row.metadata.care_recipient_id === expected.careRecipientId &&
      (!expected.action || row.action === expected.action) && (!expected.entityType || row.entity_type === expected.entityType) &&
      (!expected.reference || row.id === expected.reference || row.entity_id === expected.reference));
    if (page.careRecipientId === expected.careRecipientId && page.page === expected.page && page.pageSize === expected.pageSize && filtersMatch && rowsMatch) return page;
  }
  throw new Error("A resposta da consulta do histórico não pôde ser lida. Atualize esta seção.");
}
