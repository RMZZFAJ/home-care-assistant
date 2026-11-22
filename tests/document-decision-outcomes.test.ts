import { describe, expect, it } from "vitest";
import { documentDecisionIntention, requireDocumentDecisionReceipt } from "../src/lib/validation/document-decisions";

const documentId = "a37c0a54-45cb-4e45-b927-dd6a2c4ed929", key = "26129eab-02b8-47d1-a994-77d30c58912a";
const intention = { domain: "requisition" as const, action: "cancel", expectedVersion: 3, referenceHash: "a".repeat(64), body: { reason: "Motivo exato confirmado." } };
const scope = { documentId, key, domain: intention.domain, action: intention.action };
const receipt = () => ({ data: { documentId, key, recordedAt: "2026-11-14T12:30:00Z", state: "applied", intention: structuredClone(intention), result: { id: documentId, version: 4 } } });

describe("official outcomes without unfinished forms", () => {
  it("binds exact intention, scope and key while accepting irrelevant JSON property order", () => {
    expect(requireDocumentDecisionReceipt(receipt(), scope, intention).state).toBe("applied");
    const reordered = receipt(); reordered.data.intention.body = { reason: intention.body.reason };
    expect(requireDocumentDecisionReceipt(reordered, scope, intention).state).toBe("applied");
    for (const alter of [
      (r: ReturnType<typeof receipt>) => { r.data.documentId = key; },
      (r: ReturnType<typeof receipt>) => { r.data.key = documentId; },
      (r: ReturnType<typeof receipt>) => { r.data.intention.body.reason += " Outra intenção."; },
      (r: ReturnType<typeof receipt>) => { r.data.intention.action = "archive"; },
      (r: ReturnType<typeof receipt>) => { r.data.intention.expectedVersion++; },
    ]) { const changed = receipt(); alter(changed); expect(() => requireDocumentDecisionReceipt(changed, scope, intention)).toThrow(); }
  });
  it("requires a closed absence to have no intention or saved form/result", () => {
    const absent = { data: { documentId, key, recordedAt: "2026-11-14T12:30:00Z", state: "not_applied", intention: null, result: null } };
    expect(requireDocumentDecisionReceipt(absent, scope).state).toBe("not_applied");
    expect(() => requireDocumentDecisionReceipt({ data: { ...absent.data, intention } }, scope)).toThrow();
    expect(() => requireDocumentDecisionReceipt({ data: { ...absent.data, result: {} } }, scope)).toThrow();
  });
  it("allows an absent initial regime version only for balance workspace commands", () => {
    expect(documentDecisionIntention.safeParse({ ...intention, expectedVersion: 0 }).success).toBe(false);
    expect(documentDecisionIntention.safeParse({ ...intention, domain: "balance_workspace", expectedVersion: 0 }).success).toBe(true);
    expect(documentDecisionIntention.safeParse({ ...intention, referenceHash: undefined }).success).toBe(false);
  });
});
