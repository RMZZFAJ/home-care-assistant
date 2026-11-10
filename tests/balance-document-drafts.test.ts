import { describe, expect, it } from "vitest";
import { creationDraftCommandSchema } from "@/lib/validation/creation-drafts";
import { parsePrivateDraft } from "@/lib/validation/private-draft-results";
import {
  balanceDocumentDecisionSchema,
  type BalancePreparation,
} from "@/lib/validation/balance-document-decisions";
import {
  balanceDocumentPurposes,
  usesSupplyDraftTransport,
} from "@/lib/validation/supply-drafts";
import {
  adoptBalanceDocumentDraft,
  balanceDocumentAvailable,
  balanceDocumentPacket,
  emptyBalanceDocumentDraft,
  parseBalanceDocumentConfirmation,
  parseBalancePreparation,
} from "@/lib/forms/balance-document-draft";
import { GET, POST } from "@/app/api/balances/document-preparation/route";

const patientId = "10000000-0000-4000-8000-000000000001",
  documentId = "20000000-0000-4000-8000-000000000001",
  userId = "30000000-0000-4000-8000-000000000001",
  draftId = "40000000-0000-4000-8000-000000000001",
  targetId = "50000000-0000-4000-8000-000000000001",
  stamp = "2026-11-09T12:00:00Z";
