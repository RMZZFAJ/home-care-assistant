import { describe, expect, it } from "vitest";
import { parseDocumentHistoryRead } from "../src/lib/validation/document-history";

const documentId = "10000000-0000-4000-8000-000000000001";
const actorId = "20000000-0000-4000-8000-000000000001";
const value = () => {
  const snapshot = (version: number) => ({ id: `30000000-0000-4000-8000-${String(version).padStart(12, "0")}`, version, action: "com.approve", recordedAt: "2026-11-08T12:00:00.123456+00:00", hash: String(version).repeat(64), actorId, actorName: "Nome preservado", actorSource: "event_snapshot", code: "000001", protocol: null, type: "COM", facts: [{ key: "quantity", label: "Quantidade", value: "999999999999,999999" }], additionalFields: true });
  return { data: { documentId, selected: snapshot(3), before: snapshot(2), versions: [1, 2, 3].map(version => ({ version, action: "com.approve", createdAt: "2026-11-08T12:00:00.123456+00:00", hash: String(version).repeat(64), actorId })) } };
};
const parse = (body: unknown, selected = 3, before: number | null = null) => parseDocumentHistoryRead(body, documentId, selected, before);
const rejects = (body: unknown) => expect(() => parse(body)).toThrow("A resposta do histórico não pôde ser conferida");

describe("document history read boundary", () => {
  it("preserves frozen decimal text, leading zeros, missing protocol and the extra-facts notice while accepting list metadata", () => {
    const result = parse(value()).data;
    expect(result.selected.facts[0].value).toBe("999999999999,999999");
    expect(result.selected).toMatchObject({ code: "000001", protocol: null, additionalFields: true });
    expect(result.selected.actorName).toBe("Nome preservado");
  });
  it("accepts an explicit nonconsecutive comparison and a first version without inventing a predecessor", () => {
    const body = value(); body.data.before = { ...body.data.before, ...body.data.selected, id: "40000000-0000-4000-8000-000000000001", version: 1, hash: "1".repeat(64) };
    expect(parse(body, 3, 1).data.before?.version).toBe(1);
    const first = { data: { ...body.data, selected: body.data.before, before: null } };
    expect(parse(first, 1).data.before).toBeNull();
  });
  it("rejects another document, selected version or absent immediate predecessor", () => {
    const other = value(); other.data.documentId = actorId; rejects(other);
    expect(() => parse(value(), 2)).toThrow("não pôde ser conferida");
    rejects({ data: { ...value().data, before: null } });
  });
  it("rejects malformed fields, dates and numeric facts without throwing a private decoder message", () => {
    rejects({ data: { ...value().data, selected: null } });
    const date = value(); date.data.selected.recordedAt = "not an instant"; rejects(date);
    const number = value(); rejects({ data: { ...number.data, selected: { ...number.data.selected, facts: [{ key: "x", label: "x", value: 1 }] } } });
    const body = value(); body.data.selected.facts.push(body.data.selected.facts[0]); rejects(body);
  });
  it("requires selected and previous hashes/actions in a unique version index", () => {
    const hash = value(); hash.data.selected.hash = "0".repeat(64); rejects(hash);
    const action = value(); action.data.before.action = "ent.receive"; rejects(action);
    const duplicate = value(); duplicate.data.versions.push(duplicate.data.versions[0]); rejects(duplicate);
  });
  it("retains unknown historical authors and system authors only with consistent provenance", () => {
    const body = value();
    expect(parse({ data: { ...body.data, selected: { ...body.data.selected, actorName: null, actorSource: "unknown" } } }).data.selected.actorName).toBeNull();
    expect(parse({ data: { ...body.data, selected: { ...body.data.selected, actorId: null, actorName: null, actorSource: "system" } } }).data.selected.actorSource).toBe("system");
    rejects({ data: { ...body.data, selected: { ...body.data.selected, actorSource: "self_verified" } } });
    rejects({ data: { ...body.data, selected: { ...body.data.selected, actorSource: "system" } } });
  });
  it("rejects mismatched previous type or the same event masquerading as two versions", () => {
    const type = value(); type.data.before.type = "ENT"; rejects(type);
    const id = value(); id.data.before.id = id.data.selected.id; rejects(id);
  });
});
