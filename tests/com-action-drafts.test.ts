import { expect, it } from "vitest";
import { creationDraftCommandSchema } from "@/lib/validation/creation-drafts";
import { parsePrivateDraft } from "@/lib/validation/private-draft-results";
import { draftFlow, navigationForStep } from "@/lib/forms/draft-navigation";
const id = "10000000-0000-4000-8000-000000000001",
  target = "10000000-0000-4000-8000-000000000002";
it.each(["approve", "purchase", "receive"] as const)(
  "preserves incomplete COM %s only in its owner target and navigation scope",
  (purpose) => {
    const flow =
      purpose === "approve"
        ? "APPROVE"
        : purpose === "purchase"
          ? "PURCHASE"
          : "ARRIVAL";
    const content = {
      documentVersion: 3,
      fields: { [id]: "1,", reason: "" },
      divergentIds: [],
      materials: [
        {
          id,
          name: "Material da referência",
          unit: "unidade",
          quantityDecimals: 0,
        },
      ],
    };
    const navigation = navigationForStep(flow, 0),
      scope = {
        userId: id,
        patientId: id,
        kind: "COM" as const,
        purpose,
        targetDocumentId: target,
      };
    const input = {
      careRecipientId: id,
      kind: "COM",
      purpose,
      targetDocumentId: target,
      id: null,
      expectedRevision: null,
      idempotencyKey: id,
      action: "save",
      content,
      navigation,
    };
    expect(draftFlow("COM", purpose)).toBe(flow);
    expect(creationDraftCommandSchema.safeParse(input).success).toBe(true);
    expect(
      creationDraftCommandSchema.safeParse({ ...input, targetDocumentId: null })
        .success,
    ).toBe(false);
    expect(
      creationDraftCommandSchema.safeParse({
        ...input,
        navigation: { version: 1, stage: "identification" },
      }).success,
    ).toBe(false);
    expect(
      creationDraftCommandSchema.safeParse({
        ...input,
        content: { ...content, fields: { reason: "x".repeat(3001) } },
      }).success,
    ).toBe(false);
    const row = {
      id,
      ownerId: id,
      patientId: id,
      kind: "COM",
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
      { purpose: "create" },
      { navigation: { version: 1, stage: "receipt" } },
    ])
      expect(() => parsePrivateDraft({ ...row, ...change }, scope)).toThrow();
    if (purpose !== "receive") {
      expect(
        creationDraftCommandSchema.safeParse({ ...input, kind: "ENT" }).success,
      ).toBe(false);
      expect(
        creationDraftCommandSchema.safeParse({
          ...input,
          kind: "ENT",
          action: "discard",
          id,
          expectedRevision: 1,
          content: undefined,
          navigation: undefined,
        }).success,
      ).toBe(false);
    }
  },
);
