import { z } from "zod";

export const governanceKinds = ["capability", "settings", "membership", "notification_rule", "administration"] as const;
export type ShortNameMode = "keep" | "change" | "remove";
export function shortNameChange(mode: string, value: string): { patientShortName?: string | null } {
  if (mode === "keep") return {};
  if (mode === "remove") return { patientShortName: null };
  if (mode !== "change") throw new Error("Escolha se deseja manter, alterar ou remover o nome curto.");
  const name = value.trim();
  if (!name || name.length > 60) throw new Error("Informe um nome curto de 1 a 60 caracteres, ou escolha remover.");
  return { patientShortName: name };
}
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
