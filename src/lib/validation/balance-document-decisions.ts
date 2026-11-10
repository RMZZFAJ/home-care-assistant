import { z } from "zod";
import { draftCommitSchema } from "./creation-drafts";
import { balanceDocumentPurpose } from "./supply-drafts";

const id = z.uuid(),
  version = z.number().int().positive().max(2147483647),
  hash = z.string().regex(/^[0-9a-f]{64}$/);
const scope = {
  careRecipientId: id,
  documentId: id,
  expectedVersion: version,
  idempotencyKey: id,
  draftCommit: draftCommitSchema,
};
const reviewBody = z
  .object({
    group: z.enum(["family", "supervisor"]),
    comment: z
      .string()
      .refine(
        (value) => value.length <= 2000,
        "Seu parecer permite até 2.000 caracteres.",
      ),
    reviewReference: hash,
  })
  .strict();
const recountBody = z
  .object({
    documentId: id,
    targetShiftId: id,
    targetShiftVersion: version,
    referenceHash: hash,
    reason: z
      .string()
      .trim()
      .min(3, "Informe uma justificativa com pelo menos 3 caracteres.")
      .refine(
        (value) => value.length <= 1000,
        "A justificativa permite até 1.000 caracteres.",
      ),
  })
  .strict();
export const balanceDocumentDecisionSchema = z
  .discriminatedUnion("purpose", [
    z
      .object({
        ...scope,
        purpose: z.literal("review_family"),
        body: reviewBody.extend({ group: z.literal("family") }),
      })
      .strict(),
    z
      .object({
        ...scope,
        purpose: z.literal("review_supervisor"),
        body: reviewBody.extend({ group: z.literal("supervisor") }),
      })
      .strict(),
    z
      .object({
        ...scope,
        purpose: z.literal("assign_recount"),
        body: recountBody,
      })
      .strict(),
  ])
  .superRefine((value, ctx) => {
    if (
      value.purpose === "assign_recount" &&
      value.body.documentId !== value.documentId
    )
      ctx.addIssue({
        code: "custom",
        path: ["body", "documentId"],
        message: "O reconto precisa pertencer à ficha selecionada.",
      });
  });
export type BalanceDocumentDecision = z.infer<
  typeof balanceDocumentDecisionSchema
>;
export const balancePreparationQuery = z
  .object({
    careRecipientId: id,
    documentId: id,
    purpose: balanceDocumentPurpose,
  })
  .strict();

const instant = z.iso.datetime({ offset: true });
const timezone = z.string().refine((value) => {
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, "Fuso da referência inválido.");
const quantity = z.union([
  z
    .string()
    .max(64)
    .regex(/^-?\d+(?:\.\d+)?$/),
  z.number().finite(),
]);
const counter = z.object({
  id: id.nullable(),
  eventId: id.nullable().optional(),
  name: z.string().nullable(),
  source: z.string(),
  version: version.optional(),
  recordedAt: instant.nullable().optional(),
});
const line = z.object({
  id,
  name: z.string(),
  unit: z.string(),
  quantity,
  expectedQuantity: quantity.nullable(),
});
const review = z.object({
  counter,
  countVersion: version.nullable(),
  notes: z.string(),
  referenceState: z.enum(["current", "historical", "unavailable"]),
  referenceHash: hash,
  eligibleGroups: z.array(z.enum(["family", "supervisor"])).max(2),
  reconciliationApplied: z.boolean(),
  reviewRequired: z.boolean(),
});
const target = z
  .object({
    id,
    version,
    professional_id: id,
    professional_name: z.string(),
    type_name: z.string(),
    starts_at: instant,
    ends_at: instant,
    timezone,
  })
  .refine(
    (value) => Date.parse(value.starts_at) < Date.parse(value.ends_at),
    "Janela do destino inválida.",
  );
const assignment = z.object({
  id,
  version,
  starts_at: instant,
  ends_at: instant,
  professionalName: z.string().nullable(),
  timezone: timezone.nullable(),
});
const recount = z.object({
  counter,
  countVersion: version.nullable(),
  notes: z.string(),
  referenceHash: hash,
  canAssign: z.boolean(),
  requiresDesignation: z.boolean(),
  isScheduled: z.boolean(),
  hasRecountCycle: z.boolean(),
  countWindow: z
    .object({
      startsAt: instant,
      endsAt: instant,
      timezone,
      professionalName: z.string(),
    })
    .nullable(),
  activeAssignment: assignment.nullable(),
  targets: z.array(target).max(1000),
});
export const balancePreparationSchema = z.object({
  documentId: id,
  patientId: id,
  code: z.string().nullable(),
  documentVersion: version,
  status: z.string(),
  lines: z.array(line).max(1000),
  review: review.nullable(),
  recount: recount.nullable(),
});
export type BalancePreparation = z.infer<typeof balancePreparationSchema>;
export type BalancePreparationTarget = z.infer<typeof target>;
