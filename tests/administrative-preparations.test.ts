import { expect, it } from "vitest";
import { administrativeAttempt, verifyAdministrativeReceipt } from "@/lib/validation/administrative-preparation";

const user = "11111111-1111-4111-8111-111111111111";
const patient = "22222222-2222-4222-8222-222222222222";
const key = "33333333-3333-4333-8333-333333333333";
const resource = "44444444-4444-4444-8444-444444444444";
const attempt = administrativeAttempt.parse({ patientId: patient, mode: "patient", purpose: "membershipStatus",
  targetId: user, action: "commit", id: null, key, revision: 0, fields: { status: "revoked" }, referenceHash: "a".repeat(64) });
const outcome = { kind: "local", action: "membershipStatus", resourceId: resource, userId: user, productId: null, role: "admin", status: "revoked" };
const receipt = { patientId: patient, mode: "patient", purpose: "membershipStatus", targetId: user, ownerId: user,
  key, action: "commit", id: resource, revision: 1, state: "consumed", outcome };

it("accepts only the exact administrative native receipt", () => {
  expect(verifyAdministrativeReceipt(user, attempt, receipt).outcome).toEqual(outcome);
});
it.each([
  { ownerId: patient }, { patientId: user }, { mode: "global" }, { purpose: "membership" },
  { targetId: patient }, { key: patient }, { action: "save" }, { revision: 2 }, { state: "active" },
  { outcome: null }, { outcome: { ...outcome, userId: patient } }, { outcome: { ...outcome, status: "active" } },
  { outcome: { kind: "proposal", proposalId: resource } }, { outcome: {} }, { extraAuthority: true },
])("rejects a divergent receipt %j without accepting its result", changed => {
  expect(() => verifyAdministrativeReceipt(user, attempt, { ...receipt, ...changed })).toThrow();
});
it("keeps incomplete fields private while rejecting mismatched target or expanded authority", () => {
  expect(administrativeAttempt.safeParse({ ...attempt, purpose: "alertRule", targetId: null, action: "save",
    fields: { productId: "", location: "CARE_TEAM", lowThreshold: "em revisão", criticalThreshold: "", isEnabled: false } }).success).toBe(true);
  expect(administrativeAttempt.safeParse({ ...attempt, ownerId: user }).success).toBe(false);
  expect(administrativeAttempt.safeParse({ ...attempt, purpose: "membership", fields: {
    userId: patient, role: "family", canCountStock: false, canManageStock: false,
  } }).success).toBe(false);
});
