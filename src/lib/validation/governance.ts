import { z } from "zod";

export const governanceKinds = ["capability", "settings", "membership", "notification_rule", "administration"] as const;
const commandResultSchema = z.object({ data: z.object({ id: z.string().uuid(), status: z.enum(["pending", "awaiting_acceptance", "applied", "rejected"]) }) });
export const governanceCommandConfirmed = (value: unknown) => commandResultSchema.safeParse(value).success;
export const governanceIntentFields = {
  idempotencyKey: z.string().uuid().optional(),
  expectedVersion: z.number().int().positive().optional(),
};
export const governanceQuerySchema = z.object({
  status: z.enum(["open", "all", "pending", "awaiting_acceptance", "applied", "rejected"]).default("open"),
  kind: z.enum(governanceKinds).optional(),
  query: z.string().trim().max(160).default(""),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
