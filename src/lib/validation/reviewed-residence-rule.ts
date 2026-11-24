import { z } from "zod";
import { administrativeOutcome, alertPreparationFields, recipientPreparationFields } from "./administrative-preparation";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const quantity = z.string().max(64).regex(/^\d+(?:[.,]\d+)?$/);
const threshold = alertPreparationFields.extend({
  productId: z.string().min(1).max(120), lowThreshold: quantity, criticalThreshold: quantity,
}).refine(fields => {
  const low = Number(fields.lowThreshold.replace(",", "."));
  const critical = Number(fields.criticalThreshold.replace(",", "."));
  return low <= 1_000_000_000 && critical <= low;
});
const recipient = recipientPreparationFields.extend({ recipientUserId: z.uuid(), destination: z.string().trim().max(254) })
  .refine(fields => fields.channel === "internal" ? fields.destination === ""
    : fields.channel === "email" ? z.email().safeParse(fields.destination).success
      : /^\+[1-9][0-9]{7,14}$/.test(fields.destination));

export const residenceRuleScope = z.strictObject({
  patientId: z.uuid(), mode: z.enum(["patient", "global"]), purpose: z.enum(["alertRule", "notificationRecipient"]),
});
export const residenceRuleQuery = residenceRuleScope.extend({
  selection: z.string().min(1).max(120).nullable(), option: z.string().max(16).nullable(),
}).refine(({ selection, option, purpose }) => {
  if (selection === null) return option === null;
  return purpose === "alertRule" ? alertPreparationFields.shape.location.safeParse(option).success
    : z.uuid().safeParse(selection).success && recipientPreparationFields.shape.channel.safeParse(option).success;
});

export const residenceRuleReference = z.strictObject({
  hash, version: z.number().int().positive().nullable(), eligible: z.boolean(),
  subject: z.strictObject({ id: z.string(), name: z.string(), active: z.boolean(), unit: z.string().optional(), decimals: z.number().int().optional() }).nullable(),
  current: z.record(z.string(), z.unknown()).nullable(),
});

export const residenceThresholds = z.strictObject({
  rules: z.array(alertPreparationFields.extend({ id: z.uuid() })),
  choices: z.array(z.strictObject({ id: z.string(), name: z.string(), unit: z.string(), decimals: z.number().int(), active: z.boolean() })),
  custodies: z.array(alertPreparationFields.shape.location),
});

export const residenceRecipients = z.strictObject({
  rules: z.array(recipientPreparationFields.extend({
    id: z.uuid(), name: z.string(), memberActive: z.boolean(), destinationVerified: z.boolean(),
  })),
  choices: z.array(z.strictObject({ id: z.uuid(), name: z.string(), role: z.string() })),
});

export const residenceRulePointer = residenceRuleScope.extend({ key: z.uuid() });
export const residenceRuleCommand = residenceRulePointer.extend({
  intent: z.strictObject({ fields: z.union([threshold, recipient]), referenceHash: hash }).nullable(),
}).refine(({ purpose, intent }) => !intent || ("productId" in intent.fields) === (purpose === "alertRule"));

const result = z.discriminatedUnion("state", [
  residenceRulePointer.extend({ state: z.literal("closed"), outcome: z.null() }),
  residenceRulePointer.extend({ state: z.literal("recorded"), outcome: administrativeOutcome }),
]);

export function verifyResidenceRule(command: ResidenceRuleCommand, value: unknown) {
  const received = result.parse(value);
  const { outcome } = received;
  const fields = command.intent?.fields;
  if (received.key !== command.key || received.patientId !== command.patientId || received.mode !== command.mode
    || received.purpose !== command.purpose || (outcome && (outcome.kind === "proposal") !== (command.mode === "global"))
    || (outcome?.kind === "local" && (outcome.action !== command.purpose
      || (fields && ("productId" in fields ? outcome.productId !== fields.productId : outcome.userId !== fields.recipientUserId))))) {
    throw new Error("O resultado não corresponde à alteração de regra ou destinatário.");
  }
  return received;
}

export type ResidenceRuleQuery = z.infer<typeof residenceRuleQuery>;
export type ResidenceRuleScope = z.infer<typeof residenceRuleScope>;
export type ResidenceRuleCommand = z.infer<typeof residenceRuleCommand>;
export type ResidenceRuleReference = z.infer<typeof residenceRuleReference>;
export type ResidenceRuleResult = z.infer<typeof result>;
export type ResidenceThresholds = z.infer<typeof residenceThresholds>;
export type ResidenceRecipients = z.infer<typeof residenceRecipients>;
