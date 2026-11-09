import { describe, expect, it } from "vitest";
import { z } from "zod";
import { creationDraftCommandSchema } from "@/lib/validation/creation-drafts";
import { parsePrivateDraft } from "@/lib/validation/private-draft-results";
import {
  parseRequisitionDecisionReference,
  requisitionDecisionPacketSchema,
  requisitionDraftFields,
  requireRequisitionDraftFields,
  requireRequisitionDecisionConfirmation,
  type RequisitionDecisionReference,
} from "@/lib/validation/requisition-decisions";
import {
  usesSupplyDraftTransport,
  type RequisitionOperationPurpose,
} from "@/lib/validation/supply-drafts";
import {
  adoptRequisitionDecisionReference,
  emptyRequisitionDecisionDraft,
  requisitionDecisionAvailable,
} from "@/lib/forms/requisition-decision-draft";

const id = "00000000-0000-4000-8000-000000000001",
  patientId = "00000000-0000-4000-8000-000000000002",
  userId = "00000000-0000-4000-8000-000000000003",
  draftId = "00000000-0000-4000-8000-000000000004",
  itemId = "00000000-0000-4000-8000-000000000005";
const time = "2026-11-09T20:00:00Z";
const reference: RequisitionDecisionReference = {
  id,
  patientId,
  code: "REQ-0001",
  documentVersion: 4,
  status: "submitted",
  historical: false,
  completedAt: null,
  archivedAt: null,
  catalogueHash: "c".repeat(64),
  referenceHash: "a".repeat(64),
  fulfillment: { total: 1, fulfilled: 0 },
  items: [
    { id: itemId, name: "Item extra preservado", extra: true, resolved: false },
  ],
};
const packetFor = (action: RequisitionOperationPurpose) =>
  requisitionDecisionPacketSchema.parse({
    action,
    body: {
      reason: "\uFEFF\n Motivo próprio confirmado\u00A0",
      ...(action === "resolve_extra" ? { itemId, productId: "product-a" } : {}),
    },
    expectedVersion: 4,
    idempotencyKey: id,
    draftCommit: { id: draftId, revision: 2 },
  });

