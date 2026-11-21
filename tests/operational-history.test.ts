import { describe, expect, it } from "vitest";
import { parseAuditListRead } from "@/lib/validation/audit";
import { parseScheduleHistoryRead, scheduleHistoryQuerySchema } from "@/lib/validation/schedule-history";

const patient = "10000000-0000-4000-8000-000000000001", reader = "10000000-0000-4000-8000-000000000002", id = "10000000-0000-4000-8000-000000000003";
const at = "2026-11-11T11:00:00.123456+00:00";
const filters = { query: "", reference: "", action: "", entityType: "", from: "", to: "" };
const auditSelection = { ...filters, careRecipientId: patient, page: 1, pageSize: 20 };
const auditRow = { id, actor_id: reader, actor_name_current: "Nome atual", action: "future.event", entity_type: "future_type", entity_id: null, metadata: { care_recipient_id: patient }, created_at: at };
const auditPage = { data: [auditRow], total: 1, page: 1, pageSize: 20, actions: ["future.event"], entityTypes: ["future_type"], careRecipientId: patient, filters };
describe("scoped complete audit history", () => {
  it("keeps unknown events and explicit current-name attribution", () => {
    expect(parseAuditListRead(auditPage, auditSelection).data[0]).toEqual(auditRow);
  });
  it.each([
    { careRecipientId: reader }, { page: 2 }, { pageSize: 10 }, { filters: { ...filters, query: "other" } },
    { data: [] }, { total: 21 }, { data: [auditRow, auditRow], total: 2 }, { data: [{ ...auditRow, metadata: { care_recipient_id: reader } }] },
  ])("rejects incomplete,duplicate or mismatched audit reads: %j", patch => {
    expect(() => parseAuditListRead({ ...auditPage, ...patch }, auditSelection)).toThrow();
  });
  it("checks selected event,type and reference without changing original facts", () => {
    for (const patch of [{ action: "other" }, { entityType: "other" }, { reference: reader }]) {
      expect(() => parseAuditListRead({ ...auditPage, filters: { ...filters, ...patch } }, { ...auditSelection, ...patch })).toThrow();
    }
    expect(parseAuditListRead({ ...auditPage, page: 6, total: 101 }, { ...auditSelection, page: 6 }).data).toHaveLength(1);
  });
});
const scheduleFilters = { query: "", action: "", reference: "", from: "", to: "" };
const selection = { ...scheduleFilters, careRecipientId: patient, readerId: reader, page: 1, pageSize: 20 };
const event = { id, care_recipient_id: patient, series_id: null, shift_id: null, professional_id: reader, actor_id: reader, actor_name_snapshot: "Nome preservado", action: "schedule.change", reason: "Motivo preservado", created_at: at };
const schedulePage = { ...selection, filters: scheduleFilters, scope: "own", data: [event], total: 1 };
describe("complete authorized schedule event history", () => {
  it("preserves snapshot name,reason and microseconds in the own view", () => {
    expect(parseScheduleHistoryRead(schedulePage, selection).data[0]).toEqual(event);
    expect(parseScheduleHistoryRead({ ...schedulePage, scope: "team", data: [{ ...event, professional_id: null, actor_name_snapshot: null }] }, selection).data[0].actor_name_snapshot).toBeNull();
  });
  it.each([
    { careRecipientId: reader }, { readerId: patient }, { page: 2 }, { pageSize: 10 }, { filters: { ...scheduleFilters, action: "other" } },
    { data: [] }, { total: 21 }, { data: [event, event], total: 2 }, { data: [{ ...event, care_recipient_id: reader }] },
    { data: [{ ...event, professional_id: patient }] }, { data: [{ ...event, professional_id: null }] },
  ])("rejects wrong scope,reader,own row or incomplete event page: %j", patch => {
    expect(() => parseScheduleHistoryRead({ ...schedulePage, ...patch }, selection)).toThrow();
  });
  it("checks explicit reference/action and accepts the independently confirmed last page", () => {
    for (const patch of [{ action: "other" }, { reference: reader }]) {
      expect(() => parseScheduleHistoryRead({ ...schedulePage, filters: { ...scheduleFilters, ...patch } }, { ...selection, ...patch })).toThrow();
    }
    expect(parseScheduleHistoryRead({ ...schedulePage, page: 6, total: 101 }, { ...selection, page: 6 }).data).toHaveLength(1);
  });
  it("bounds native query values and rejects inverted periods and forged references", () => {
    expect(scheduleHistoryQuerySchema.parse({})).toEqual({ query: "", page: 1, pageSize: 20 });
    for (const patch of [{ pageSize: null }, { pageSize: 101 }, { page: 0 }, { reference: "not-an-id" }, { from: "2026-11-11", to: "2026-11-10" }]) expect(scheduleHistoryQuerySchema.safeParse(patch).success).toBe(false);
  });
});
