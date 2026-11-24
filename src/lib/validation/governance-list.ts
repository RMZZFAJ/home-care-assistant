import { z } from "zod";
import { governanceReviewReference } from "./governance-proposal";

const appliedPermission = z.object({
  actorId: z.uuid(), actorName: z.string().optional(), personId: z.uuid().nullable(),
  role: z.string(), capability: z.string(), before: z.boolean(), after: z.boolean(),
  familyReportingBefore: z.boolean().optional(), familyReportingAfter: z.boolean().optional(),
});

const changeSchema = z.object({
  id: z.string().uuid(), care_recipient_id: z.string().uuid(), kind: z.string().min(1),
  proposed: z.record(z.string(), z.unknown()), current: z.record(z.string(), z.unknown()).nullable(),
  proposed_by: z.string().uuid(), proposerName: z.string(), subjectName: z.string().nullable(), status: z.string().min(1),
  base_version: z.number().int().positive(), created_at: z.string().datetime({ offset: true }),
  decided_at: z.string().datetime({ offset: true }).nullable(),
  reviewerName: z.string().nullable().optional(), currentVersion: z.number().int().positive().optional(),
  reviewReference: governanceReviewReference.nullable().optional(),
  resolution: z.object({ invitationId: z.string().uuid().optional(), permission: appliedPermission.optional() }).passthrough().nullish().transform(value => value ?? undefined),
}).passthrough();
const pageSchema = z.object({
  changes: z.array(changeSchema).max(50), total: z.number().int().nonnegative(),
  careRecipientId: z.string().uuid(), page: z.number().int().positive(), pageSize: z.number().int().min(1).max(50),
  status: z.string(), kind: z.string(), query: z.string(),
});
export type GovernanceListQuery = Pick<z.infer<typeof pageSchema>, "careRecipientId" | "page" | "pageSize" | "status" | "kind" | "query">;
export type GovernanceProposal = z.infer<typeof changeSchema>;
export function parseGovernanceListRead(value: unknown, expected: GovernanceListQuery) {
  const result = pageSchema.safeParse(value);
  if (result.success) {
    const page = result.data;
    const length = Math.min(page.pageSize, Math.max(0, page.total - (page.page - 1) * page.pageSize));
    const matches = Object.entries(expected).every(([key, value]) => page[key as keyof GovernanceListQuery] === value);
    const rowsMatch = page.changes.every(row => row.care_recipient_id === expected.careRecipientId &&
      (!expected.kind || row.kind === expected.kind) &&
      (expected.status === "all" || (expected.status === "open" ? ["pending", "awaiting_acceptance"].includes(row.status) : row.status === expected.status)));
    if (matches && rowsMatch && page.changes.length === length && new Set(page.changes.map(row => row.id)).size === length) return page;
  }
  throw new Error("A resposta da consulta de propostas não pôde ser lida. Consulte novamente.");
}
