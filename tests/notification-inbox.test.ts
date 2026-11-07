import { describe, expect, it } from "vitest";
import { parseInboxPage } from "@/lib/notifications/inbox";

const patient = "10000000-0000-4000-8000-000000000001", other = "10000000-0000-4000-8000-000000000002";
const empty = { data: [], total: 0, unreadCount: 0, page: 1, pageSize: 20, availability: "ready", careRecipientId: patient };
const row = { id: "20000000-0000-4000-8000-000000000001", care_recipient_id: patient, document_id: null, requisition_id: null, event_key: null, silent: false, state: "delivered", channel: "internal", seen_at: null, created_at: "2026-11-07T02:47:19.123456+00:00", operational_documents: null, document_events: null };
describe("notification read results", () => {
  it("distinguishes a confirmed empty patient inbox from a required context", () => {
    expect(parseInboxPage(empty, patient).availability).toBe("ready");
    expect(parseInboxPage({ ...empty, availability: "patient_context_required", careRecipientId: undefined }).availability).toBe("patient_context_required");
  });
  it("accepts actual nullable targets and a PostgreSQL offset timestamp", () => {
    const result = parseInboxPage({ ...empty, data: [row], total: 1, unreadCount: 1 }, patient);
    expect(result.data[0].document_id).toBeUndefined(); expect(result.data[0].seen_at).toBeNull();
  });
  it.each([null, {}, { ...empty, data: {} }, { ...empty, total: -1 }, { ...empty, data: [row] }, { ...empty, data: [row], total: 1, availability: "patient_context_required" }, { ...empty, careRecipientId: undefined }, { ...empty, data: [{ ...row, care_recipient_id: other }], total: 1 }, { ...empty, pageSize: 101 }])("rejects unreadable or internally inconsistent results without showing a false empty inbox", value => {
    expect(() => parseInboxPage(value, patient)).toThrow("A resposta da consulta de notificações não pôde ser lida");
  });
  it("rejects an old patient's otherwise valid result after changing selection", () => {
    expect(() => parseInboxPage(empty, other)).toThrow("Consulte novamente");
  });
});
