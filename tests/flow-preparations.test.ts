import { describe, it, expect } from "vitest";
import {
  flowReviewFieldsSchema,
  flowPreparationContentSchema,
  flowNativeCommand,
  flowPreparationCommitSchema,
  parseFlowPreparationReference,
  parseFlowPreparationReceipt,
  parseFlowPreparationConfirmation,
  flowPendingConfirmedByRead,
  flowPendingEnvelopeMatches,
  flowPreparationListQuery,
  parseFlowPreparationList,
} from "@/lib/validation/flow-preparations";
import {
  parsePrivateDraft,
  parsePrivateDraftResult,
} from "@/lib/validation/private-draft-results";
const patient = "11111111-1111-4111-8111-111111111111",
  owner = "22222222-2222-4222-8222-222222222222",
  target = "33333333-3333-4333-8333-333333333333",
  draft = "44444444-4444-4444-8444-444444444444",
  key = "55555555-5555-4555-8555-555555555555",
  report = "66666666-6666-4666-8666-666666666666",
  at = "2026-11-10T09:00:00.000Z",
  hash = "a".repeat(64),
  scope = {
    userId: owner,
    patientId: patient,
    purpose: "flow_review" as const,
    targetResourceId: target,
  };
const fields = {
  accept: true,
  kind: "consumption" as const,
  text: "\uFEFFMinha declaração preservada\u00A0",
  lines: [
    {
      productId: "material/1",
      name: "Material preservado",
      unit: "unidade",
      quantity: "1,000000",
    },
  ],
};
const reference = {
  patientId: patient,
  purpose: "flow_review" as const,
  targetResourceId: target,
  suggestion: {
    id: target,
    ownerId: owner,
    status: "pending_confirmation",
    body: {
      text: "Texto original recebido",
      products: ["material/1"],
      historical: { quantity: "2.000000", note: "Preservar sem transformação" },
    },
    createdAt: at,
    reportId: null,
    reviewedAt: null,
  },
  catalog: [
    {
      id: "material/1",
      name: "Material preservado",
      unit: "unidade",
      decimals: 6,
      active: true,
    },
  ],
};
const content = { review: fields, reference, referenceHash: hash },
  command = flowNativeCommand(fields, target),
  packet = {
    careRecipientId: patient,
    purpose: "flow_review" as const,
    targetResourceId: target,
    draftCommit: { id: draft, revision: 1 },
    idempotencyKey: key,
    referenceHash: hash,
    command,
  };
const receipt = {
    patientId: patient,
    purpose: "flow_review",
    targetResourceId: target,
    resourceId: target,
    actorId: owner,
    recordedAt: at,
    idempotencyKey: key,
    referenceHash: hash,
    command,
    preparedReview: fields,
    preparedReference: reference,
    nativeResult: { status: "confirmed", reportId: report },
  },
  confirmation = {
    id: draft,
    revision: 2,
    savedAt: at,
    state: "consumed",
    consumedDocumentId: null,
    consumedResourceId: target,
    consumedResult: receipt,
    replayed: false,
  };
