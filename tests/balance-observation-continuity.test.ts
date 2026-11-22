import { describe, expect, it } from "vitest";
import {
  beginBalanceObservation,
  sameBalanceContext,
} from "@/lib/balances/observation-continuity";
import {
  balanceDraftContent,
  type BalanceDraftContent,
} from "@/lib/validation/creation-drafts";
import {
  parseCountCache,
  preserveCountCache,
} from "@/lib/balances/count-attempt";

const id = "11111111-1111-4111-8111-111111111111",
  user = "22222222-2222-4222-8222-222222222222";
function source(): BalanceDraftContent {
  return {
    counts: { [id]: "1," },
    observationTimes: { [id]: "2026-11-05T09:00:00-03:00" },
    notes: "  Observação anterior\ncom espaços  ",
    materials: [
      { id, name: "Material anterior", unit: "unidade", quantityDecimals: 0 },
    ],
    context: {
      mode: "scheduled",
      documentId: null,
      documentVersion: null,
      assignmentId: id,
      assignmentVersion: 1,
      referenceRevision: "5",
    },
  };
}
describe("physical BAL observations after reference changes", () => {
  it("keeps raw values, notes, old catalogue and observation instants without promoting any to the new count", () => {
    const old = source(),
      copy = structuredClone(old),
      current = {
        ...old.context,
        assignmentVersion: 2,
        referenceRevision: "6",
      };
    const next = beginBalanceObservation(old, current, [
      { ...old.materials[0], name: "Nome atual" },
    ]);
    expect(old).toEqual(copy);
    expect(next.counts).toEqual({});
    expect(next.observationTimes).toEqual({});
    expect(next.notes).toBe(old.notes);
    expect(next.previousObservations).toEqual([copy]);
    expect(next.context).toEqual(current);
    expect(next.materials[0].name).toBe("Nome atual");
  });
  it("compares mode, document identity/version, assignment identity/version and stock independently", () => {
    const c = source().context;
    expect(sameBalanceContext(c, { ...c })).toBe(true);
    for (const [key, value] of Object.entries({
      mode: "legacy",
      documentId: id,
      documentVersion: 1,
      assignmentId: user,
      assignmentVersion: 2,
      referenceRevision: "6",
    }))
      expect(sameBalanceContext(c, { ...c, [key]: value })).toBe(false);
  });
  it("does not move a draft to another documentary target", () => {
    expect(() =>
      beginBalanceObservation(
        source(),
        { ...source().context, documentId: id },
        [],
      ),
    ).toThrow("ficha original");
  });
  it("preserves multiple attempts and stops at the bound without dropping old snapshots", () => {
    let current = source();
    for (let i = 0; i < 10; i++)
      current = beginBalanceObservation(
        current,
        { ...current.context, referenceRevision: String(i + 6) },
        [],
      );
    expect(current.previousObservations).toHaveLength(10);
    expect(current.previousObservations?.[0]).toEqual(source());
    const copy = structuredClone(current);
    expect(() => beginBalanceObservation(current, current.context, [])).toThrow(
      "dez conferências",
    );
    expect(current).toEqual(copy);
  });
  it("accepts legacy content and rejects nested history, excessive history and extra fields", () => {
    expect(balanceDraftContent.parse(source())).toEqual(source());
    expect(
      balanceDraftContent.safeParse({
        ...source(),
        previousObservations: [{ ...source(), previousObservations: [] }],
      }).success,
    ).toBe(false);
    expect(
      balanceDraftContent.safeParse({
        ...source(),
        previousObservations: Array(11).fill(source()),
      }).success,
    ).toBe(false);
    expect(
      balanceDraftContent.safeParse({
        ...source(),
        previousObservations: [{ ...source(), status: "approved" }],
      }).success,
    ).toBe(false);
  });
  it("round trips the entire source through the local count copy and refuses inconsistent fields", () => {
    const content = beginBalanceObservation(
        source(),
        { ...source().context, referenceRevision: "6" },
        [],
      ),
      scope = { userId: user, patientId: id, documentId: null };
    let raw: string | null = null;
    const storage = {
      getItem: () => raw,
      setItem: (_k: string, v: string) => {
        raw = v;
      },
    };
    preserveCountCache(
      storage,
      "key",
      scope,
      {
        counts: content.counts,
        notes: content.notes,
        observationTimes: content.observationTimes,
        content,
      },
      null,
    );
    expect(parseCountCache(raw!, scope).content).toEqual(content);
    const bad = JSON.parse(raw!);
    bad.counts[id] = "5";
    expect(() => parseCountCache(JSON.stringify(bad), scope)).toThrow(
      "differs",
    );
    expect(() =>
      preserveCountCache(
        storage,
        "key",
        scope,
        { counts: {}, notes: "replaced", content },
        null,
      ),
    ).toThrow("differs");
  });
});
