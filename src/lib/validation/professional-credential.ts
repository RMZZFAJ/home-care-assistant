import { z } from "zod";

export const credentialRevision = z.string().regex(/^[1-9][0-9]{0,18}$/)
  .pipe(z.string().refine(value => BigInt(value) <= BigInt("9223372036854775807")));
const instant = z.string().datetime({ offset: true });
const values = z.object({ fullName: z.string().nullable(), category: z.string().nullable(), registration: z.string().nullable(), state: z.string().nullable() }).strict();
export const credentialOutcome = z.enum(["checked", "not_confirmed"]);
export const credentialReviewInput = z.object({
  careRecipientId: z.string().uuid(), subjectId: z.string().uuid(),
  expectedRevision: credentialRevision, outcome: credentialOutcome,
  note: z.string().trim().max(600), idempotencyKey: z.string().uuid(),
}).strict().superRefine((value, context) => {
  if (value.outcome === "not_confirmed" && value.note.length < 6)
    context.addIssue({ code: "custom", path: ["note"], message: "Informe o que ainda precisa ser conferido." });
});
const review = z.object({ id: z.string().uuid(), credentialRevision, credentialHash: z.string().regex(/^[0-9a-f]{64}$/), declaration: values,
  outcome: credentialOutcome, note: z.string(), author: z.object({ id: z.string().uuid(), name: z.string(), role: z.enum(["admin", "family"]) }).strict(), recordedAt: instant,
}).strict();
export const credentialCursor = z.object({ beforeAt: instant, beforeId: z.string().uuid() }).strict();
export const professionalCredentialRead = z.object({
  subjectId: z.string().uuid(), patientId: z.string().uuid(),
  declaration: z.object({ revision: credentialRevision, changedAt: instant, valueHash: z.string().regex(/^[0-9a-f]{64}$/), values }).strict(),
  state: z.enum(["informed", "needs_review", "family_checked", "not_confirmed"]),
  latestReview: review.nullable(), externalValidation: z.null(), canReview: z.boolean(),
  history: z.array(review).max(20), nextCursor: credentialCursor.nullable(),
}).strict();
export const credentialReviewResult = z.object({ id: z.string().uuid(), credentialRevision, recordedAt: instant, replayed: z.boolean() }).strict();
export type CredentialReviewInput = z.infer<typeof credentialReviewInput>;
export type ProfessionalCredential = z.infer<typeof professionalCredentialRead>;
export type CredentialCursor = z.infer<typeof credentialCursor>;
export type CredentialReviewResult = z.infer<typeof credentialReviewResult>;
export function parseProfessionalCredential(value: unknown, patientId: string, subjectId: string): ProfessionalCredential {
  const result = professionalCredentialRead.safeParse(value);
  if (!result.success || result.data.patientId !== patientId || result.data.subjectId !== subjectId)
    throw new Error("A consulta da credencial não pôde ser conferida. Atualize esta seção.");
  return result.data;
}
