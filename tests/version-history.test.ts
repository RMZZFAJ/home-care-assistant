import { beforeEach, describe, expect, it, vi } from "vitest";
import { compareVersionFacts, parseHistorySnapshot, snapshotFacts } from "../src/lib/documents/version-history";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("../src/lib/server/api", () => ({
  rpc, databaseError: (error: unknown) => { throw error; },
  ApiError: class extends Error { constructor(public code: string, message: string) { super(message); } },
}));
import { documentHistory } from "../src/lib/server/document-history";
import type { SupabaseClient } from "@supabase/supabase-js";

const id = "10000000-0000-4000-8000-000000000001";
const event = (version: number, actor: string | null = "20000000-0000-4000-8000-000000000001", name: string | null = "Nome preservado") => ({
  id: "evento" + version, version, actor_id: actor, actor_name: name, action: "com.approve", created_at: "2026-11-08T12:00:00Z", content_hash: String(version).repeat(64),
  body_text: JSON.stringify({ id, type: "COM", code: "COM-histórico", protocol: "protocolo", version, status: "issued", payload: { notes: "Motivo antigo\nRessalva antiga", origin: "purchase" }, lines: [{ id: "linha", name_snapshot: "Material da época", quantity: String(version) }] }),
});
function client(rows: ReturnType<typeof event>[]) {
  const query = { select: vi.fn(), eq: vi.fn(), in: vi.fn(), order: vi.fn() };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.in.mockReturnValue(query); query.order.mockResolvedValue({ data: rows, error: null });
  return { value: { from: vi.fn(() => query) } as unknown as SupabaseClient, query };
}
const versions = [{ version: 1, action: "com.issued", createdAt: "2026-11-08T10:00:00Z", hash: "1".repeat(64) }, { version: 2, action: "com.approve", createdAt: "2026-11-08T11:00:00Z", hash: "2".repeat(64) }];
beforeEach(() => { rpc.mockReset(); rpc.mockResolvedValue({ events: versions }); });

