import { z } from "zod";

const acknowledgement = z.object({
  id: z.string().uuid(), actorId: z.string().uuid(), actorName: z.string(),
  recordedAt: z.string().datetime({ offset: true }),
}).strict();
export const cancellationAwarenessSchema = z.object({
  documentId: z.string().uuid(), careRecipientId: z.string().uuid(),
  state: z.enum(["not_cancelled", "unavailable", "pending", "acknowledged"]),
  cancellation: z.object({
    id: z.string().uuid(), version: z.number().int().positive(), actorName: z.string(),
    recordedAt: z.string().datetime({ offset: true }), reason: z.string(),
  }).strict().nullable(),
  eligible: z.boolean(), firstAcknowledgement: acknowledgement.nullable(),
  personalAcknowledgement: acknowledgement.nullable(),
  totalAcknowledgements: z.number().int().nonnegative(),
}).strict().superRefine((value, ctx) => {
  const hasCancellation = value.cancellation !== null;
  if ((value.state === "pending" || value.state === "acknowledged") !== hasCancellation
    || (value.state === "acknowledged") !== (value.firstAcknowledgement !== null)
    || (value.totalAcknowledgements > 0) !== (value.firstAcknowledgement !== null)
    || (value.personalAcknowledgement !== null && value.totalAcknowledgements === 0)
    || (!hasCancellation && value.eligible))
    ctx.addIssue({ code: "custom", message: "A consulta não confirmou a ciência deste cancelamento." });
});
export type CancellationAwareness = z.infer<typeof cancellationAwarenessSchema>;
export const cancellationAcknowledgementSchema = z.object({
  cancellationEventId: z.string().uuid(), idempotencyKey: z.string().uuid(),
}).strict();

export function parseCancellationAwareness(value: unknown, documentId: string, userId: string) {
  const parsed = cancellationAwarenessSchema.safeParse(value);
  if (!parsed.success) throw new Error("A consulta não confirmou a ciência deste cancelamento.");
  const result = parsed.data;
  if (result.documentId !== documentId || (result.personalAcknowledgement && result.personalAcknowledgement.actorId !== userId))
    throw new Error("A consulta não confirmou a ciência deste cancelamento.");
  return result;
}
