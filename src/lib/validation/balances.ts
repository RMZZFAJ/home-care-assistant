import { z } from "zod";
const id = z.uuid(), reason = z.string().trim().min(3).max(1000);
export const balanceCommandSchema = z.object({ careRecipientId: id, idempotencyKey: id, expectedVersion: z.number().int().positive().nullable().default(null), command: z.discriminatedUnion("action", [
  z.object({ action: z.literal("configure"), body: z.object({ enabled: z.boolean(), timezone: z.string().min(1).max(80), weekday: z.number().int().min(0).max(6), shiftTypeId: id, professionalId: id.nullable().optional(), startsOn: z.iso.date(), reason }).strict() }).strict(),
  z.object({ action: z.literal("refresh"), body: z.object({}).strict() }).strict(),
  z.object({ action: z.enum(["request_deferral", "defer"]), body: z.object({ assignmentId: id, targetShiftId: id, reason }).strict() }).strict(),
  z.object({ action: z.literal("decide_deferral"), body: z.object({ id, approve: z.boolean(), reason }).strict() }).strict(),
  z.object({ action: z.literal("assign_recount"), body: z.object({ documentId: id, targetShiftId: id, reason }).strict() }).strict(),
  z.object({ action: z.literal("assign"), body: z.object({ cycleId: id, targetShiftId: id, reason }).strict() }).strict(),
]) }).strict();
export type BalanceCommand = z.infer<typeof balanceCommandSchema>["command"];
