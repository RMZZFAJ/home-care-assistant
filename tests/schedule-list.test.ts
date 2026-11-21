import { expect, it } from "vitest";
import { parseScheduleListRead, schedulePeriod } from "@/lib/validation/schedule-list";
import { scheduleDisplayDay } from "@/lib/schedules/calendar";

const id = "20000000-0000-4000-8000-000000000001", other = "20000000-0000-4000-8000-000000000002";
const scope = { careRecipientId: id, from: "2100-06-01", until: "2100-06-30" };
const empty = { types: [], shifts: [], professionals: [], series: [], changes: [], events: [] };
const shift = { id, series_id: other, professional_id: id, professional_name: "Pessoa fictícia", shift_type_id: id, type_name: "Plantão", starts_at: "2100-06-01T02:30:00Z", ends_at: "2100-06-01T04:30:00Z", timezone: "America/Sao_Paulo", status: "published", version: 1, notes: "", is_exception: false };
const body = (data: object = empty) => ({ careRecipientId: id, period: { from: scope.from, until: scope.until }, data });

it("requires all workspace collections before confirming an empty agenda", () => {
  expect(parseScheduleListRead(body(), scope)).toEqual({ data: empty });
  for (const key of Object.keys(empty)) expect(() => parseScheduleListRead(body({ ...empty, [key]: undefined }), scope)).toThrow();
  expect(() => parseScheduleListRead({ data: empty }, scope)).toThrow();
});
it("binds the response to the selected patient and exact period", () => {
  for (const invalid of [{ ...body(), careRecipientId: other }, { ...body(), period: { ...scope, from: "2100-06-02" } }, { ...body(), period: { ...scope, until: "2100-07-01" } }])
    expect(() => parseScheduleListRead(invalid, scope)).toThrow("período");
});
it("rejects duplicate identities and inconsistent native patient fields", () => {
  for (const data of [
    { ...empty, shifts: [shift, shift] }, { ...empty, professionals: [{ id, name: "Pessoa" }, { id, name: "Pessoa" }] },
    { ...empty, shifts: [{ ...shift, care_recipient_id: other }] },
  ]) expect(() => parseScheduleListRead(body(data), scope)).toThrow("registros");
});
it("keeps carry-in occurrences even when their series ended before the selected month", () => {
  expect(parseScheduleListRead(body({ ...empty, shifts: [shift] }), scope).data.shifts[0].id).toBe(id);
  expect(scheduleDisplayDay(shift.starts_at, shift.timezone, scope.from)).toBe("2100-06-01");
  expect(scheduleDisplayDay(shift.starts_at, shift.timezone, "2100-05-30")).toBe("2100-05-31");
});
it("does not hide another valid occurrence or impose a100-row cap", () => {
  const shifts = Array.from({ length: 121 }, (_, index) => ({ ...shift, id: `30000000-0000-4000-8000-${String(index).padStart(12, "0")}` }));
  expect(parseScheduleListRead(body({ ...empty, shifts }), scope).data.shifts).toHaveLength(121);
});
it("rejects outside periods and unknown time zones without crashing the screen", () => {
  for (const value of [
    { ...shift, starts_at: "2100-07-01T06:00:00Z", ends_at: "2100-07-01T07:00:00Z" },
    { ...shift, ends_at: "2100-06-01T03:00:00Z" }, { ...shift, timezone: "not/a-zone" },
  ]) expect(() => parseScheduleListRead(body({ ...empty, shifts: [value] }), scope)).toThrow("horários");
  expect(parseScheduleListRead(body({ ...empty, shifts: [{ ...shift, ends_at: "2100-06-01T03:00:00.000001Z" }] }), scope).data.shifts).toHaveLength(1);
});
it("matches the native inclusive date limit without interpreting the device zone", () => {
  expect(schedulePeriod.safeParse({ from: "2100-06-01", until: "2100-07-13" }).success).toBe(true);
  for (const until of ["2100-07-14", "2100-05-31", "invalid"]) expect(schedulePeriod.safeParse({ from: "2100-06-01", until }).success).toBe(false);
  expect(scheduleDisplayDay("2100-06-01T01:30:00Z", "America/Sao_Paulo", "2100-05-01")).toBe("2100-05-31");
  expect(scheduleDisplayDay("2100-06-01T01:30:00Z", "UTC", "2100-05-01")).toBe("2100-06-01");
});