describe("private Flow discriminating contracts", () => {
  it("does not clear another typed pending envelope or expose schema internals", () => {
    expect(
      flowPendingEnvelopeMatches(
        { version: 1, userId: owner, packet },
        packet,
        owner,
      ),
    ).toBe(true);
    expect(
      flowPendingEnvelopeMatches(
        {
          version: 1,
          userId: owner,
          packet: { ...packet, idempotencyKey: report },
        },
        packet,
        owner,
      ),
    ).toBe(false);
    expect(
      flowPendingEnvelopeMatches(
        { version: 1, userId: patient, packet },
        packet,
        owner,
      ),
    ).toBe(false);
    expect(() =>
      parseFlowPreparationList({ privatePayload: "Nunca exibir" }),
    ).toThrow("Não foi possível conferir a resposta recebida.");
  });

  it("preserves incomplete quantities,raw text and hash-bound provider data", () => {
    expect(
      flowPreparationContentSchema.parse({
        ...content,
        review: {
          ...fields,
          kind: "",
          text: "",
          lines: [{ ...fields.lines[0], quantity: "" }],
        },
        reference: null,
        referenceHash: null,
      }).review.lines[0].quantity,
    ).toBe("");
    expect(
      parseFlowPreparationReference({ reference, referenceHash: hash }, scope)
        .reference,
    ).toEqual(reference);
    expect(flowNativeCommand(fields, target)).toMatchObject({
      text: fields.text.trim(),
      lines: [{ productId: "material/1", quantity: "1" }],
    });
  });
  it("aligns private UTF16 limits and duplicate-material validation", () => {
    expect(
      flowReviewFieldsSchema.safeParse({ ...fields, text: "😀".repeat(1000) })
        .success,
    ).toBe(true);
    expect(
      flowReviewFieldsSchema.safeParse({ ...fields, text: "😀".repeat(1001) })
        .success,
    ).toBe(false);
    expect(
      flowReviewFieldsSchema.safeParse({
        ...fields,
        lines: [fields.lines[0], fields.lines[0]],
      }).success,
    ).toBe(false);
    for (const quantity of ["", "1e3", "-1", "0", "1.0000001"])
      expect(() =>
        flowNativeCommand(
          { ...fields, lines: [{ ...fields.lines[0], quantity }] },
          target,
        ),
      ).toThrow();
  });
  it("requires the same patient,owner and target for a current reference", () => {
    for (const changed of [
      { ...reference, patientId: owner },
      { ...reference, targetResourceId: owner },
      {
        ...reference,
        suggestion: { ...reference.suggestion, ownerId: patient },
      },
    ])
      expect(() =>
        parseFlowPreparationReference(
          { reference: changed, referenceHash: hash },
          scope,
        ),
      ).toThrow();
    expect(() =>
      parseFlowPreparationReference(
        { reference: null, referenceHash: hash },
        scope,
      ),
    ).toThrow();
  });
  it("binds command,private revision and target without manufacturing a document", () => {
    expect(flowPreparationCommitSchema.safeParse(packet).success).toBe(true);
    expect(
      flowPreparationCommitSchema.safeParse({
        ...packet,
        draftCommit: undefined,
      }).success,
    ).toBe(false);
    expect(
      flowPreparationCommitSchema.safeParse({
        ...packet,
        command: { ...command, id: owner },
      }).success,
    ).toBe(false);
    const row = parsePrivateDraft(
      {
        id: draft,
        ownerId: owner,
        patientId: patient,
        kind: "FLOW",
        purpose: "flow_review",
        targetDocumentId: null,
        targetResourceId: target,
        schemaVersion: 1,
        revision: 1,
        state: "active",
        createdAt: at,
        savedAt: at,
        contentHash: hash,
        content,
        navigation: { version: 1, stage: "flow_review" },
        consumedDocumentId: null,
        consumedResourceId: null,
        consumedResult: null,
      },
      { ...scope, kind: "FLOW", targetDocumentId: null },
    );
    expect(row?.content).toEqual(content);
  });
  it("rejects a different author,source,declared text,material or native outcome", () => {
    expect(
      parseFlowPreparationReceipt(receipt, scope).nativeResult.reportId,
    ).toBe(report);
    for (const r of [
      { ...receipt, actorId: patient },
      { ...receipt, resourceId: owner },
      {
        ...receipt,
        preparedReference: {
          ...reference,
          suggestion: { ...reference.suggestion, status: "confirmed" },
        },
      },
      { ...receipt, preparedReview: { ...fields, text: "Outra declaração" } },
      {
        ...receipt,
        preparedReview: {
          ...fields,
          lines: [{ ...fields.lines[0], unit: "caixa" }],
        },
      },
      { ...receipt, nativeResult: { status: "rejected", reportId: report } },
      { ...receipt, nativeResult: { status: "confirmed", reportId: null } },
    ])
      expect(() => parseFlowPreparationReceipt(r, scope)).toThrow();
  });
  it("checks exact original private key/revision on confirmation and read reconciliation", () => {
    expect(
      parseFlowPreparationConfirmation(confirmation, packet, owner)
        .consumedResult.idempotencyKey,
    ).toBe(key);
    expect(flowPendingConfirmedByRead(confirmation, packet, owner)).toBe(true);
    for (const p of [
      { ...packet, idempotencyKey: report },
      { ...packet, draftCommit: { id: draft, revision: 2 } },
      { ...packet, command: { ...command, text: "Outro envio" } },
      { ...packet, referenceHash: "b".repeat(64) },
    ]) {
      expect(() =>
        parseFlowPreparationConfirmation(confirmation, p, owner),
      ).toThrow();
      expect(flowPendingConfirmedByRead(confirmation, p, owner)).toBe(false);
    }
    expect(flowPendingConfirmedByRead(confirmation, packet, patient)).toBe(
      false,
    );
  });
  it("rejection preserves private fields but sends no registration fields or stock act", () => {
    const f = {
        ...fields,
        accept: false,
        kind: "" as const,
        text: "",
        lines: [{ ...fields.lines[0], quantity: "incompleta" }],
      },
      cmd = flowNativeCommand(f, target),
      r = {
        ...receipt,
        command: cmd,
        preparedReview: f,
        nativeResult: { status: "rejected", reportId: null },
      };
    expect(cmd).toEqual({
      id: target,
      accept: false,
      kind: "shortage",
      text: "Sugestão descartada pelo próprio autor",
      lines: [],
    });
    expect(
      parseFlowPreparationReceipt(r, scope).preparedReview.lines[0].quantity,
    ).toBe("incompleta");
    expect(
      parsePrivateDraftResult(
        {
          ...confirmation,
          patientId: patient,
          ownerId: owner,
          purpose: "flow_review",
          targetResourceId: target,
          revision: 3,
          state: "completed",
          consumedResult: r,
        },
        {
          careRecipientId: patient,
          kind: "FLOW",
          purpose: "flow_review",
          targetDocumentId: null,
          targetResourceId: target,
          id: draft,
          expectedRevision: 2,
          idempotencyKey: key,
          action: "acknowledge",
        },
        owner,
      ).state,
    ).toBe("completed");
  });
  it("requires paired cursors and rejects malformed or oversized private pages", () => {
    expect(
      flowPreparationListQuery.safeParse({
        careRecipientId: patient,
        before: at,
      }).success,
    ).toBe(false);
    expect(
      flowPreparationListQuery.safeParse({
        careRecipientId: patient,
        before: at,
        beforeId: target,
        limit: 20,
      }).success,
    ).toBe(true);
    expect(() =>
      parseFlowPreparationList({
        data: [
          {
            id: draft,
            targetResourceId: "bad",
            revision: 1,
            state: "active",
            savedAt: at,
          },
        ],
        next: null,
      }),
    ).toThrow();
    expect(() =>
      parseFlowPreparationList({
        data: Array(51).fill({
          id: draft,
          targetResourceId: target,
          revision: 1,
          state: "active",
          savedAt: at,
        }),
        next: null,
      }),
    ).toThrow();
  });
});
