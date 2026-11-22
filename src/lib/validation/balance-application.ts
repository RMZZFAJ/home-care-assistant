import { z } from "zod";

const id = z.uuid(), version = z.number().int().positive().max(2147483647);
export const balanceApplicationBody = z.object({
  group: z.enum(["family", "supervisor"]),
  reviewReference: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();
const balance = z.discriminatedUnion("state", [
  z.object({ lineId: id, state: z.literal("known"), quantity: z.string().regex(/^-?\d+(?:\.\d+)?$/) }).strict(),
  z.object({ lineId: id, state: z.literal("restricted"), quantity: z.null() }).strict(),
]);
export const appliedBalanceApplicationFacts = z.object({
    state: z.literal("applied"), id, countVersion: version, documentVersion: version,
    appliedAt: z.iso.datetime({ offset: true }), actorId: id, actorName: z.string(),
    lines: z.array(balance).max(1000),
  }).strict();
export const balanceApplicationFacts = z.discriminatedUnion("state", [
  z.object({ state: z.literal("not_applied"), lines: z.array(z.never()).length(0) }).strict(),
  z.object({ state: z.literal("unavailable"), lines: z.array(z.never()).length(0) }).strict(),
  appliedBalanceApplicationFacts,
]);
export type BalanceApplicationFacts = z.infer<typeof balanceApplicationFacts>;
export const balanceApplicationPacket = z.object({
  action: z.literal("apply_balance"), idempotencyKey: id, expectedVersion: version,
  body: balanceApplicationBody,
}).strict();
export type BalanceApplicationPacket = z.infer<typeof balanceApplicationPacket>;
export const balanceApplicationQuery = z.object({
  careRecipientId: id, documentId: id, idempotencyKey: id,
  expectedVersion: z.coerce.number().int().positive().max(2147483647),
  group: balanceApplicationBody.shape.group,
  reviewReference: balanceApplicationBody.shape.reviewReference,
}).strict();
export const balanceApplicationResult = z.discriminatedUnion("state", [
  z.object({ state: z.literal("not_found"), documentId: id, idempotencyKey: id }).strict(),
  z.object({ state: z.literal("obsolete"), documentId: id, idempotencyKey: id, documentVersion: version }).strict(),
  z.object({ state: z.literal("found"), documentId: id, idempotencyKey: id, version,
    eventId: id, recordedAt: z.iso.datetime({ offset: true }),
    application: appliedBalanceApplicationFacts,
  }).strict(),
]);
