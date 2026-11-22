import { z } from "zod";
const id = z.uuid(), reason = z.string().trim().min(3).refine(value=>value.length<=1000,"A justificativa permite até 1.000 caracteres.");
export const balanceCommandSchema = z.object({ careRecipientId: id, idempotencyKey: id, expectedVersion: z.number().int().positive().nullable().default(null), command: z.discriminatedUnion("action", [
  z.object({ action: z.literal("configure"), body: z.object({ enabled: z.boolean(), timezone: z.string().min(1).max(80), weekday: z.number().int().min(0).max(6), shiftTypeId: id, professionalId: id.nullable().optional(), startsOn: z.iso.date(), reason }).strict() }).strict(),
  z.object({ action: z.literal("refresh"), body: z.object({}).strict() }).strict(),
  z.object({ action: z.enum(["request_deferral", "defer"]), body: z.object({ assignmentId: id, targetShiftId: id, reason }).strict() }).strict(),
  z.object({ action: z.literal("decide_deferral"), body: z.object({ id, approve: z.boolean(), reason }).strict() }).strict(),
  z.object({ action: z.literal("assign_recount"), body: z.object({ documentId: id, targetShiftId: id, targetShiftVersion: z.number().int().positive().max(2147483647), referenceHash: z.string().regex(/^[0-9a-f]{64}$/), reason }).strict() }).strict(),
  z.object({ action: z.literal("assign"), body: z.object({ cycleId: id, targetShiftId: id, reason }).strict() }).strict(),
]) }).strict();
export type BalanceCommand = z.infer<typeof balanceCommandSchema>["command"];

const revision = z.string().regex(/^\d{1,20}$/);
const countReferenceRead = z.object({
  careRecipientId: id,
  data: z.object({
    revision,
    quantities: z.record(z.string().min(1), z.string().regex(/^-?\d+(?:\.\d+)?$/)),
  }),
});
const countReviewRead = z.object({
  careRecipientId: id,
  data: z.object({
    referenceRevision: revision,
    eligibility: z.object({ available: z.boolean(), assignment: z.object({ id }).nullable() }),
  }),
});
export function parseBalanceCountReference(value: unknown, patientId: string) {
  const result = countReferenceRead.safeParse(value);
  if (!result.success || result.data.careRecipientId !== patientId) {
    throw new Error("A referência de estoque da contagem não pôde ser conferida. Consulte novamente; seus campos foram preservados.");
  }
  return result.data;
}
export function parseBalanceCountReview(value: unknown, patientId: string) {
  const result = countReviewRead.safeParse(value);
  if (!result.success || result.data.careRecipientId !== patientId) {
    throw new Error("A disponibilidade da contagem não pôde ser conferida. Consulte novamente; seus campos foram preservados.");
  }
  return result.data;
}