function source(recount = false): BalancePreparation {
  const counter = {
    id: userId,
    name: "Contadora original",
    source: "event_snapshot",
    eventId: targetId,
    recordedAt: stamp,
  };
  return {
    documentId,
    patientId,
    code: "BAL-001",
    documentVersion: 4,
    status: "approved",
    lines: [
      {
        id: targetId,
        name: "Material",
        unit: "unidade",
        quantity: "2",
        expectedQuantity: "1",
      },
    ],
    review: recount
      ? null
      : {
          counter,
          countVersion: 1,
          notes: "Observações originais",
          referenceState: "historical",
          referenceHash: "a".repeat(64),
          eligibleGroups: ["family", "supervisor"],
          reconciliationApplied: true,
          reviewRequired: false,
        },
    recount: recount
      ? {
          counter,
          countVersion: 1,
          notes: "Observações originais",
          referenceHash: "b".repeat(64),
          canAssign: true,
          requiresDesignation: false,
          isScheduled: false,
          hasRecountCycle: false,
          countWindow: null,
          activeAssignment: null,
          targets: [
            {
              id: targetId,
              version: 2,
              professional_id: userId,
              professional_name: "Profissional do reconto",
              type_name: "Plantão real",
              starts_at: stamp,
              ends_at: "2026-11-10T12:00:00Z",
              timezone: "America/Sao_Paulo",
            },
          ],
        }
      : null,
  };
}
describe("BAL document preparations preserve physical authorship and own incomplete input", () => {
  for (const purpose of balanceDocumentPurposes)
    it(
      purpose + " separates transport,scope,navigation and immutable material",
      () => {
        const ref = source(purpose === "assign_recount"),
          content = emptyBalanceDocumentDraft(ref, purpose);
        content.fields[purpose === "assign_recount" ? "reason" : "comment"] =
          "\n \uFEFF Texto próprio incompleto 🧭 \u00A0";
        const packet = {
          careRecipientId: patientId,
          kind: "BAL",
          purpose,
          targetDocumentId: documentId,
          id: null,
          expectedRevision: null,
          idempotencyKey: draftId,
          action: "save",
          navigation: { version: 1, stage: "bal_" + purpose },
          content,
        };
        const saved = creationDraftCommandSchema.parse(packet);
        expect(saved.action).toBe("save");
        if (saved.action === "save") expect(saved.content).toEqual(content);
        expect(usesSupplyDraftTransport("BAL", purpose)).toBe(true);
        expect(usesSupplyDraftTransport("BAL", "create")).toBe(false);
        for (const mutation of [
          { ...packet, targetDocumentId: null },
          { ...packet, navigation: { version: 1, stage: "count" } },
          {
            ...packet,
            content: {
              ...content,
              materials: [
                {
                  id: targetId,
                  name: "Stock copy",
                  unit: "unidade",
                  quantityDecimals: 0,
                },
              ],
            },
          },
          { ...packet, content: { ...content, divergentIds: [targetId] } },
        ])
          expect(creationDraftCommandSchema.safeParse(mutation).success).toBe(
            false,
          );
        const row = {
          id: draftId,
          ownerId: userId,
          patientId,
          kind: "BAL",
          purpose,
          targetDocumentId: documentId,
          schemaVersion: 1,
          revision: 2,
          state: "active",
          createdAt: stamp,
          savedAt: stamp,
          contentHash: "a".repeat(64),
          content,
          navigation: packet.navigation,
          consumedDocumentId: null,
        };
        const scope = {
          userId,
          patientId,
          kind: "BAL" as const,
          purpose,
          targetDocumentId: documentId,
        };
        expect(parsePrivateDraft(row, scope)?.content).toEqual(content);
        expect(() =>
          parsePrivateDraft({ ...row, ownerId: targetId }, scope),
        ).toThrow();
        expect(() =>
          parsePrivateDraft({ ...row, purpose: "create" }, scope),
        ).toThrow();
      },
    );
  it("validates current response identity,version,actual context,quantities and timezones", () => {
    const ref = source(true),
      scope = {
        patientId,
        documentId,
        purpose: "assign_recount" as const,
        minimumVersion: 4,
      };
    expect(parseBalancePreparation({ data: ref }, scope)).toEqual(ref);
    for (const changed of [
      {},
      { ...ref, patientId: targetId },
      { ...ref, documentVersion: 3 },
      { ...ref, recount: null },
      {
        ...ref,
        recount: {
          ...ref.recount,
          targets: [...ref.recount!.targets, ...ref.recount!.targets],
        },
      },
      {
        ...ref,
        recount: {
          ...ref.recount,
          targets: [
            { ...ref.recount!.targets[0], timezone: "invalid/timezone" },
          ],
        },
      },
      { ...ref, lines: [{ ...ref.lines[0], quantity: "NaN" }] },
    ])
      expect(() => parseBalancePreparation({ data: changed }, scope)).toThrow();
  });
  it("allows optional historical review without revalidating current stock and blocks stale submitted reconciliation", () => {
    const ref = source();
    expect(balanceDocumentAvailable(ref, "review_family")).toBe(true);
    expect(
      balanceDocumentAvailable(
        { ...ref, status: "submitted" },
        "review_family",
      ),
    ).toBe(false);
    expect(
      balanceDocumentAvailable(
        { ...ref, review: { ...ref.review!, eligibleGroups: [] } },
        "review_family",
      ),
    ).toBe(false);
    expect(
      balanceDocumentAvailable(
        {
          ...source(true),
          recount: { ...source(true).recount!, canAssign: false },
        },
        "assign_recount",
      ),
    ).toBe(false);
  });
  it("adopts only current references and selected target after explicit comparison,retaining raw reason and unavailable selections", () => {
    const ref = source(true),
      content = emptyBalanceDocumentDraft(ref, "assign_recount");
    content.fields = {
      ...content.fields,
      reason: "\n Justificativa própria \u00A0",
      targetShiftId: targetId,
      targetShiftVersion: "1",
      targetLabel: "Pessoa anterior",
      query: "Texto em busca",
    };
    const adopted = adoptBalanceDocumentDraft(content, ref, "assign_recount");
    expect(adopted.fields.reason).toBe(content.fields.reason);
    expect(adopted.fields.query).toBe(content.fields.query);
    expect(adopted.fields.targetShiftVersion).toBe("2");
    expect(adopted.fields.targetLabel).toContain("Profissional do reconto");
    const selectedLabel = adoptBalanceDocumentDraft(
      {
        ...content,
        fields: { ...content.fields, query: content.fields.targetLabel },
      },
      ref,
      "assign_recount",
    );
    expect(selectedLabel.fields.query).toBe(selectedLabel.fields.targetLabel);
    const missing = adoptBalanceDocumentDraft(
      content,
      { ...ref, recount: { ...ref.recount!, targets: [] } },
      "assign_recount",
    );
    expect(missing.fields.targetLabel).toBe("Pessoa anterior");
    expect(missing.fields.targetShiftId).toBe(targetId);
  });
  it("builds a sealed official body with optional raw review comment and separately normalized designation reason", () => {
    const ref = source(),
      content = emptyBalanceDocumentDraft(ref, "review_family"),
      scope = {
        patientId,
        documentId,
        purpose: "review_family" as const,
        draftCommit: { id: draftId, revision: 3 },
        key: targetId,
      };
    content.fields.comment = "\n Parecer 🩺 \u00A0";
    const packet = balanceDocumentPacket(scope, content);
    expect(packet.body).toEqual({
      group: "family",
      comment: content.fields.comment,
      reviewReference: content.fields.referenceHash,
    });
    expect(
      balanceDocumentDecisionSchema.safeParse({
        ...packet,
        body: { ...packet.body, group: "supervisor" },
      }).success,
    ).toBe(false);
    expect(() =>
      balanceDocumentPacket(scope, {
        ...content,
        fields: { ...content.fields, comment: "🧭".repeat(1001) },
      }),
    ).toThrow();
    const r = source(true),
      c = emptyBalanceDocumentDraft(r, "assign_recount");
    Object.assign(c.fields, {
      reason: "\uFEFF\n Motivo próprio \u00A0",
      targetShiftId: targetId,
      targetShiftVersion: "2",
    });
    expect(
      balanceDocumentPacket({ ...scope, purpose: "assign_recount" }, c).body,
    ).toMatchObject({
      reason: "Motivo próprio",
      documentId,
      targetShiftId: targetId,
      targetShiftVersion: 2,
    });
  });
  it("requires a consumed private revision and the exact independent review result before accepting200", () => {
    const content = emptyBalanceDocumentDraft(source(), "review_family");
    content.fields.comment = "Meu parecer";
    const packet = balanceDocumentPacket(
      {
        patientId,
        documentId,
        purpose: "review_family",
        draftCommit: { id: draftId, revision: 3 },
        key: targetId,
      },
      content,
    );
    const result = {
      id: documentId,
      care_recipient_id: patientId,
      type: "BAL",
      version: 5,
      balanceReview: {
        reviews: [
          {
            id: targetId,
            reviewer_id: userId,
            review_group: "family",
            comment: "Meu parecer",
            reviewed_document_version: 4,
          },
        ],
      },
    };
    const row = {
      id: draftId,
      revision: 4,
      state: "consumed",
      savedAt: stamp,
      consumedDocumentId: documentId,
      replayed: false,
      result,
    };
    expect(
      parseBalanceDocumentConfirmation({ data: row }, packet, userId).recount,
    ).toBeNull();
    for (const changed of [
      {},
      { ...row, id: targetId },
      { ...row, revision: 5 },
      { ...row, consumedDocumentId: targetId },
      { ...row, result: { ...result, version: 4 } },
      { ...row, result: { ...result, balanceReview: { reviews: [] } } },
    ])
      expect(() =>
        parseBalanceDocumentConfirmation({ data: changed }, packet, userId),
      ).toThrow();
  });
  it("validates recount result identity,chosen shift,version,reason and actual designer", () => {
    const c = emptyBalanceDocumentDraft(source(true), "assign_recount");
    Object.assign(c.fields, {
      reason: "Minha designação",
      targetShiftId: targetId,
      targetShiftVersion: "2",
    });
    const packet = balanceDocumentPacket(
      {
        patientId,
        documentId,
        purpose: "assign_recount",
        draftCommit: { id: draftId, revision: 3 },
        key: targetId,
      },
      c,
    );
    const result = {
      assignmentId: draftId,
      documentId,
      documentVersion: 4,
      code: "BAL-001",
      countVersion: 1,
      counter: { id: patientId, name: "Contadora" },
      professionalId: patientId,
      professionalName: "Destino",
      startsAt: stamp,
      endsAt: "2026-11-10T12:00:00Z",
      timezone: "America/Sao_Paulo",
      shiftId: targetId,
      shiftVersion: 2,
      designerId: userId,
      designerName: "Familiar",
      recordedAt: stamp,
      reason: "Minha designação",
    };
    const row = {
      id: draftId,
      revision: 4,
      state: "consumed",
      savedAt: stamp,
      consumedDocumentId: documentId,
      replayed: true,
      result,
    };
    expect(
      parseBalanceDocumentConfirmation({ data: row }, packet, userId).recount
        ?.shiftId,
    ).toBe(targetId);
    expect(
      parseBalanceDocumentConfirmation(
        { data: { ...row, result: { ...result, code: null } } },
        packet,
        userId,
      ).recount?.code,
    ).toBeNull();
    for (const mutation of [
      { documentId: patientId },
      { designerId: patientId },
      { shiftId: patientId },
      { shiftVersion: 3 },
      { reason: "Outro motivo" },
      { code: undefined },
    ])
      expect(() =>
        parseBalanceDocumentConfirmation(
          { data: { ...row, result: { ...result, ...mutation } } },
          packet,
          userId,
        ),
      ).toThrow();
  });
  it("rejects forged authority,unknown scope and cross-site confirmation before authentication", async () => {
    for (const query of [
      "purpose=configure",
      `purpose=review_family&careRecipientId=${patientId}&documentId=bad`,
      `purpose=review_family&careRecipientId=${patientId}&documentId=${documentId}&ownerId=${userId}`,
    ])
      expect(
        (
          await GET(
            new Request(
              "https://care.example/api/balances/document-preparation?" + query,
            ),
          )
        ).status,
      ).toBe(400);
    const c = emptyBalanceDocumentDraft(source(), "review_family"),
      packet = balanceDocumentPacket(
        {
          patientId,
          documentId,
          purpose: "review_family",
          draftCommit: { id: draftId, revision: 3 },
          key: targetId,
        },
        c,
      );
    for (const mutation of [
      { ...packet, ownerId: userId },
      { ...packet, body: { ...packet.body, reviewer_id: userId } },
    ])
      expect(
        (
          await POST(
            new Request(
              "https://care.example/api/balances/document-preparation",
              {
                method: "POST",
                headers: {
                  origin: "https://care.example",
                  "content-type": "application/json",
                },
                body: JSON.stringify(mutation),
              },
            ),
          )
        ).status,
      ).toBe(400);
    expect(
      (
        await POST(
          new Request(
            "https://care.example/api/balances/document-preparation",
            {
              method: "POST",
              headers: {
                origin: "https://other.example",
                "content-type": "application/json",
              },
              body: JSON.stringify(packet),
            },
          ),
        )
      ).status,
    ).toBe(403);
  });
});
