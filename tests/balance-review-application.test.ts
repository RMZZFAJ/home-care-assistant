import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/balances/application/route";
import { balanceApplicationFacts, balanceApplicationPacket, balanceApplicationQuery } from "@/lib/validation/balance-application";
import { balanceReviewItems, balanceReviewItemsFromFields } from "@/lib/validation/balance-review-items";
import { balanceApplicationStorageKey, parseBalanceApplicationIntent } from "@/lib/balances/application-intent";
import { supplyCommandSchema } from "@/lib/validation/documents";
import { balanceDocumentAvailable, balanceDocumentPacket, parseBalanceDocumentConfirmation } from "@/lib/forms/balance-document-draft";
import type { BalancePreparation } from "@/lib/validation/balance-document-decisions";
import { balanceFollowUp } from "@/lib/documents/balance-follow-up";
import { supplyMilestones } from "@/lib/documents/milestones";
import type { SupplyDocument } from "@/types/documents";

const userId = "10000000-0000-4000-8000-000000000001", patientId = "20000000-0000-4000-8000-000000000001";
const documentId = "30000000-0000-4000-8000-000000000001", lineId = "40000000-0000-4000-8000-000000000001", key = "50000000-0000-4000-8000-000000000001";
const body = { group: "family" as const, reviewReference: "a".repeat(64) };
const packet = { action: "apply_balance" as const, idempotencyKey: key, expectedVersion: 3, body };
const item = { lineId, result: "difference" as const, forwarding: "recount" as const, comment: "Nova conferência necessária." };
const scope = { userId, patientId, documentId };

