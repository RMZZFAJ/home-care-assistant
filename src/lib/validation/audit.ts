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
});
export type AuditPage = z.infer<typeof auditPageSchema>;
export function parseAuditPage(value: unknown): AuditPage {
  const parsed = auditPageSchema.safeParse(value);
  if (!parsed.success) throw new Error("A resposta da consulta do histórico não pôde ser lida. Atualize esta seção.");
  return parsed.data;
}
