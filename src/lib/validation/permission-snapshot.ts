import { z } from "zod";

const permission = z.object({
  code: z.string().min(1),
  critical: z.boolean(),
  roleEligible: z.boolean(),
  effective: z.boolean(),
  inherited: z.boolean(),
  exception: z.boolean().nullable(),
  familyReportingConfirmed: z.boolean().optional(),
  origin: z.enum(["default", "profile", "personal", "limited"]),
}).strict();

export type PersonalPermission = z.infer<typeof permission>;

export const permissionSnapshot = z.object({
  careRecipientId: z.uuid(),
  personId: z.uuid(),
  role: z.enum(["admin", "family", "professional", "supervisor", "reader"]),
  policyVersion: z.number().int().positive(),
  permissions: z.array(permission),
}).strict().refine(({ permissions }) => new Set(permissions.map(row => row.code)).size === permissions.length);

export function parsePermissionSnapshot(value: unknown, patientId: string, personId: string, minimumVersion = 1) {
  const snapshot = permissionSnapshot.safeParse(value);
  if (!snapshot.success || snapshot.data.careRecipientId !== patientId.toLowerCase() || snapshot.data.personId !== personId.toLowerCase() || snapshot.data.policyVersion < minimumVersion) {
    throw new Error("As permissões recebidas não correspondem ao vínculo e à versão consultados.");
  }
  return snapshot.data;
}
