import { z } from "zod";

// Issued only after the native transactional RPC returns. This is a request
// receipt, not a document hash or an authorization decision from browser data.
export const supplyWriteConfirmationSchema = z
  .object({
    actorId: z.uuid(),
    idempotencyKey: z.uuid(),
    targetDocumentId: z.uuid().nullable(),
    expectedVersion: z.number().int().positive().nullable(),
    submissionKey: z.uuid().nullable(),
  })
  .strict();
export function supplyWriteConfirmation(
  actorId: string,
  input: {
    idempotencyKey: string;
    expectedVersion?: number;
    submissionKey?: string;
  },
  targetDocumentId: string | null = null,
) {
  return supplyWriteConfirmationSchema.parse({
    actorId,
    idempotencyKey: input.idempotencyKey,
    targetDocumentId,
    expectedVersion: input.expectedVersion ?? null,
    submissionKey: input.submissionKey ?? null,
  });
}