describe("frozen document history", () => {
  it("retains exact numeric tokens, zero, null, missing and free text without enum substitution", () => {
    const b = parseHistorySnapshot('{"lines":[{"id":"x","quantity":999999999999.999999,"current_stock":0,"notes":"purchase","stock_observation_at":null}]}');
    const facts = snapshotFacts(b).facts;
    expect(facts.find(f => f.key.endsWith("/quantity"))?.value).toBe("999999999999,999999");
    expect(facts.find(f => f.key.endsWith("/current_stock"))?.value).toBe("0");
    expect(facts.find(f => f.key.endsWith("/notes"))?.value).toBe("purchase");
    expect(facts.find(f => f.key.endsWith("/stock_observation_at"))?.value).toBe("Não preservado");
    expect(facts.some(f => f.key.endsWith("/accepted_quantity"))).toBe(false);
    expect(parseHistorySnapshot('{"x":1.000001}').x).toBe("1.000001");
    expect(snapshotFacts({ createdAt: "2020-03-01T12:00:00Z" }).facts[0].label).toBe("Data de criação preservada no conteúdo");
  });
  it("matches line identity across reordering and preserves additions/removals and a frozen rename", () => {
    const a = snapshotFacts({ lines: [{ id: "a", name_snapshot: "Nome antigo", quantity: "1" }, { id: "b", name_snapshot: "Outro", quantity: "2" }] }).facts;
    const b = snapshotFacts({ lines: [{ id: "b", name_snapshot: "Outro", quantity: "2" }, { id: "a", name_snapshot: "Nome no segundo evento", quantity: "3" }] }).facts;
    const changes = compareVersionFacts(a, b);
    expect(changes.every(c => !c.key.startsWith("lines/b/"))).toBe(true);
    expect(changes.find(c => c.key === "lines/a/quantity")).toMatchObject({ before: "1", after: "3" });
    expect(changes.find(c => c.key === "lines/a/name_snapshot")).toMatchObject({ before: "Nome antigo", after: "Nome no segundo evento" });
    expect(compareVersionFacts(a, []).find(c => c.key === "lines/b/quantity")?.after).toBe("Não consta nesta versão");
  });
  it("marks unmapped facts explicitly and excludes authority or transport data instead of dumping raw JSON", () => {
    const result = snapshotFacts({ payload: { notes: "Ressalva\ncompleta", futureFact: { private: "não expor" } }, authority: { accessToken: "segredo" }, idempotency_key: "intenção" });
    expect(result.additionalFields).toBe(true);
    expect(result.facts).toEqual([{ key: "payload/notes", label: "Declaração · Observações", value: "Ressalva\ncompleta" }]);
  });
  it("keeps unknown statuses distinguishable and qualifies validation as a receipt outcome", () => {
    const a = snapshotFacts({ status: "future-one" }).facts, b = snapshotFacts({ status: "future-two" }).facts;
    expect(compareVersionFacts(a, b)).toHaveLength(1);
    const facts = snapshotFacts({ workflow: { state: "approved" }, purchaseReceipts: [{ id: "parcela", state: "approved" }], purchaseProgress: { state: "pending_approval", remainingExpectation: "1.000001" } }).facts;
    expect(facts.find(f => f.key === "workflow/state")?.value).toBe("Aprovado");
    expect(facts.find(f => f.key === "purchaseReceipts/parcela/state")?.value).toBe("Validado");
    expect(facts.find(f => f.key === "purchaseProgress/state")?.value).toBe("Aguardando aprovação");
    expect(facts.find(f => f.key === "purchaseProgress/remainingExpectation")?.value).toBe("1,000001");
  });
  it("qualifies identity provenance and a request decision without turning it into document status", () => {
    const facts = snapshotFacts({ actors: { issuer: { name: "Nome declarado", source: "profile_fallback", state: "SP" } }, deliveryCancellation: { request: { status: "consented" } } }).facts;
    expect(facts.find(f => f.key === "actors/issuer/source")?.value).toContain("não comprova autoria nominal histórica");
    expect(facts.find(f => f.key === "deliveryCancellation/request/status")?.value).toBe("Consentido");
    expect(facts.find(f => f.key === "actors/issuer/state")).toMatchObject({ label: "Identidades na origem · Responsável na origem · UF do registro profissional", value: "SP" });
    expect(snapshotFacts({ event: { role: "__proto__" } }).facts[0].value).toBe("__proto__");
  });
  it("uses only frozen names and revalidates authority after the exact event read", async () => {
    const c = client([event(1), event(2)]), result = await documentHistory(c.value, id, 2);
    expect(result.before?.version).toBe(1); expect(result.selected.actorName).toBe("Nome preservado");
    expect(result.selected.actorSource).toBe("event_snapshot"); expect(rpc).toHaveBeenCalledTimes(2);
    expect(c.query.select.mock.calls[0][0]).toContain("body_text:body::text");
    expect(c.value.from).toHaveBeenCalledExactlyOnceWith("document_events");
  });
  it("does not use a current profile name when the event name is absent; system is explicit", async () => {
    const c = client([event(1, undefined, null), event(2, null, null)]), result = await documentHistory(c.value, id, 2);
    expect(result.before).toMatchObject({ actorName: null, actorSource: "unknown" });
    expect(result.selected).toMatchObject({ actorName: null, actorSource: "system" });
  });
  it("cannot release a result if authority is revoked while querying", async () => {
    const c = client([event(1), event(2)]);
    rpc.mockResolvedValueOnce({ events: versions }).mockRejectedValueOnce(new Error("revoked"));
    await expect(documentHistory(c.value, id, 2)).rejects.toThrow("revoked");
  });
  it("rejects an unavailable/reversed version and never replaces it with the latest", async () => {
    const c = client([event(1), event(2)]);
    for (const [selected, before] of [[3, undefined], [1, 2], [2, 2]] as const) await expect(documentHistory(c.value, id, selected, before)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(c.value.from).not.toHaveBeenCalled();
  });
  it("rejects missing or mismatched frozen rows rather than inventing history", async () => {
    await expect(documentHistory(client([event(2)]).value, id, 2)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const wrong = event(2); wrong.body_text = wrong.body_text.replace(id, "outro-documento");
    await expect(documentHistory(client([event(1), wrong]).value, id, 2)).rejects.toMatchObject({ code: "CONTENT_INVALID" });
  });
});
