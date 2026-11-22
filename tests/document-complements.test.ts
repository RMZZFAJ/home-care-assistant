import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/documents/[id]/complements/route";
import { documentComplementSchema, linkComplementInput, parseComplementAttempt, parseComplementCandidates, parseDocumentComplements, requireComplementConfirmation } from "@/lib/documents/document-complements";
import { documentEventLabel } from "@/lib/notifications/event-labels";
const source = "30000000-0000-4000-8000-000000000001", child = "30000000-0000-4000-8000-000000000002", key = "30000000-0000-4000-8000-000000000003";
const ref = { id: child, type: "COM", code: "COM-0002", protocol: "COM-controlled", version: 3, issuedAt: "2026-11-12T00:00:00Z" };
const input = { childId: child, sourceVersion: 4, childVersion: 3, reason: "Complemento formal desta ficha.", idempotencyKey: key };
const link = { id: key, role: "supplement", accessible: true, document: ref, reason: input.reason, actorName: "Autora preservada", recordedAt: "2026-11-12T00:01:00Z", sourceVersion: 4, childVersion: 3 };
const result = { link, key, recovered: true };
describe("formal document complements", () => {
  it("binds context and page instead of displaying a successful response for another document", () => {
    const data = { document: { ...ref, id: source, type: "REQ" }, careRecipientId: source, page: 1, size: 20, total: 1, links: [link], creatableTypes: ["REQ", "COM"] };
    expect(parseDocumentComplements(data, source, 1).links).toHaveLength(1);
    expect(() => parseDocumentComplements(data, child, 1)).toThrow();
    expect(() => parseDocumentComplements(data, source, 2)).toThrow();
    expect(() => parseDocumentComplements({ ...data, total: 0 }, source, 1)).toThrow();
    expect(() => parseDocumentComplements({ ...data, total: 2 }, source, 1)).toThrow();
    expect(() => parseDocumentComplements({ ...data, total: 2, links: [link, link] }, source, 1)).toThrow();
  });
  it("rejects data hidden in a restricted relation rather than concealing it in the browser", () => {
    const restricted = { id: key, role: "supplement", accessible: false };
    expect(documentComplementSchema.safeParse(restricted).success).toBe(true);
    for (const extra of [{ document: ref }, { reason: input.reason }, { actorName: "Não autorizado" }, { balance: 30 }])
      expect(documentComplementSchema.safeParse({ ...restricted, ...extra }).success).toBe(false);
  });
  it("checks type, search, page and issuance of candidate responses", () => {
    const data = { sourceId: source, sourceVersion: 4, type: "COM", search: "0002", page: 1, size: 20, total: 1, documents: [ref] };
    expect(parseComplementCandidates(data, source, "COM", "0002", 1).documents[0].id).toBe(child);
    for (const value of [{ ...data, total: 2 }, { ...data, total: 2, documents: [ref, ref] }, { ...data, sourceId: child }, { ...data, type: "ENT" }, { ...data, search: "outra" }, { ...data, documents: [{ ...ref, protocol: null }] }, { ...data, documents: [{ ...ref, id: source }] }])
      expect(() => parseComplementCandidates(value, source, "COM", "0002", 1)).toThrow();
  });
  it("confirms the exact frozen intention and refuses a swapped relation, reason or version", () => {
    expect(requireComplementConfirmation(result, input).key).toBe(key);
    for (const change of [{ document: { ...ref, id: source } }, { sourceVersion: 5 }, { childVersion: 4 }, { reason: "Outro motivo." }, { role: "source" }, { accessible: false }])
      expect(() => requireComplementConfirmation({ ...result, link: { ...link, ...change } }, input)).toThrow();
    expect(() => requireComplementConfirmation({ ...result, key: child }, input)).toThrow();
  });
  it("distinguishes a serialized absent attempt from a confirmed own result", () => {
    expect(parseComplementAttempt({ sourceId: source, key, state: "not_found", result: null }, source, input).state).toBe("not_found");
    expect(parseComplementAttempt({ sourceId: source, key, state: "confirmed", result }, source, input).state).toBe("confirmed");
    expect(() => parseComplementAttempt({ sourceId: source, key, state: "confirmed", result: null }, source, input)).toThrow();
    expect(() => parseComplementAttempt({ sourceId: child, key, state: "confirmed", result }, source, input)).toThrow();
  });
  it("does not accept client author, access, stock effects or an empty reason", () => {
    expect(linkComplementInput.safeParse(input).success).toBe(true);
    for (const change of [{ actorId: source }, { accessible: true }, { stockEffect: true }, { reason: "  " }, { sourceVersion: 0 }])
      expect(linkComplementInput.safeParse({ ...input, ...change }).success).toBe(false);
  });
  it("rejects invalid HTTP identities and forged fields before authentication", async () => {
    for (const change of [{ actorId: source }, { childId: "bad" }, { reason: " " }]) {
      const request = new Request("https://care.example/api/documents/" + source + "/complements", { method: "POST", headers: { "content-type": "application/json", origin: "https://care.example" }, body: JSON.stringify({ ...input, ...change }) });
      expect((await POST(request, { params: Promise.resolve({ id: source }) })).status).toBe(400);
    }
    for (const query of ["mode=candidates", "page=0", "mode=attempt", "mode=attempt&key=bad", "unexpected=true"])
      expect((await GET(new Request("https://care.example/?" + query), { params: Promise.resolve({ id: source }) })).status).toBe(400);
  });
  it("names both linkage acts independently of fulfillment or awareness", () => {
    for (const type of ["req", "com", "ent", "bal"]) {
      expect(documentEventLabel(type + ".complement_added")).toMatch(/complementar/);
      expect(documentEventLabel(type + ".complement_linked")).toMatch(/Vínculo/);
    }
  });
});