describe("private REQ decisions", () => {
  for (const purpose of ["archive", "cancel", "resolve_extra"] as const) {
    it(
      purpose +
        " has a real target,own stage and no stock or receipt material copy",
      () => {
        const content = emptyRequisitionDecisionDraft(reference, purpose),
          input = {
            careRecipientId: patientId,
            kind: "REQ",
            purpose,
            targetDocumentId: id,
            id: null,
            expectedRevision: null,
            idempotencyKey: draftId,
            action: "save",
            navigation: { version: 1, stage: "req_" + purpose },
            content,
          };
        expect(creationDraftCommandSchema.safeParse(input).success).toBe(true);
        expect(
          creationDraftCommandSchema.safeParse({
            ...input,
            targetDocumentId: null,
          }).success,
        ).toBe(false);
        expect(
          creationDraftCommandSchema.safeParse({
            ...input,
            navigation: { version: 1, stage: "com_cancellation" },
          }).success,
        ).toBe(false);
        expect(
          creationDraftCommandSchema.safeParse({
            ...input,
            content: { ...content, divergentIds: [itemId] },
          }).success,
        ).toBe(false);
        expect(
          creationDraftCommandSchema.safeParse({
            ...input,
            content: {
              ...content,
              materials: [
                {
                  id: "p",
                  name: "Produto",
                  unit: "unidade",
                  quantityDecimals: 0,
                },
              ],
            },
          }).success,
        ).toBe(false);
        expect(usesSupplyDraftTransport("REQ", purpose)).toBe(true);
        expect(usesSupplyDraftTransport("REQ", "create")).toBe(false);
      },
    );
    it(
      purpose +
        " refuses malformed or foreign private200 responses without losing the scope contract",
      () => {
        const content = emptyRequisitionDecisionDraft(reference, purpose),
          scope = {
            userId,
            patientId,
            kind: "REQ" as const,
            purpose,
            targetDocumentId: id,
          },
          row = {
            id: draftId,
            ownerId: userId,
            patientId,
            kind: "REQ",
            purpose,
            targetDocumentId: id,
            schemaVersion: 1,
            revision: 1,
            state: "active",
            createdAt: time,
            savedAt: time,
            contentHash: "a".repeat(64),
            content,
            navigation: { version: 1, stage: "req_" + purpose },
            consumedDocumentId: null,
          };
        expect(parsePrivateDraft(row, scope)?.content).toEqual(content);
        for (const change of [
          { ownerId: patientId },
          { patientId: userId },
          { targetDocumentId: draftId },
          { content: { ...content, documentVersion: null } },
        ])
          expect(() =>
            parsePrivateDraft({ ...row, ...change }, scope),
          ).toThrow();
      },
    );
    it(
      purpose +
        " confirms only its exact private revision,target and native result",
      () => {
        const packet = packetFor(purpose),
          native =
            purpose === "cancel"
              ? { id, care_recipient_id: patientId, status: "cancelled" }
              : purpose === "archive"
                ? { archivedAt: time, archiveReason: packet.body.reason }
                : {
                    care_recipient_id: patientId,
                    requisition_item_id: itemId,
                    product_id: "product-a",
                    reason: packet.body.reason,
                  };
        const data = {
          id: draftId,
          revision: 3,
          state: "consumed",
          consumedDocumentId: id,
          replayed: false,
          savedAt: time,
          result: native,
        };
        expect(
          requireRequisitionDecisionConfirmation({ data }, packet, {
            id,
            patientId,
          }).result,
        ).toEqual(native);
        for (const change of [
          { id },
          { revision: 4 },
          { consumedDocumentId: itemId },
          { state: "active" },
          { result: {} },
        ])
          expect(() =>
            requireRequisitionDecisionConfirmation(
              { data: { ...data, ...change } },
              packet,
              { id, patientId },
            ),
          ).toThrow();
        if (purpose !== "archive")
          expect(() =>
            requireRequisitionDecisionConfirmation(
              {
                data: {
                  ...data,
                  result: { ...native, care_recipient_id: userId },
                },
              },
              packet,
              { id, patientId },
            ),
          ).toThrow();
      },
    );
  }
  it("requires current version and unique item identities;1000 ordinary plus20 extra items remain readable", () => {
    expect(
      parseRequisitionDecisionReference({ data: reference }, { id, patientId }),
    ).toEqual(reference);
    for (const data of [
      { ...reference, patientId: userId },
      { ...reference, items: [reference.items[0], reference.items[0]] },
      { ...reference, fulfillment: {} },
    ])
      expect(() =>
        parseRequisitionDecisionReference({ data }, { id, patientId }),
      ).toThrow();
    expect(() =>
      parseRequisitionDecisionReference(
        { data: reference },
        { id, patientId, minimumVersion: 5 },
      ),
    ).toThrow();
    const items = Array.from({ length: 1020 }, (_, n) => ({
      ...reference.items[0],
      id: `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`,
      extra: n >= 1000,
    }));
    expect(
      parseRequisitionDecisionReference(
        { data: { ...reference, items } },
        { id, patientId },
      ).items,
    ).toHaveLength(1020);
  });
  it("explicit adoption preserves raw reason and unavailable choices;no successor is substituted", () => {
    const content = emptyRequisitionDecisionDraft(reference, "resolve_extra");
    content.fields = {
      ...content.fields,
      reason: "\n Motivo ainda incompleto\t",
      productId: "missing",
      productLabel: "Nome preservado",
      productUnit: "frasco",
    };
    const next = adoptRequisitionDecisionReference(
      content,
      {
        ...reference,
        documentVersion: 5,
        referenceHash: "b".repeat(64),
        items: [],
      },
      [{ id: "successor", name: "Outro produto", unit: "caixa" }],
    );
    expect(next.fields).toMatchObject({
      reason: "\n Motivo ainda incompleto\t",
      itemId,
      itemLabel: "Item extra preservado",
      productId: "missing",
      productLabel: "Nome preservado",
      productUnit: "frasco",
    });
    expect(next.documentVersion).toBe(5);
    expect(next.fields.referenceHash).toBe("b".repeat(64));
    expect(next.fields.productId).toBe("missing");
  });
  it("availability follows the task,without equating completion,archive or cancellation", () => {
    expect(requisitionDecisionAvailable(reference, "cancel")).toBe(true);
    expect(requisitionDecisionAvailable(reference, "archive")).toBe(false);
    expect(
      requisitionDecisionAvailable(
        { ...reference, completedAt: time },
        "archive",
      ),
    ).toBe(true);
    expect(
      requisitionDecisionAvailable(
        { ...reference, completedAt: time },
        "cancel",
      ),
    ).toBe(false);
    expect(
      requisitionDecisionAvailable(
        { ...reference, historical: true },
        "cancel",
      ),
    ).toBe(false);
    expect(
      requisitionDecisionAvailable(
        { ...reference, historical: true, completedAt: time },
        "archive",
      ),
    ).toBe(true);
    expect(
      requisitionDecisionAvailable(
        { ...reference, historical: true },
        "resolve_extra",
      ),
    ).toBe(true);
    expect(
      requisitionDecisionAvailable(
        { ...reference, historical: true, archivedAt: time },
        "resolve_extra",
      ),
    ).toBe(true);
    for (const purpose of ["cancel", "resolve_extra"] as const)
      expect(
        requisitionDecisionAvailable(
          { ...reference, status: "cancelled" },
          purpose,
        ),
      ).toBe(false);
    expect(
      requisitionDecisionAvailable(
        { ...reference, completedAt: time, archivedAt: time },
        "archive",
      ),
    ).toBe(false);
    expect(
      requisitionDecisionAvailable(
        { ...reference, items: [{ ...reference.items[0], resolved: true }] },
        "resolve_extra",
      ),
    ).toBe(false);
  });
  it("private commit metadata is complete or absent;reason uses the same Unicode trim as the API", () => {
    const schema = z
      .object({ reason: z.string(), ...requisitionDraftFields })
      .strict()
      .superRefine(requireRequisitionDraftFields);
    expect(schema.safeParse({ reason: "Legado" }).success).toBe(true);
    expect(
      schema.safeParse({
        reason: "Incompleto",
        draftCommit: { id: draftId, revision: 1 },
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ reason: "Versão solta", expectedVersion: 1 }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        reason: "Completo",
        draftCommit: { id: draftId, revision: 1 },
        expectedVersion: 1,
        idempotencyKey: id,
      }).success,
    ).toBe(true);
    expect(packetFor("cancel").body.reason).toBe("Motivo próprio confirmado");
    expect(
      requisitionDecisionPacketSchema.safeParse({
        ...packetFor("cancel"),
        body: { reason: "a" },
      }).success,
    ).toBe(false);
    expect(
      requisitionDecisionPacketSchema.safeParse({
        ...packetFor("cancel"),
        body: { reason: "Razão válida", productId: "p" },
      }).success,
    ).toBe(false);
  });
});
