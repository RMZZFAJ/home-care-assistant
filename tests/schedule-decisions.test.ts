import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { calendarPeriod, adjacentPeriod } from "@/lib/schedules/calendar";
import { ScheduleReviewDetails } from "@/components/schedules/schedule-review";
import { scheduleCommandSchema } from "@/lib/validation/schedules";
import type { ScheduleWorkspace, ShiftChange } from "@/types/schedules";

const id = "20000000-0000-4000-8000-000000000001";
describe("D1 schedule decisions", () => {
  it("shows the actual week/month consistently, including leap February and month navigation", () => {
    expect(calendarPeriod("2026-11-05", "week")).toMatchObject({ from: "2026-11-02", until: "2026-11-08" });
    expect(calendarPeriod("2028-02-20", "month").dates).toHaveLength(29);
    expect(calendarPeriod("2026-11-05", "month")).toMatchObject({ from: "2026-11-01", until: "2026-11-30" });
    expect(adjacentPeriod("2026-01-31", "month", 1)).toBe("2026-02-01");
    expect(adjacentPeriod("2026-11-05", "week", -1)).toBe("2026-10-29");
  });
  it("requires the version that was displayed and an explicit rejection reason", () => {
    const base = { careRecipientId: id, idempotencyKey: id, command: { action: "decide_change", body: { id, approve: true } } };
    expect(scheduleCommandSchema.safeParse(base).success).toBe(false);
    expect(scheduleCommandSchema.safeParse({ ...base, expectedVersion: 1 }).success).toBe(true);
    expect(scheduleCommandSchema.safeParse({ ...base, expectedVersion: 1, command: { action: "decide_change", body: { id, approve: false } } }).success).toBe(false);
    expect(scheduleCommandSchema.safeParse({ ...base, expectedVersion: 1, command: { action: "decide_change", body: { id, approve: true, timezone: "UTC" } } }).success).toBe(false);
  });
  it("presents both people, overnight dates, immutable notes and the BAL consequence without editable proposal fields", () => {
    const before = { professional_id: id, professional_name: "Juliana fictícia", starts_at: "2026-11-06T22:00:00Z", ends_at: "2026-11-07T10:00:00Z", timezone: "America/Sao_Paulo", notes: "Nota original preservada" };
    const change: ShiftChange = { id, shift_id: id, professional_id: id, proposed_professional_id: id, starts_at: before.starts_at, ends_at: before.ends_at, reason: "Substituição previamente combinada", status: "pending", shift_version: 3, version: 1, created_by: id, source_snapshot: before, proposed_snapshot: { ...before, professional_name: "Sheila fictícia", notes: "Nota própria da proposta" }, notes: "Nota própria da proposta", is_stale: false, current_professional_name: "Nome cadastral diferente", current_proposed_professional_name: "Outro nome atual", bal_impact: { has_assignment: true, changes_window: false, requires_family_decision: false, assignment_deadline: before.ends_at } };
    const workspace: ScheduleWorkspace = { types: [], shifts: [], professionals: [], series: [], changes: [change], events: [] };
    const html = renderToStaticMarkup(createElement(ScheduleReviewDetails, { review: { command: { action: "decide_change", body: { id, approve: true } }, version: 1, workspace } }));
    for (const fact of ["Juliana fictícia", "Sheila fictícia", "06/11/2026", "07/11/2026", "19:00", "07:00", "America/Sao_Paulo", "Nota original preservada", "Nota própria da proposta", "A janela e o prazo do BAL permanecem"]) expect(html).toContain(fact);
    expect(html).not.toContain("Nome cadastral diferente");
    expect(html).not.toMatch(/<(input|select|textarea)\b/);
  });
});