describe("independent BAL opinion and application", () => {
  it("keeps review items explicit and never treats an omitted item as confirmed", () => {
    expect(balanceReviewItemsFromFields({ comment: "Parecer geral" })).toEqual([]);
    const opinion = { result: item.result, forwarding: item.forwarding, comment: item.comment };
    expect(balanceReviewItemsFromFields({ ["item:" + lineId]: JSON.stringify(opinion) })).toEqual([item]);
    expect(balanceReviewItemsFromFields({ ["item:" + lineId]: JSON.stringify({ ...opinion, materialName: "Material preservado", unit: "un" }) })).toEqual([item]);
    expect(supplyCommandSchema.parse({ ...packet, action: "approve", body: { group: "family", items: [item] } }).body).toEqual({ group: "family", items: [item] });
    for (const values of [[item, item], [{ ...item, forwarding: "none" }], [{ ...item, result: "confirmed" }], [{ ...item, quantity: "99" }], [{ ...item, comment: "😀".repeat(251) }]])
      expect(balanceReviewItems.safeParse(values).success).toBe(false);
  });
  it("validates the separate application without accepting stock edits or review content", () => {
    expect(balanceApplicationPacket.parse(packet)).toEqual(packet);
    expect(supplyCommandSchema.parse(packet)).toEqual(packet);
    for (const changed of [{ ...body, quantity: "999" }, { ...body, comment: "Não é um parecer" }, { ...body, group: "reader" }, { ...body, reviewReference: "stale" }])
      expect(supplyCommandSchema.safeParse({ ...packet, body: changed }).success).toBe(false);
  });
  it("preserves an opaque attempt only for its exact user, patient and document", () => {
    const raw = JSON.stringify({ ...scope, packet });
    expect(parseBalanceApplicationIntent(raw, scope)).toEqual(packet);
    for (const changed of [{ ...scope, userId: key }, { ...scope, patientId: key }, { ...scope, documentId: key }])
      expect(() => parseBalanceApplicationIntent(raw, changed)).toThrow();
    expect(() => parseBalanceApplicationIntent(JSON.stringify({ ...scope, packet, clinicalPayload: "forbidden" }), scope)).toThrow();
    expect(balanceApplicationStorageKey(scope)).not.toBe(balanceApplicationStorageKey({ ...scope, userId: key }));
  });
  it("rejects restricted values and unknown application evidence instead of presenting them as zero", () => {
    expect(balanceApplicationFacts.safeParse({ state: "not_applied", lines: [] }).success).toBe(true);
    const facts = { state: "applied", id: key, countVersion: 1, documentVersion: 4, actorId: userId, actorName: "Revisora", appliedAt: "2026-11-11T12:00:00Z", lines: [{ lineId, state: "restricted", quantity: null }] };
    expect(balanceApplicationFacts.safeParse(facts).success).toBe(true);
    expect(balanceApplicationFacts.safeParse({ ...facts, lines: [{ lineId, state: "restricted", quantity: "0" }] }).success).toBe(false);
    expect(balanceApplicationFacts.safeParse({ state: "unavailable", lines: [{ lineId, quantity: "0" }] }).success).toBe(false);
  });
  it("binds a success-looking private confirmation to the exact item opinions", () => {
    const opinion = { result: item.result, forwarding: item.forwarding, comment: item.comment };
    const command = balanceDocumentPacket({ ...scope, purpose: "review_family", key, draftCommit: { id: key, revision: 2 } }, {
      documentVersion: 3, materials: [], divergentIds: [], fields: { comment: "Parecer", referenceHash: body.reviewReference, ["item:" + lineId]: JSON.stringify(opinion) },
    });
    expect(command.body).toMatchObject({ items: [item] });
    const review = { id: lineId, reviewer_id: userId, review_group: "family", comment: "Parecer", reviewed_document_version: 3, item_results: [item] };
    const result = { id: documentId, care_recipient_id: patientId, type: "BAL", version: 4, balanceReview: { reviews: [review] } };
    const response = { data: { id: key, revision: 3, state: "consumed", savedAt: "2026-11-11T12:00:00Z", consumedDocumentId: documentId, replayed: false, result } };
    expect(parseBalanceDocumentConfirmation(response, command, userId).state).toBe("consumed");
    for (const item_results of [[], [{ ...item, forwarding: "adjustment" }]]) {
      expect(() => parseBalanceDocumentConfirmation({ data: { ...response.data, result: { ...result, balanceReview: { reviews: [{ ...review, item_results }] } } } }, command, userId)).toThrow();
    }
  });
  it("allows an explicit historical opinion without making the application available", () => {
    const reference = { status: "submitted", review: { eligibleGroups: ["family"], referenceState: "historical", applicationGroups: [] } } as unknown as BalancePreparation;
    expect(balanceDocumentAvailable(reference, "review_family")).toBe(true);
    expect(reference.review?.applicationGroups).toEqual([]);
  });
  it("keeps satisfied required reviews separate from application and preserves explicit differences", () => {
    const review = { reviewRequired: false, policyReviewRequired: true, reviewSatisfied: true, hasItemDifferences: false, reconciliationApplied: false, referenceState: "current" } as SupplyDocument["balanceReview"];
    const facts = { status: "submitted", protocol: "BAL-controlado", balanceReview: review } as Parameters<typeof balanceFollowUp>[0];
    expect(balanceFollowUp(facts).heading).toBe("Confirmar a aplicação da contagem ao estoque");
    const milestones = supplyMilestones({ ...facts, type: "BAL", totalLines: 1, fullyCheckedLines: 0 });
    expect(milestones[2]).toMatchObject({ state: "done" });
    expect(milestones[3].state).not.toBe("done");
    const difference = { ...facts, status: "approved" as const, balanceReview: { ...review!, reconciliationApplied: true, hasItemDifferences: true } };
    expect(balanceFollowUp(difference)).toMatchObject({ pending: true, heading: "Acompanhar as diferenças apontadas no balanço" });
    expect(supplyMilestones({ ...difference, type: "BAL", totalLines: 1, fullyCheckedLines: 1 })[3].state).not.toBe("done");
  });
  it("rejects malformed lookup scopes and unexpected fields before authentication", async () => {
    const valid = { careRecipientId: patientId, documentId, idempotencyKey: key, expectedVersion: "3", ...body };
    expect(balanceApplicationQuery.safeParse(valid).success).toBe(true);
    for (const query of [{ ...valid, expectedVersion: "" }, { ...valid, documentId: "foreign" }, { ...valid, userId }]) {
      const response = await GET(new Request("https://care.example/api/balances/application?" + new URLSearchParams(query)));
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });
});
