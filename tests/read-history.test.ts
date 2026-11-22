import { describe, expect, it } from "vitest";
import { auditQuerySchema, parseAuditPage } from "@/lib/validation/audit";
import { auditActionLabel, auditEntityLabel } from "@/lib/audit-presentation";

const empty = { data: [], total: 0, page: 1, pageSize: 20, actions: [], entityTypes: [] };
describe("bounded audit reads distinguish empty data from an unreadable response", () => {
  it("uses normal defaults only when the query values are omitted", () => {
    expect(auditQuerySchema.parse({})).toEqual({ query: "", page: 1, pageSize: 20 });
    expect(auditQuerySchema.parse({ page: "100000", pageSize: "100" }).pageSize).toBe(100);
  });
  it.each([null, "null", 0, 101, -1, 1.5])("rejects an invalid size %s", pageSize => {
    expect(auditQuerySchema.safeParse({ pageSize }).success).toBe(false);
  });
  it("rejects an inverted period and malformed resource reference", () => {
    expect(auditQuerySchema.safeParse({ from: "2026-11-06", to: "2026-11-05" }).success).toBe(false);
    expect(auditQuerySchema.safeParse({ reference: "not-a-resource" }).success).toBe(false);
  });
  it("accepts a confirmed empty result and keeps an offset timestamp and original actor identity", () => {
    expect(parseAuditPage(empty).data).toEqual([]);
    const data = [{ id: "10000000-0000-4000-8000-000000000001", actor_id: null, actor_name_current: null, action: "invitation.created", entity_type: "invitation", entity_id: null, metadata: {}, created_at: "2026-01-01T12:00:00.123456+00:00" }];
    expect(parseAuditPage({ ...empty, data, total: 1 }).data).toEqual(data);
  });
  it.each([{}, null, { ...empty, data: {} }, { ...empty, total: -1 }, { ...empty, pageSize: 101 }])("never converts an unrecognized response to an empty history", value => {
    expect(() => parseAuditPage(value)).toThrow("A resposta da consulta do histórico não pôde ser lida");
  });
});
describe("audit labels preserve known meaning and an explicit unknown fallback", () => {
  it("labels invitation, governance and document events in Portuguese", () => {
    expect(auditActionLabel("invitation.created")).toBe("Convite criado");
    expect(auditActionLabel("access.proposed.global")).toBe("Proposta global registrada");
    expect(auditActionLabel("ent.receive")).toBe("Recebimento conferido");
    expect(auditEntityLabel("access_change")).toBe("Proposta de configuração");
  });
  it("does not invent a known action or entity for a future record", () => {
    expect(auditActionLabel("future.event")).toBe("Evento registrado sem rótulo específico");
    expect(auditEntityLabel("future_type")).toBe("Recurso sem rótulo específico");
  });
});
