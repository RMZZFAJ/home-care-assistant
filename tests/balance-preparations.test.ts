import { describe, it, expect } from "vitest";
import { creationDraftCommandSchema } from "@/lib/validation/creation-drafts";
import {
  balancePreparationCommandSchema,
  balancePreparationContentSchema,
  balancePreparationCommitSchema,
  parseBalancePreparationReceipt,
  parseBalancePreparationConfirmation,
  balancePreparationPendingSchema,
} from "@/lib/validation/balance-preparations";
import { balancePreparationPurposes } from "@/lib/forms/balance-preparation-purposes";
import { balancePreparationCommand } from "@/lib/forms/balance-preparation";
import {
  parsePrivateDraft,
  parsePrivateDraftResult,
} from "@/lib/validation/private-draft-results";

const patient = "11111111-1111-4111-8111-111111111111",
  owner = "22222222-2222-4222-8222-222222222222",
  id = "33333333-3333-4333-8333-333333333333",
  other = "44444444-4444-4444-8444-444444444444";
const time = "2026-11-10T00:00:00Z",
  hash = "a".repeat(64);
const values = {
  reason: "  Minha justificativa 🩺 \n",
  enabled: "true",
  weekday: "0",
  shiftTypeId: other,
  professionalId: "",
  timezone: "America/Sao_Paulo",
  startsOn: "2026-11-10",
  targetShiftId: other,
  targetShiftLabel: "Escolha preservada",
  targetShiftQuery: "Busca ainda incompleta",
};
const content = { values, referenceHash: hash, referenceVersion: 1 };
const packet = {
  careRecipientId: patient,
  kind: "BAL" as const,
  purpose: "configure" as const,
  targetDocumentId: null,
  targetResourceId: patient,
  id: null,
  expectedRevision: null,
  idempotencyKey: other,
  action: "save" as const,
  content,
  navigation: { version: 1 as const, stage: "bal_configure" as const },
};
const scope = {
  userId: owner,
  patientId: patient,
  kind: "BAL" as const,
  targetDocumentId: null,
  targetResourceId: patient,
  purpose: "configure" as const,
};
const row = {
  id,
  ownerId: owner,
  patientId: patient,
  kind: "BAL",
  purpose: "configure",
  targetDocumentId: null,
  targetResourceId: patient,
  schemaVersion: 1,
  revision: 1,
  state: "active",
  createdAt: time,
  savedAt: time,
  contentHash: hash,
  content,
  navigation: packet.navigation,
  consumedDocumentId: null,
  consumedResourceId: null,
  consumedResult: null,
};
const command = balancePreparationCommand("configure", patient, values);
const receipt = {
  patientId: patient,
  purpose: "configure",
  targetResourceId: patient,
  resourceId: patient,
  actorId: owner,
  recordedAt: time,
  command,
  expectedVersion: 1,
  referenceHash: hash,
  preparedValues: values,
  nativeResult: {
    care_recipient_id: patient,
    updated_by: owner,
    version: 2,
    enabled: true,
    weekday: 0,
    timezone: "America/Sao_Paulo",
    shift_type_id: other,
    designated_professional_id: null,
    starts_on: "2026-11-10",
  },
};

