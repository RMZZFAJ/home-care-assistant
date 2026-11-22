import { describe, expect, it } from "vitest";
import { parseGovernanceListRead } from "@/lib/validation/governance-list";

const patient = "10000000-0000-4000-8000-000000000001", other = "10000000-0000-4000-8000-000000000002";
const expected = { careRecipientId: patient, page: 1, pageSize: 20, status: "open", kind: "", query: "" };
const row = { id: other, care_recipient_id: patient, kind: "settings", proposed: { archiveDays: 9 }, current: { archiveDays: 7 }, proposed_by: other, proposerName: "Proponente", subjectName: null, status: "pending", base_version: 1, created_at: "2026-11-11T10:10:10.123456+00:00", decided_at: null, resolution: null };
const page = { ...expected, changes: [row], total: 1 };
describe("complete scoped governance proposal reads", () => {
  it("preserves native proposal fields,nullable resolution and exact PostgreSQL timestamps", () => {
    expect(parseGovernanceListRead(page, expected).changes[0]).toMatchObject({ id: other, proposed: row.proposed, created_at: row.created_at });
  });
  it.each([
    {}, { careRecipientId: other }, { page: 2 }, { pageSize: 5 }, { status: "all" }, { kind: "settings" }, { query: "other" },
    { changes: [] }, { total: 0 }, { total: 21 }, { changes: [row, row], total: 2 },
    { changes: [{ ...row, care_recipient_id: other }] }, { changes: [{ ...row, proposed: null }] },
  ])("rejects incomplete or mismatched results: %j", patch => {
    const value = Object.keys(patch).length ? { ...page, ...patch } : {};
    expect(() => parseGovernanceListRead(value, expected)).toThrow("A resposta da consulta de propostas não pôde ser lida");
  });
  it("checks explicit status and type while retaining future readonly presentation in all-status history", () => {
    expect(() => parseGovernanceListRead({ ...page, ...expected, kind: "membership" }, { ...expected, kind: "membership" })).toThrow();
    expect(() => parseGovernanceListRead({ ...page, status: "applied" }, { ...expected, status: "applied" })).toThrow();
    expect(parseGovernanceListRead({ ...page, status: "all", changes: [{ ...row, kind: "constructor", status: "future" }] }, { ...expected, status: "all" }).changes[0].status).toBe("future");
  });
  it("accepts the last page and an independently confirmed out-of-range empty result", () => {
    expect(parseGovernanceListRead({ ...page, page: 6, total: 101 }, { ...expected, page: 6 }).changes).toHaveLength(1);
    expect(parseGovernanceListRead({ ...page, page: 7, total: 101, changes: [] }, { ...expected, page: 7 }).changes).toEqual([]);
  });
});
