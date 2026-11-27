import { z } from "zod";

export const residenceIdentity = z.strictObject({
  displayName: z.string().trim().min(2).max(160),
  active: z.boolean(),
  development: z.boolean(),
});

const selection = { patientId: z.uuid() };
const intent = { ...selection, key: z.uuid() };
export const residenceAdministrationQuery = z.strictObject(selection);
export const residenceIdentificationCommand = z.discriminatedUnion("action", [
  z.strictObject({ ...intent, action: z.literal("save"), version: z.number().int().positive(), before: residenceIdentity, identity: residenceIdentity }),
  z.strictObject({ ...intent, action: z.literal("recover") }),
]);

export const residenceAdministrationSnapshot = z.strictObject({
  ...selection,
  identity: residenceIdentity,
  version: z.number().int().positive(),
  activeMembers: z.number().int().nonnegative(),
  pendingInvitations: z.number().int().nonnegative(),
  pendingProposals: z.number().int().nonnegative(),
});

export const residenceIdentificationResult = z.union([
  z.strictObject({ state: z.enum(["applied", "pending", "rejected"]), id: z.uuid() }),
  z.strictObject({ state: z.literal("closed") }),
]);

export type ResidenceIdentity = z.infer<typeof residenceIdentity>;
export type ResidenceAdministrationSnapshot = z.infer<typeof residenceAdministrationSnapshot>;
export type ResidenceIdentificationResult = z.infer<typeof residenceIdentificationResult>;
