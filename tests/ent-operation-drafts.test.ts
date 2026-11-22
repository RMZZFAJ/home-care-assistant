import { expect, it } from "vitest";
import { creationDraftCommandSchema } from "@/lib/validation/creation-drafts";
import { parsePrivateDraft } from "@/lib/validation/private-draft-results";
import { draftFlow, navigationForStep } from "@/lib/forms/draft-navigation";
const id = "10000000-0000-4000-8000-000000000001",
  target = "10000000-0000-4000-8000-000000000002";
const stages = {
  reassign: "REASSIGN_ENT",
  resolve: "RESOLVE_ENT",
  cancel: "CANCEL_ENT",
  refuse_cancellation: "REFUSE_ENT",
  withdraw_cancellation: "WITHDRAW_ENT",
  consent_cancel: "CONSENT_ENT",
} as const;
it.each(Object.keys(stages) as (keyof typeof stages)[])(
  "ENT %s retains incomplete selection only in the exact owner, patient, purpose and document",
  (purpose) => {
    const content = {
      documentVersion: 4,
      fields: {
        recipientId: target,
        recipientLabel: "Pessoa preservada",
        lineId: id,
        lineLabel: "Material preservado",
        quantity: "1,",
        resolution: "returned",
        requestId: target,
        requestLabel: "Pedido preservado",
        reason: "",
      },
      divergentIds: [],
      materials: [
        {
          id,
          name: "Material preservado",
          unit: "unidade",
          quantityDecimals: 0,
        },
      ],
    };
    const navigation = navigationForStep(stages[purpose], 0),
      input = {
        careRecipientId: id,
        kind: "ENT",
        purpose,
        targetDocumentId: target,
        id: null,
        expectedRevision: null,
        idempotencyKey: id,
        action: "save",
        content,
        navigation,
      };
    expect(draftFlow("ENT", purpose)).toBe(stages[purpose]);
    expect(creationDraftCommandSchema.safeParse(input).success).toBe(true);
    for (const change of [
      { targetDocumentId: null },
      { navigation: { version: 1, stage: "receipt" } },
      { content: { ...content, fields: { reason: "x".repeat(3001) } } },
    ])
      expect(
        creationDraftCommandSchema.safeParse({ ...input, ...change }).success,
      ).toBe(false);
    const scope = {
        userId: id,
        patientId: id,
        kind: "ENT" as const,
        purpose,
        targetDocumentId: target,
      },
      row = {
        id,
        ownerId: id,
        patientId: id,
        kind: "ENT",
        purpose,
        targetDocumentId: target,
        schemaVersion: 1,
        revision: 1,
        state: "active",
        createdAt: "2026-11-09T00:00:00Z",
        savedAt: "2026-11-09T00:00:00Z",
        contentHash: "hash",
        content,
        navigation,
        consumedDocumentId: null,
      };
    expect(parsePrivateDraft(row, scope)?.content).toEqual(content);
    for (const change of [
      { ownerId: target },
      { patientId: target },
      { targetDocumentId: id },
      { purpose: "receive" },
      { navigation: { version: 1, stage: "receipt" } },
    ])
      expect(() => parsePrivateDraft({ ...row, ...change }, scope)).toThrow();
    if (!["cancel"].includes(purpose))
      expect(
        creationDraftCommandSchema.safeParse({ ...input, kind: "COM" }).success,
      ).toBe(false);
  },
);
