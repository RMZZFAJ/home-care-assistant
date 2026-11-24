import { z } from "zod";
import {
  administrativeOutcome,
  membershipPreparationFields,
  membershipStatusPreparationFields,
} from "./administrative-preparation";

const membershipFields = membershipPreparationFields.extend({ userId: z.uuid() });
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const scope = z.strictObject({
  patientId: z.uuid(),
  mode: z.enum(["patient", "global"]),
  purpose: z.enum(["membership", "membershipStatus"]),
  targetId: z.uuid().nullable(),
});

export const reviewedMembershipQuery = scope.extend({ selection: z.uuid().nullable() }).refine(value =>
  value.purpose === "membershipStatus" ? value.targetId !== null && value.selection === null
    : value.targetId === null ? value.selection !== null : value.selection === null,
);

export const reviewedMembershipReference = z.strictObject({
  hash,
  version: z.number().int().positive().nullable(),
  eligible: z.boolean(),
  subject: z.strictObject({ id: z.uuid(), name: z.string(), active: z.boolean() }).nullable(),
  current: membershipFields.extend({ status: membershipStatusPreparationFields.shape.status }).nullable(),
});

export const reviewedMembershipPointer = scope.extend({ key: z.uuid() });
export const reviewedMembershipCommand = reviewedMembershipPointer.extend({
  intent: z.strictObject({ fields: z.union([membershipFields, membershipStatusPreparationFields]), referenceHash: hash }).nullable(),
}).refine(({ purpose, targetId, intent }) => {
  if (purpose === "membershipStatus") return targetId !== null && (!intent || "status" in intent.fields);
  return !intent || ("userId" in intent.fields && (targetId === null || targetId === intent.fields.userId));
});

const result = z.discriminatedUnion("state", [
  reviewedMembershipPointer.extend({ state: z.literal("closed"), outcome: z.null() }),
  reviewedMembershipPointer.extend({ state: z.literal("recorded"), outcome: administrativeOutcome }),
]);

export function verifyReviewedMembership(command: ReviewedMembershipCommand, value: unknown) {
  const received = result.parse(value);
  const { intent, ...pointer } = command;
  const outcome = received.outcome;
  const fields = intent?.fields;
  if (received.key !== pointer.key || received.patientId !== pointer.patientId || received.mode !== pointer.mode
    || received.purpose !== pointer.purpose || received.targetId !== pointer.targetId
    || (outcome && (outcome.kind === "proposal") !== (pointer.mode === "global"))
    || (outcome?.kind === "local" && (outcome.action !== pointer.purpose
      || (pointer.targetId && outcome.userId !== pointer.targetId)
      || (fields && "userId" in fields && (outcome.userId !== fields.userId || outcome.role !== fields.role))
      || (fields && "status" in fields && outcome.status !== fields.status)))) {
    throw new Error("A confirmação pertence a outra alteração de vínculo.");
  }
  return received;
}

export type ReviewedMembershipCommand = z.infer<typeof reviewedMembershipCommand>;
export type ReviewedMembershipResult = z.infer<typeof result>;
export type ReviewedMembershipScope = z.infer<typeof scope>;
