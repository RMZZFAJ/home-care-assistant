import { z } from "zod";

export const administrativeScope = z.strictObject({
  patientId: z.uuid(),
  mode: z.enum(["patient", "global"]),
  purpose: z.enum(["alertRule", "notificationRecipient", "membership", "membershipStatus"]),
  targetId: z.uuid().nullable(),
});

export const alertPreparationFields = z.strictObject({
  productId: z.string().max(120), location: z.enum(["FAMILY", "CARE_TEAM"]),
  lowThreshold: z.string().max(64), criticalThreshold: z.string().max(64), isEnabled: z.boolean(),
});
export const recipientPreparationFields = z.strictObject({
  recipientUserId: z.union([z.literal(""), z.uuid()]),
  recipientGroup: z.enum(["family", "supervision", "care_team", "other"]),
  channel: z.enum(["internal", "email", "whatsapp"]), destination: z.string().max(254),
  isEnabled: z.boolean(), includeTeamAlerts: z.boolean(),
});
export const membershipPreparationFields = z.strictObject({
  userId: z.union([z.literal(""), z.uuid()]), role: z.enum(["admin", "supervisor", "family", "professional", "reader"]),
  canManageStock: z.boolean(), canCountStock: z.boolean(),
});
export const membershipStatusPreparationFields = z.strictObject({ status: z.enum(["active", "revoked"]) });
const fieldsByPurpose = {
  alertRule: alertPreparationFields, notificationRecipient: recipientPreparationFields,
  membership: membershipPreparationFields, membershipStatus: membershipStatusPreparationFields,
};

export const administrativeAttempt = administrativeScope.extend({
  action: z.enum(["save", "discard", "acknowledge", "commit"]),
  key: z.uuid(), id: z.uuid().nullable(), revision: z.number().int().min(0).max(2_147_483_646),
  fields: z.union([alertPreparationFields, recipientPreparationFields, membershipPreparationFields, membershipStatusPreparationFields]).nullable(),
  referenceHash: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
}).superRefine((attempt, ctx) => {
  const writing = attempt.action === "save" || attempt.action === "commit";
  if ((attempt.purpose === "membershipStatus" && !attempt.targetId)
    || (attempt.targetId !== null && !["membership", "membershipStatus"].includes(attempt.purpose))
    || (attempt.id === null) !== (attempt.revision === 0)
    || (!writing && !attempt.id) || writing !== (attempt.fields !== null) || writing !== (attempt.referenceHash !== null)
    || (attempt.fields && !fieldsByPurpose[attempt.purpose].safeParse(attempt.fields).success)
    || (attempt.targetId && attempt.fields && "userId" in attempt.fields && attempt.fields.userId !== attempt.targetId)) {
    ctx.addIssue({ code: "custom", message: "Confira a operação, a conta e a revisão deste preenchimento." });
  }
});

export const administrativeOutcome = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("proposal"), proposalId: z.uuid() }),
  z.strictObject({
    kind: z.literal("local"), action: administrativeScope.shape.purpose, resourceId: z.uuid(),
    userId: z.uuid().nullable(), productId: z.string().min(1).max(120).nullable(),
    role: membershipPreparationFields.shape.role.nullable(), status: membershipStatusPreparationFields.shape.status.nullable(),
  }),
]);
const administrativeReceipt = administrativeScope.extend({
  key: z.uuid(), ownerId: z.uuid(), action: administrativeAttempt.shape.action, id: z.uuid(),
  revision: z.number().int().positive(), state: z.enum(["active", "consumed", "discarded", "acknowledged"]),
  outcome: administrativeOutcome.nullable(),
});

export type AdministrativeScope = z.infer<typeof administrativeScope>;
export type AdministrativeAttempt = z.infer<typeof administrativeAttempt>;
export type AdministrativeInput = NonNullable<AdministrativeAttempt["fields"]>;
export type AdministrativeOutcome = z.infer<typeof administrativeOutcome>;
export type AdministrativeReference = {
  hash: string; version: number | null; eligible: boolean;
  current: Record<string, unknown> | null;
  subject: { id: string; name: string; unit?: string; decimals?: number; active: boolean } | null;
};
export type AlertPreparationFields = z.infer<typeof alertPreparationFields>;
export type RecipientPreparationFields = z.infer<typeof recipientPreparationFields>;
export type MembershipPreparationFields = z.infer<typeof membershipPreparationFields>;
export type MembershipStatusPreparationFields = z.infer<typeof membershipStatusPreparationFields>;

export function verifyAdministrativeReceipt(userId: string, attempt: AdministrativeAttempt, value: unknown) {
  const parsed = administrativeReceipt.safeParse(value);
  if (!parsed.success) throw new Error("Não foi possível conferir o comprovante desta tentativa.");
  const result = parsed.data;
  const states = { save: "active", commit: "consumed", discard: "discarded", acknowledge: "acknowledged" } as const;
  const outcome = result.outcome;
  const fields = attempt.fields;
  const expectedUser = attempt.targetId ?? (fields && "userId" in fields ? fields.userId : fields && "recipientUserId" in fields ? fields.recipientUserId : null);
  if (result.ownerId !== userId || result.patientId !== attempt.patientId || result.mode !== attempt.mode
    || result.purpose !== attempt.purpose || result.targetId !== attempt.targetId || result.key !== attempt.key
    || result.action !== attempt.action || result.state !== states[attempt.action] || result.revision !== attempt.revision + 1
    || (attempt.id !== null && result.id !== attempt.id)
    || ((attempt.action === "commit" || attempt.action === "acknowledge") !== (outcome !== null))
    || (outcome && (outcome.kind === "proposal") !== (attempt.mode === "global"))
    || (outcome?.kind === "local" && (outcome.action !== attempt.purpose
      || (expectedUser && outcome.userId !== expectedUser)
      || (fields && "productId" in fields && outcome.productId !== fields.productId)
      || (fields && "role" in fields && outcome.role !== fields.role)
      || (fields && "status" in fields && outcome.status !== fields.status)))) {
    throw new Error("O comprovante recebido não corresponde a esta tentativa.");
  }
  return result;
}
