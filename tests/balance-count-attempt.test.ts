import { describe, it, expect } from "vitest";
import {
  checkCountAttempt,
  parseCountCache,
  preserveCountCache,
  clearCountCache,
  clearIdleCountCache,
  requireCountConfirmation,
} from "@/lib/balances/count-attempt";
import { supplyWriteConfirmation } from "@/lib/supply/write-confirmation";
const user = "11111111-1111-4111-8111-111111111111",
  patient = "22222222-2222-4222-8222-222222222222",
  id = "33333333-3333-4333-8333-333333333333",
  key = "44444444-4444-4444-8444-444444444444",
  other = "55555555-5555-4555-8555-555555555555",
  product = "material";
const scope = { userId: user, patientId: patient, documentId: null };
const create = () => ({
  url: "/api/documents",
  draft: false,
  body: {
    careRecipientId: patient,
    type: "BAL",
    payload: {
      lines: [{ productId: product, quantity: "1.25" }],
      notes: "Own count",
    },
    draft: false,
    idempotencyKey: key,
  },
});
const row = () => ({
  id,
  care_recipient_id: patient,
  created_by: user,
  idempotency_key: key,
  type: "BAL",
  version: 1,
  status: "submitted",
  payload: { notes: "Own count" },
  lines: [
    {
      id: other,
      product_id: product,
      name_snapshot: "Material",
      unit_snapshot: "unidade",
      quantity: "1.25",
    },
  ],
  events: [],
});
const confirmed = () => ({
  data: row(),
  persistence: "confirmed",
  confirmation: supplyWriteConfirmation(user, { idempotencyKey: key }),
});
function storage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
  };
}
describe("scheduled BAL count attempts", () => {
  it("never lets a private discard remove an operational attempt", () => {
    const s = storage();
    preserveCountCache(s, "own", scope, {}, create());
    const original = s.getItem("own");
    expect(() => clearIdleCountCache(s, "own", scope)).toThrow();
    expect(s.getItem("own")).toBe(original);
    clearCountCache(s, "own", scope, create());
    preserveCountCache(s, "own", scope, { counts: { [product]: "1," } }, null);
    clearIdleCountCache(s, "own", scope);
    expect(s.getItem("own")).toBeNull();
  });
  it("keeps the original wire body,including legacy default omissions", () => {
    const packet = create();
    expect(checkCountAttempt(packet, scope)).toEqual(packet);
    const revision = {
      url: `/api/documents/${id}/revise`,
      draft: false,
      body: {
        payload: packet.body.payload,
        idempotencyKey: key,
        submissionKey: other,
        expectedVersion: 2,
        recount: true,
        submit: true,
      },
    };
    expect(checkCountAttempt(revision, { ...scope, documentId: id })).toEqual(
      revision,
    );
  });
  it("rejects another patient,type,target,operation or expanded body", () => {
    const p = create();
    for (const body of [
      { ...p.body, careRecipientId: other },
      { ...p.body, type: "ENT" },
      { ...p.body, ownerId: user },
    ])
      expect(() => checkCountAttempt({ ...p, body }, scope)).toThrow();
    expect(() =>
      checkCountAttempt({ ...p, url: `/api/documents/${other}/revise` }, scope),
    ).toThrow();
    expect(() => checkCountAttempt({ ...p, draft: true }, scope)).toThrow();
  });
  it("accepts an exact native confirmation with actor/key and values", () => {
    expect(requireCountConfirmation(confirmed(), create(), scope).id).toBe(id);
  });
  it("refuses a good-looking response without its request receipt or persistence marker", () => {
    const c = confirmed();
    for (const v of [
      { data: c.data, persistence: c.persistence },
      { ...c, persistence: "pending" },
      { ...c, confirmation: { ...c.confirmation, idempotencyKey: other } },
      { ...c, confirmation: { ...c.confirmation, actorId: other } },
    ])
      expect(() => requireCountConfirmation(v, create(), scope)).toThrow();
  });
  it("refuses another document identity or another count despite a valid receipt", () => {
    for (const data of [
      { ...row(), care_recipient_id: other },
      { ...row(), type: "ENT" },
      { ...row(), created_by: other },
      { ...row(), idempotency_key: other },
      { ...row(), payload: { notes: "Different" } },
      { ...row(), lines: [{ ...row().lines[0], quantity: "9" }] },
    ])
      expect(() =>
        requireCountConfirmation({ ...confirmed(), data }, create(), scope),
      ).toThrow();
  });
  it("binds a revision receipt to the old version,target and submission key", () => {
    const p = {
      url: `/api/documents/${id}/revise`,
      draft: false,
      body: {
        payload: create().body.payload,
        idempotencyKey: key,
        submissionKey: other,
        expectedVersion: 2,
        recount: true,
        submit: true,
      },
    };
    const response = {
      ...confirmed(),
      data: { ...row(), version: 3, created_by: other },
      confirmation: supplyWriteConfirmation(user, p.body, id),
    };
    expect(
      requireCountConfirmation(response, p, { ...scope, documentId: id })
        .version,
    ).toBe(3);
    expect(() =>
      requireCountConfirmation(
        {
          ...response,
          confirmation: { ...response.confirmation, submissionKey: key },
        },
        p,
        { ...scope, documentId: id },
      ),
    ).toThrow();
  });
  it("keeps raw physical observations and exact pending packets across reload", () => {
    const s = storage(),
      fields = {
        counts: { [product]: "1,25" },
        notes: "Own count",
        observationTimes: { [product]: "2026-11-10T10:00:00Z" },
        assignmentId: null,
        referenceRevision: "5",
      };
    preserveCountCache(s, "own", scope, fields, create());
    const r = parseCountCache(s.getItem("own")!, scope);
    expect(r.counts).toEqual(fields.counts);
    expect(r.observationTimes).toEqual(fields.observationTimes);
    expect(r.pending).toEqual(create());
    clearCountCache(s, "own", scope, create());
    expect(s.getItem("own")).toBeNull();
  });
  it("preserves a damaged,foreign or replaced copy without overwrite or cleanup", () => {
    const s = storage();
    s.setItem("own", "{damaged");
    expect(() => preserveCountCache(s, "own", scope, {}, null)).toThrow();
    expect(s.getItem("own")).toBe("{damaged");
    s.setItem(
      "own",
      JSON.stringify({
        version: 2,
        userId: other,
        patientId: patient,
        savedAt: 1,
        pending: create(),
      }),
    );
    const original = s.getItem("own");
    expect(() => clearCountCache(s, "own", scope, create())).toThrow();
    expect(s.getItem("own")).toBe(original);
    preserveCountCache(s, "other", scope, {}, create());
    const alternate = {
      ...create(),
      body: { ...create().body, idempotencyKey: other },
    };
    expect(() =>
      preserveCountCache(s, "other", scope, {}, alternate),
    ).toThrow();
    expect(() => clearCountCache(s, "other", scope, alternate)).toThrow();
  });
  it("does not turn saved fields differing from the frozen intent into a new count", () => {
    const s = storage();
    expect(() =>
      preserveCountCache(
        s,
        "own",
        scope,
        { counts: { [product]: "5" } },
        create(),
      ),
    ).toThrow();
    expect(s.getItem("own")).toBeNull();
    expect(() =>
      parseCountCache(
        JSON.stringify({ savedAt: 1, pending: create(), notes: "Different" }),
        scope,
      ),
    ).toThrow();
  });
});
