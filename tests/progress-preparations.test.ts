import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { creationDraftCommandSchema } from "@/lib/validation/creation-drafts";
import {
  parsePrivateDraft,
  parsePrivateDraftResult,
} from "@/lib/validation/private-draft-results";
import {
  progressPreparationContentSchema,
  progressPreparationCommitSchema,
  parseProgressPreparationReceipt,
  parseProgressPreparationConfirmation,
  progressReceiptMatchesPacket,
  storedProgressPacketSchema,
  storedProgressPacketsMatch,
  parseProgressRecovery,
} from "@/lib/validation/progress-preparations";
import { ProgressPreparationSummary } from "@/components/documents/progress-preparation-summary";
const user = "11111111-1111-4111-8111-111111111111",
  patient = "22222222-2222-4222-8222-222222222222",
  doc = "33333333-3333-4333-8333-333333333333",
  note = "44444444-4444-4444-8444-444444444444",
  key = "55555555-5555-4555-8555-555555555555",
  draftId = "66666666-6666-4666-8666-666666666666";
const fields = {
  category: "action" as const,
  stage: "issuance" as const,
  text: "Texto próprio <img src=x>",
  references: [] as string[],
};
const current = { documentType: "REQ" as const, note: fields };
const packet = progressPreparationCommitSchema.parse({
  careRecipientId: patient,
  purpose: "progress_note",
  targetResourceId: doc,
  key,
  content: fields,
  draftCommit: { id: draftId, revision: 2 },
});
const outcome = {
  note: {
    id: note,
    source: "manual",
    documentId: doc,
    recordedAt: "2026-11-10T12:00:00Z",
    authorId: user,
    authorName: "Autor preservado",
    ...fields,
  },
  key,
  intentHash: "a".repeat(64),
  recovered: false,
};
const receipt = {
  patientId: patient,
  purpose: "progress_note",
  targetResourceId: doc,
  resourceId: note,
  actorId: user,
  recordedAt: outcome.note.recordedAt,
  idempotencyKey: key,
  documentType: "REQ",
  command: { key, content: fields },
  nativeResult: outcome,
};
const scope = {
  userId: user,
  patientId: patient,
  purpose: "progress_note" as const,
  targetResourceId: doc,
};
const save = {
  action: "save",
  careRecipientId: patient,
  kind: "PROGRESS",
  purpose: "progress_note",
  targetDocumentId: null,
  targetResourceId: doc,
  id: null,
  expectedRevision: null,
  idempotencyKey: key,
  content: current,
  navigation: { version: 1, stage: "progress_note" },
};
describe("private progress note preparations", () => {
  it("never calls a missing intent rejected and requires monotonic CAS or an immutable key conflict", () => {
    const common = {
      patientId: patient,
      ownerId: user,
      targetResourceId: doc,
      key,
      expectedRevision: 2,
      content: fields,
      current: { id: draftId, revision: 2, state: "active" },
    };
    expect(
      parseProgressRecovery(
        { ...common, status: "unknown", reason: null, receipt: null },
        packet,
        user,
      ).status,
    ).toBe("unknown");
    expect(() =>
      parseProgressRecovery(
        {
          ...common,
          status: "not_applied",
          reason: "advanced_revision",
          receipt: null,
        },
        packet,
        user,
      ),
    ).toThrow();
    expect(
      parseProgressRecovery(
        {
          ...common,
          current: { ...common.current, revision: 3 },
          status: "not_applied",
          reason: "advanced_revision",
          receipt: null,
        },
        packet,
        user,
      ).status,
    ).toBe("not_applied");
    expect(() =>
      parseProgressRecovery(
        { ...common, key: doc, status: "unknown", reason: null, receipt: null },
        packet,
        user,
      ),
    ).toThrow();
  });
  it("accepts a verified native historical result but rejects a contradictory non-application proof", () => {
    const common = {
      patientId: patient,
      ownerId: user,
      targetResourceId: doc,
      key,
      expectedRevision: 2,
      content: fields,
      current: { id: draftId, revision: 3, state: "consumed" },
    };
    expect(
      parseProgressRecovery(
        { ...common, status: "applied_native", nativeResult: outcome },
        packet,
        user,
      ).status,
    ).toBe("applied_native");
    expect(() =>
      parseProgressRecovery(
        {
          ...common,
          status: "not_applied",
          reason: "advanced_revision",
          receipt,
        },
        packet,
        user,
      ),
    ).toThrow();
  });
  it("accepts incomplete text for all four real document types without publishing", () => {
    for (const documentType of ["REQ", "COM", "ENT", "BAL"])
      expect(
        progressPreparationContentSchema.safeParse({
          documentType,
          note: { ...fields, text: "" },
        }).success,
      ).toBe(true);
  });
  it("uses the same UTF16 text boundary as the native publisher", () => {
    expect(
      progressPreparationContentSchema.safeParse({
        ...current,
        note: { ...fields, text: "😀".repeat(1000) },
      }).success,
    ).toBe(true);
    expect(
      progressPreparationContentSchema.safeParse({
        ...current,
        note: { ...fields, text: "😀".repeat(1000) + "a" },
      }).success,
    ).toBe(false);
  });
  it("rejects foreign stages,case-variant duplicate references and extra fields", () => {
    for (const content of [
      { ...current, note: { ...fields, stage: "count" } },
      {
        ...current,
        note: {
          ...fields,
          references: [
            "abcdefab-abcd-4abc-8abc-abcdefabcdef",
            "ABCDEFAB-ABCD-4ABC-8ABC-ABCDEFABCDEF",
          ],
        },
      },
      { ...current, note: { ...fields, authorId: user } },
    ])
      expect(progressPreparationContentSchema.safeParse(content).success).toBe(
        false,
      );
  });
  it("shares the real private CAS transport and restricts its stage and paired revision", () => {
    expect(creationDraftCommandSchema.safeParse(save).success).toBe(true);
    for (const v of [
      { ...save, id: draftId },
      { ...save, navigation: { version: 1, stage: "flow_review" } },
      { ...save, targetDocumentId: doc },
      {
        ...save,
        content: { ...current, note: { ...fields, text: "x".repeat(2001) } },
      },
    ])
      expect(creationDraftCommandSchema.safeParse(v).success).toBe(false);
  });
  it("binds receipt to actor,patient,document,native note and preserved text", () => {
    expect(parseProgressPreparationReceipt(receipt, scope).resourceId).toBe(
      note,
    );
    for (const v of [
      { ...receipt, actorId: key },
      { ...receipt, patientId: key },
      { ...receipt, targetResourceId: key },
      { ...receipt, resourceId: key },
      {
        ...receipt,
        command: { key, content: { ...fields, text: "Outro texto" } },
      },
      {
        ...receipt,
        nativeResult: {
          ...outcome,
          note: { ...outcome.note, recordedAt: "2026-11-10T13:00:00Z" },
        },
      },
    ])
      expect(() => parseProgressPreparationReceipt(v, scope)).toThrow();
  });
  it("accepts live redaction of reference labels without changing the preserved command", () => {
    const r = {
      ...receipt,
      command: { key, content: { ...fields, references: [doc] } },
    };
    expect(
      parseProgressPreparationReceipt(r, scope).nativeResult.note.references,
    ).toEqual([]);
  });
  it("confirms only the same draft revision and original native packet,including acknowledged replay", () => {
    expect(
      parseProgressPreparationConfirmation(
        {
          draft: { id: draftId, revision: 3, state: "consumed" },
          receipt,
          replayed: false,
        },
        packet,
        user,
      ).receipt.resourceId,
    ).toBe(note);
    expect(
      parseProgressPreparationConfirmation(
        {
          draft: { id: draftId, revision: 4, state: "completed" },
          receipt,
          replayed: true,
        },
        packet,
        user,
      ).replayed,
    ).toBe(true);
    for (const v of [
      {
        draft: { id: draftId, revision: 4, state: "consumed" },
        receipt,
        replayed: false,
      },
      {
        draft: { id: key, revision: 3, state: "consumed" },
        receipt,
        replayed: false,
      },
      {
        draft: { id: draftId, revision: 3, state: "consumed" },
        receipt: { ...receipt, idempotencyKey: doc },
        replayed: false,
      },
    ])
      expect(() =>
        parseProgressPreparationConfirmation(v, packet, user),
      ).toThrow();
  });
  it("keeps old native pending packets compatible while distinguishing new private packets", () => {
    const legacy = { key, content: fields };
    expect(storedProgressPacketSchema.parse(legacy)).toEqual(legacy);
    expect(storedProgressPacketSchema.parse(packet)).toEqual(packet);
    expect(storedProgressPacketsMatch(legacy, packet)).toBe(false);
    expect(
      progressReceiptMatchesPacket(
        parseProgressPreparationReceipt(receipt, scope),
        { ...packet, key: doc },
      ),
    ).toBe(false);
  });
  it("decodes the note identity separately from its real document target and scopes the private read", () => {
    const row = {
      id: draftId,
      ownerId: user,
      patientId: patient,
      kind: "PROGRESS",
      purpose: "progress_note",
      targetDocumentId: null,
      targetResourceId: doc,
      schemaVersion: 1,
      revision: 3,
      state: "consumed",
      createdAt: outcome.note.recordedAt,
      savedAt: outcome.note.recordedAt,
      contentHash: "a".repeat(64),
      content: null,
      navigation: null,
      consumedDocumentId: null,
      consumedResourceId: note,
      consumedResult: receipt,
    };
    expect(
      parsePrivateDraft(row, {
        ...scope,
        kind: "PROGRESS",
        targetDocumentId: null,
      })?.consumedResourceId,
    ).toBe(note);
    expect(() =>
      parsePrivateDraft(
        { ...row, targetResourceId: note },
        { ...scope, kind: "PROGRESS", targetDocumentId: null },
      ),
    ).toThrow();
    expect(() =>
      parsePrivateDraftResult(
        {
          id: draftId,
          revision: 1,
          savedAt: outcome.note.recordedAt,
          state: "active",
          consumedDocumentId: null,
          replayed: false,
        },
        save,
        user,
      ),
    ).toThrow();
  });
  it("renders escaped private text,labels and references as reading without an inherited editor", () => {
    const html = renderToStaticMarkup(
      createElement(ProgressPreparationSummary, { content: current }),
    );
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
    expect(html).not.toMatch(/<input|<textarea|<select/);
    expect(html).toContain("Providência");
  });
});