describe("BAL workspace private preparations", () => {
  it("does not accept malformed200,another owner or an unbound resource as native confirmation", () => {
    const intent = balancePreparationCommitSchema.parse({
      careRecipientId: patient,
      purpose: "configure",
      targetResourceId: patient,
      draftCommit: { id, revision: 1 },
      idempotencyKey: other,
      referenceHash: hash,
      expectedVersion: 1,
      command,
    });
    const result = {
      id,
      ownerId: owner,
      patientId: patient,
      purpose: "configure",
      targetResourceId: patient,
      revision: 2,
      savedAt: time,
      state: "consumed",
      consumedDocumentId: null,
      consumedResourceId: patient,
      consumedResult: receipt,
      replayed: false,
    };
    expect(
      parseBalancePreparationConfirmation(result, intent, owner).resourceId,
    ).toBe(patient);
    for (const bad of [
      {},
      { ...result, ownerId: other },
      { ...result, revision: 1 },
      { ...result, consumedResourceId: other },
      { ...result, consumedDocumentId: other },
      {
        ...result,
        consumedResult: {
          ...receipt,
          preparedValues: { ...values, reason: "Outro motivo" },
        },
      },
    ])
      expect(() =>
        parseBalancePreparationConfirmation(bad, intent, owner),
      ).toThrow();
  });
  it("keeps the exact local recovery envelope bound to the same values and original official command", () => {
    const intent = balancePreparationCommitSchema.parse({
      careRecipientId: patient,
      purpose: "configure",
      targetResourceId: patient,
      draftCommit: { id, revision: 1 },
      idempotencyKey: other,
      referenceHash: hash,
      expectedVersion: 1,
      command,
    });
    expect(
      balancePreparationPendingSchema.safeParse({ packet: intent, content })
        .success,
    ).toBe(true);
    for (const change of [
      { ...content, referenceHash: "b".repeat(64) },
      { ...content, referenceVersion: 2 },
      { ...content, values: { ...values, enabled: "false" } },
      { ...content, values: { ...values, reason: "Outra intenção" } },
    ])
      expect(
        balancePreparationPendingSchema.safeParse({
          packet: intent,
          content: change,
        }).success,
      ).toBe(false);
  });
  it("accepts all six real-resource purposes and their own stages without a document version", () => {
    for (const purpose of balancePreparationPurposes) {
      const p = {
        ...packet,
        purpose,
        targetResourceId: purpose === "configure" ? patient : other,
        navigation: { version: 1, stage: "bal_" + purpose },
        content: {
          values: { reason: "1, ainda incompleto" },
          referenceHash: null,
          referenceVersion: null,
        },
      };
      const parsed = balancePreparationCommandSchema.parse(p);
      expect(parsed.action).toBe("save");
      if (parsed.action === "save") expect(parsed.content).toEqual(p.content);
      expect(creationDraftCommandSchema.safeParse(p).success).toBe(true);
    }
  });
  it("rejects fictitious document anchors,foreign configuration,material copies,wrong stages and invalid revisions", () => {
    for (const bad of [
      { ...packet, targetDocumentId: other },
      { ...packet, targetResourceId: other },
      { ...packet, content: { ...content, documentVersion: 1 } },
      { ...packet, content: { ...content, materials: [] } },
      {
        ...packet,
        content: { ...content, values: { ...values, stock: "10" } },
      },
      { ...packet, navigation: { version: 1, stage: "bal_review_family" } },
      { ...packet, expectedRevision: 1 },
      { ...packet, id, expectedRevision: 0 },
    ]) {
      expect(balancePreparationCommandSchema.safeParse(bad).success).toBe(
        false,
      );
      expect(creationDraftCommandSchema.safeParse(bad).success).toBe(false);
    }
  });
  it("preserves raw and incomplete values while requiring an explicit valid official configuration", () => {
    expect(balancePreparationContentSchema.parse(content).values.reason).toBe(
      values.reason,
    );
    expect(command.action).toBe("configure");
    if (command.action === "configure") {
      expect(command.body.weekday).toBe(0);
      expect(command.body.reason).toBe(values.reason.trim());
    }
    for (const v of [
      { ...values, weekday: "" },
      { ...values, enabled: "indefinido" },
      { ...values, shiftTypeId: "" },
      { ...values, reason: "🩺".repeat(501) },
    ])
      expect(() =>
        balancePreparationCommand("configure", patient, v),
      ).toThrow();
  });
  it("binds private read to owner,patient,purpose and real resource,including the shared controller parser", () => {
    expect(parsePrivateDraft(row, scope)?.content).toEqual(content);
    for (const change of [
      { ownerId: other },
      { patientId: other },
      { purpose: "assign" },
      { targetResourceId: other },
      { targetDocumentId: other },
      { content: { ...content, materials: [] } },
      { navigation: { version: 1, stage: "count" } },
    ])
      expect(() => parsePrivateDraft({ ...row, ...change }, scope)).toThrow();
  });
  it("binds the save result even before the first private identity is known", () => {
    const result = {
      id,
      ownerId: owner,
      patientId: patient,
      purpose: "configure",
      targetResourceId: patient,
      revision: 1,
      savedAt: time,
      state: "active",
      consumedDocumentId: null,
      consumedResourceId: null,
      consumedResult: null,
      replayed: false,
    };
    expect(parsePrivateDraftResult(result, packet, owner).id).toBe(id);
    for (const change of [
      { ownerId: other },
      { patientId: other },
      { purpose: "assign" },
      { targetResourceId: other },
      { revision: 2 },
      { consumedDocumentId: other },
      { consumedResult: receipt },
    ])
      expect(() =>
        parsePrivateDraftResult({ ...result, ...change }, packet, owner),
      ).toThrow();
  });
  it("requires the exact native configuration result,actor and original reference for confirmation", () => {
    const intent = balancePreparationCommitSchema.parse({
      careRecipientId: patient,
      purpose: "configure",
      targetResourceId: patient,
      draftCommit: { id, revision: 1 },
      idempotencyKey: other,
      referenceHash: hash,
      expectedVersion: 1,
      command,
    });
    expect(
      parseBalancePreparationReceipt(receipt, scope, intent).resourceId,
    ).toBe(patient);
    for (const change of [
      { actorId: other },
      { resourceId: other },
      { referenceHash: "b".repeat(64) },
      { expectedVersion: 2 },
      { nativeResult: { ...receipt.nativeResult, version: 3 } },
      { nativeResult: { ...receipt.nativeResult, enabled: false } },
      { nativeResult: { ...receipt.nativeResult, updated_by: other } },
    ])
      expect(() =>
        parseBalancePreparationReceipt(
          { ...receipt, ...change },
          scope,
          intent,
        ),
      ).toThrow();
  });
  it("cannot turn a decision result into a fictitious completed document", () => {
    const consumed = {
      ...row,
      state: "consumed",
      revision: 2,
      content: null,
      navigation: null,
      consumedResourceId: patient,
      consumedResult: receipt,
    };
    expect(parsePrivateDraft(consumed, scope)?.consumedDocumentId).toBe(null);
    for (const change of [
      { consumedResourceId: null },
      { consumedResourceId: other },
      { consumedDocumentId: other },
      { consumedResult: null },
      { consumedResult: { ...receipt, purpose: "assign" } },
    ])
      expect(() =>
        parsePrivateDraft({ ...consumed, ...change }, scope),
      ).toThrow();
  });
  it("separates approval and rejection of the same request and rejects another native action", () => {
    const base = {
      careRecipientId: patient,
      purpose: "approve_deferral",
      targetResourceId: other,
      draftCommit: { id, revision: 1 },
      idempotencyKey: other,
      referenceHash: hash,
      expectedVersion: null,
      command: {
        action: "decide_deferral",
        body: { id: other, approve: true, reason: "Decisão familiar própria" },
      },
    };
    expect(balancePreparationCommitSchema.safeParse(base).success).toBe(true);
    for (const bad of [
      { ...base, purpose: "reject_deferral" },
      { ...base, expectedVersion: 1 },
      { ...base, targetResourceId: id },
      { ...base, command },
    ])
      expect(balancePreparationCommitSchema.safeParse(bad).success).toBe(false);
  });
});
