import { expect, it } from "vitest";
import { parseConsumptionPage, parseConsumptionListRead } from "@/lib/validation/consumption";

const patient = "20000000-0000-4000-8000-000000000001";
const row = (index: number) => ({
  id: `30000000-0000-4000-8000-${String(100 - index).padStart(12, "0")}`,
  care_recipient_id: patient, kind: "shortage", location: "FAMILY",
  status: "reported", body: "Relato fictício", version: 1,
  created_at: "2026-11-11T09:00:00.123456+00:00", reported_by: patient, reported_name: null,
});

it("refuses duplicate report identities instead of silently merging them", () => {
  expect(() => parseConsumptionPage({ data: [row(0), row(0)], next: null }, patient)).toThrow();
});
it("refuses a continuation cursor that does not identify the last complete-page row", () => {
  const data = Array.from({ length: 20 }, (_, index) => row(index));
  expect(() => parseConsumptionPage({ data, next: { at: data[0].created_at, id: data[0].id } }, patient)).toThrow();
});

const query = new URLSearchParams({ kind: "shortage", q: "  Relato  " });
const envelope = (data = [row(0)], before: { at: string; id: string } | null = null) => ({
  data, next: null, careRecipientId: patient, pageSize: 20, before,
  filters: { kind: "shortage", status: "", search: "Relato", from: "", to: "", sourceReminder: "" },
});
it("binds every read to its patient,filters,size and requested cursor", () => {
  const value = envelope();
  expect(parseConsumptionListRead(value, patient, query).data).toHaveLength(1);
  for (const invalid of [
    { ...value, careRecipientId: row(0).id }, { ...value, pageSize: 21 }, { ...value, before: { at: row(0).created_at, id: row(0).id } },
    ...Object.keys(value.filters).map(key => ({ ...value, filters: { ...value.filters, [key]: "different" } })),
    { data: [], next: null },
  ]) expect(() => parseConsumptionListRead(invalid, patient, query)).toThrow();
  expect(parseConsumptionListRead(envelope([]), patient, query)).toEqual({ data: [], next: null });
});
it("requires strict database order including microseconds before the UUID tie-breaker", () => {
  const newer = { ...row(1), created_at: "2026-11-11T09:00:00.123457+00:00" }, older = row(0);
  expect(parseConsumptionPage({ data: [newer, older], next: null }, patient).data).toEqual([newer, older]);
  expect(() => parseConsumptionPage({ data: [older, newer], next: null }, patient)).toThrow();
  expect(() => parseConsumptionPage({ data: [row(1), row(0)], next: null }, patient)).toThrow();
  expect(parseConsumptionPage({ data: [row(0), row(1)], next: null }, patient).data).toHaveLength(2);
});
it("accepts an advancing page and refuses a repeated or newer cursor boundary", () => {
  const before = { at: row(0).created_at, id: row(0).id };
  expect(parseConsumptionListRead(envelope([row(1)], before), patient, query, before).data[0].id).toBe(row(1).id);
  for (const data of [[row(0)], [{ ...row(1), created_at: "2026-11-11T09:00:00.123457+00:00" }]])
    expect(() => parseConsumptionListRead(envelope(data, before), patient, query, before)).toThrow("não avança");
  expect(() => parseConsumptionListRead(envelope([row(1)], before), patient, query, { ...before, id: row(2).id })).toThrow();
});
it("accepts equivalent timestamp offsets without rounding away the native cursor", () => {
  const before = { at: "2026-11-11T06:00:00.123456-03:00", id: row(0).id };
  const last = row(19), data = Array.from({ length: 20 }, (_, index) => row(index));
  expect(parseConsumptionPage({ data, next: { at: "2026-11-11T06:00:00.123456-03:00", id: last.id } }, patient).next?.id).toBe(last.id);
  expect(parseConsumptionListRead(envelope([row(1)], { at: row(0).created_at, id: row(0).id }), patient, query, before).data).toHaveLength(1);
});
it("does not allow a short or empty page to announce another page", () => {
  for (const data of [[], [row(0)]]) expect(() => parseConsumptionPage({ data, next: { at: row(0).created_at, id: row(0).id } }, patient)).toThrow();
});
