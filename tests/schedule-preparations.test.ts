import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  initialScheduleSeries,
  initialScheduleType,
  scheduleCreationFields,
  scheduleCreationCommand,
} from "@/lib/schedules/creation";
import {
  schedulePreparationSaveSchema,
  schedulePreparationCommitSchema,
  parseSchedulePreparationReceipt,
  parseSchedulePreparationConfirmation,
  parseScheduleRecovery,
} from "@/lib/validation/schedule-preparations";
import {
  parsePrivateDraft,
  parsePrivateDraftResult,
} from "@/lib/validation/private-draft-results";
import { creationDraftCommandSchema } from "@/lib/validation/creation-drafts";
import { SchedulePreparationSummary } from "@/components/schedules/schedule-preparation-summary";
import type { ScheduleWorkspace } from "@/types/schedules";

const actor = "11111111-1111-4111-8111-111111111111",
  patient = "22222222-2222-4222-8222-222222222222",
  type = "33333333-3333-4333-8333-333333333333",
  draft = "44444444-4444-4444-8444-444444444444",
  key = "55555555-5555-4555-8555-555555555555";
const workspace: ScheduleWorkspace = {
  professionals: [{ id: actor, name: "Pessoa fictícia" }],
  types: [
    {
      id: type,
      name: "Tipo fictício",
      starts_local: "07:00:00",
      duration_minutes: 720,
      version: 3,
      is_active: true,
    },
  ],
  shifts: [],
  series: [],
  changes: [],
  events: [],
};
const series = {
  form: "series" as const,
  professionalId: actor,
  shiftTypeId: type,
  shiftTypeVersion: 3,
  recurrence: "weekly" as const,
  weekdays: [1, 3],
  dates: ["2100-03-02", "2100-03-04"],
  cycle: "12x36" as const,
  from: "2100-03-01",
  until: "2100-03-06",
  timezone: "America/Sao_Paulo",
  notes: "Observação própria",
  reason: "",
};
const fields = {
  form: "type" as const,
  name: " Tipo próprio ",
  start: "07:00",
  duration: "720",
  active: false,
};
it.each(["07:00", "07:00:00", "07:00:37"])(
  "keeps a type's native time when editing another field (%s)",
  (starts_local) => {
    const initial = initialScheduleType({
      ...workspace.types[0],
      starts_local,
    });
    if (initial.form !== "type") throw new Error("Expected a type editor");
    const command = scheduleCreationCommand({
      ...initial,
      name: "Nome alterado",
    });
    expect(command.action).toBe("type");
    if (command.action === "type")
      expect(command.body.startsLocal).toBe(
        starts_local === "07:00:00" ? "07:00" : starts_local,
      );
  },
);
const scope = {
  userId: actor,
  patientId: patient,
  kind: "SCHEDULE" as const,
  purpose: "shift_type_create" as const,
  targetDocumentId: null,
  targetResourceId: null,
};
const save = {
  careRecipientId: patient,
  kind: "SCHEDULE",
  purpose: "shift_type_create",
  targetDocumentId: null,
  targetResourceId: null,
  id: null,
  expectedRevision: null,
  idempotencyKey: key,
  action: "save",
  content: { schedule: fields },
  navigation: { version: 1, stage: "schedule_creation" },
};
const packet = schedulePreparationCommitSchema.parse({
  careRecipientId: patient,
  purpose: "shift_type_create",
  draftCommit: { id: draft, revision: 2 },
  command: scheduleCreationCommand(fields),
  idempotencyKey: key,
});
const receipt = {
  patientId: patient,
  purpose: "shift_type_create",
  targetResourceId: null,
  resourceId: type,
  actorId: actor,
  recordedAt: "2026-11-10T13:00:00Z",
  idempotencyKey: key,
  command: packet.command,
  fields,
  nativeResult: { id: type, version: 1, status: null, active: false },
};
const dto = {
  id: draft,
  ownerId: actor,
  patientId: patient,
  kind: "SCHEDULE",
  purpose: "shift_type_create",
  targetDocumentId: null,
  targetResourceId: null,
  schemaVersion: 1,
  revision: 2,
  state: "active",
  createdAt: receipt.recordedAt,
  savedAt: receipt.recordedAt,
  contentHash: "server-owned",
  content: { schedule: fields },
  navigation: save.navigation,
  consumedDocumentId: null,
  consumedResourceId: null,
  consumedResult: null,
};
describe("preparação de criação de escala", () => {
  it("requires a strictly advanced pinned source and the same active private revision", () => {
    const p = schedulePreparationCommitSchema.parse({
      ...packet,
      purpose: "schedule_series_create",
      command: scheduleCreationCommand(series),
    });
    const value = {
      patientId: patient,
      ownerId: actor,
      purpose: p.purpose,
      key,
      expectedRevision: 2,
      command: p.command,
      current: { id: draft, revision: 2, state: "active" },
      status: "not_applied",
      reason: "source_advanced",
      source: { savedTypeVersion: 3, currentTypeVersion: 4 },
      receipt: null,
    };
    expect(parseScheduleRecovery(value, p, actor).status).toBe("not_applied");
    for (const invalid of [
      { ...value, source: null },
      { ...value, source: { savedTypeVersion: 3, currentTypeVersion: 3 } },
      { ...value, current: { ...value.current, revision: 3 } },
      { ...value, current: { ...value.current, state: "consumed" } },
    ])
      expect(() => parseScheduleRecovery(invalid, p, actor)).toThrow();
  });
  it("does not turn absence into rejection and keeps another completion separate", () => {
    const value = {
      patientId: patient,
      ownerId: actor,
      purpose: scope.purpose,
      key,
      expectedRevision: 2,
      command: packet.command,
      current: { id: draft, revision: 2, state: "active" },
      status: "unknown",
      reason: null,
      receipt: null,
    };
    expect(parseScheduleRecovery(value, packet, actor).status).toBe("unknown");
    const other = {
      ...value,
      status: "not_applied",
      reason: "advanced_revision",
      current: { id: draft, revision: 3, state: "consumed" },
      receipt: { ...receipt, idempotencyKey: type },
    };
    expect(parseScheduleRecovery(other, packet, actor).status).toBe(
      "not_applied",
    );
    for (const invalid of [
      { ...value, reason: "key_conflict" },
      { ...other, current: { ...other.current, revision: 2 } },
      { ...other, receipt },
      { ...value, ownerId: type },
    ])
      expect(() => parseScheduleRecovery(invalid, packet, actor)).toThrow();
  });
  it("accepts only the corresponding applied private/native receipt", () => {
    const current = { id: draft, revision: 3, state: "consumed" };
    const value = {
      patientId: patient,
      ownerId: actor,
      purpose: scope.purpose,
      key,
      expectedRevision: 2,
      command: packet.command,
      current,
      status: "applied",
      confirmation: { draft: current, receipt, replayed: true },
    };
    expect(parseScheduleRecovery(value, packet, actor).status).toBe("applied");
    expect(() =>
      parseScheduleRecovery(
        { ...value, current: { ...current, revision: 4 } },
        packet,
        actor,
      ),
    ).toThrow();
  });
  it("preserves genuinely incomplete fields and inactive choice without creating a native command", () => {
    const f = { ...fields, name: "", start: "", duration: "" };
    expect(
      schedulePreparationSaveSchema.parse({ ...save, content: { schedule: f } })
        .content.schedule,
    ).toEqual(f);
    expect(() => scheduleCreationCommand(f)).toThrow();
    expect(creationDraftCommandSchema.parse(save)).toEqual(
      schedulePreparationSaveSchema.parse(save),
    );
  });
  it("restores distinct personal/team defaults and the reviewed type version", () => {
    expect(initialScheduleType()).toEqual({
      form: "type",
      name: "",
      start: "07:00",
      duration: "720",
      active: true,
    });
    expect(
      initialScheduleSeries(workspace, key, false, "2100-03-01"),
    ).toMatchObject({
      professionalId: key,
      shiftTypeId: type,
      shiftTypeVersion: 3,
      until: "2100-03-29",
    });
    expect(
      initialScheduleSeries(workspace, key, true, "2100-03-01"),
    ).toMatchObject({ professionalId: actor });
  });
  it("does not erase latent weekdays/dates when producing once,weekly,dates or cycle commands", () => {
    const original = structuredClone(series);
    const once = scheduleCreationCommand({ ...series, recurrence: "once" });
    expect(once).toMatchObject({
      action: "series",
      body: { recurrence: "once", weekdays: [], validUntil: series.from },
    });
    expect(once.body).not.toHaveProperty("dates");
    const dates = scheduleCreationCommand({ ...series, recurrence: "dates" });
    expect(dates).toMatchObject({
      body: { weekdays: [], dates: series.dates, shiftTypeVersion: 3 },
    });
    const cycle = scheduleCreationCommand({ ...series, recurrence: "cycle" });
    expect(cycle).toMatchObject({
      body: { weekdays: [], workHours: 12, restHours: 36 },
    });
    expect(cycle.body).not.toHaveProperty("shiftTypeVersion");
    expect(scheduleCreationCommand(series)).toMatchObject({
      body: { weekdays: [1, 3] },
    });
    expect(series).toEqual(original);
  });
  it("rejects duplicate/out-of-period dates,unknown reference and empty weekly selection at their proper boundary", () => {
    expect(
      scheduleCreationFields.safeParse({ ...series, shiftTypeVersion: null })
        .success,
    ).toBe(false);
    expect(
      scheduleCreationFields.safeParse({
        ...series,
        dates: [series.dates[0], series.dates[0]],
      }).success,
    ).toBe(false);
    expect(() =>
      scheduleCreationCommand({
        ...series,
        recurrence: "dates",
        dates: ["2100-03-30"],
      }),
    ).toThrow();
    expect(() =>
      scheduleCreationCommand({ ...series, weekdays: [] }),
    ).toThrow();
  });
  it("retains browser-representable numeric input and validates whole minutes without blank-to-zero coercion", () => {
    expect(
      scheduleCreationCommand({ ...fields, duration: "1e3" }),
    ).toMatchObject({ body: { durationMinutes: 1000, active: false } });
    for (const duration of ["", "12.5", "abc", "1441"])
      expect(() => scheduleCreationCommand({ ...fields, duration })).toThrow();
    expect(
      scheduleCreationFields.safeParse({ ...fields, start: "25:00" }).success,
    ).toBe(false);
  });
  it("uses UTF16 limits and preserves text literally", () => {
    expect(
      scheduleCreationFields.parse({ ...series, notes: "😀".repeat(1000) })
        .form,
    ).toBe("series");
    expect(
      scheduleCreationFields.safeParse({ ...series, notes: "😀".repeat(1001) })
        .success,
    ).toBe(false);
    expect(
      scheduleCreationFields.parse({
        ...series,
        notes: "<img src=x>\n  literal",
      }),
    ).toMatchObject({ notes: "<img src=x>\n  literal" });
  });
  it("rejects expanded authority,wrong purpose/stage and existing-resource native operations", () => {
    for (const bad of [
      { ...save, ownerId: actor },
      { ...save, purpose: "schedule_series_create" },
      { ...save, navigation: { version: 1, stage: "progress_note" } },
      { ...save, id: draft },
    ])
      expect(creationDraftCommandSchema.safeParse(bad).success).toBe(false);
    expect(
      schedulePreparationCommitSchema.safeParse({
        ...packet,
        command: {
          action: "type",
          body: {
            ...(packet.command.action === "type" ? packet.command.body : {}),
            id: type,
          },
        },
      }).success,
    ).toBe(false);
    expect(
      schedulePreparationCommitSchema.safeParse({
        ...packet,
        command: {
          action: "cancel",
          body: { id: type, reason: "Cancelamento" },
        },
      }).success,
    ).toBe(false);
  });
  it("decodes an owned null-target preparation and rejects other account/patient/navigation", () => {
    expect(parsePrivateDraft(dto, scope)).toMatchObject({
      content: { schedule: fields },
      consumedResourceId: null,
    });
    expect(() =>
      parsePrivateDraft(
        { ...dto, purpose: "schedule_series_create" },
        { ...scope, purpose: "schedule_series_create" },
      ),
    ).toThrow();
    for (const bad of [
      { ...dto, ownerId: key },
      { ...dto, patientId: key },
      { ...dto, targetResourceId: type },
      { ...dto, navigation: { version: 1, stage: "progress_note" } },
    ])
      expect(() => parsePrivateDraft(bad, scope)).toThrow();
  });
  it("confirms the exact native result and rejects forged actor,fields,key and state revision", () => {
    expect(
      parseSchedulePreparationReceipt(receipt, scope).nativeResult.active,
    ).toBe(false);
    for (const bad of [
      { ...receipt, actorId: key },
      { ...receipt, fields: { ...fields, active: true } },
      { ...receipt, nativeResult: { ...receipt.nativeResult, id: draft } },
    ])
      expect(() => parseSchedulePreparationReceipt(bad, scope)).toThrow();
    const value = {
      draft: { id: draft, revision: 3, state: "consumed" },
      receipt,
      replayed: false,
    };
    expect(
      parseSchedulePreparationConfirmation(value, packet, actor).receipt
        .resourceId,
    ).toBe(type);
    expect(() =>
      parseSchedulePreparationConfirmation(
        { ...value, receipt: { ...receipt, idempotencyKey: type } },
        packet,
        actor,
      ),
    ).toThrow();
    expect(() =>
      parseSchedulePreparationConfirmation(
        { ...value, draft: { ...value.draft, revision: 4 } },
        packet,
        actor,
      ),
    ).toThrow();
  });
  it("acknowledges only the expected own completed resource without a documentary target", () => {
    const result = {
      id: draft,
      patientId: patient,
      ownerId: actor,
      purpose: scope.purpose,
      targetResourceId: null,
      revision: 4,
      savedAt: receipt.recordedAt,
      state: "completed",
      consumedDocumentId: null,
      consumedResourceId: type,
      consumedResult: receipt,
      replayed: true,
    };
    const intent = {
      ...save,
      action: "acknowledge",
      id: draft,
      expectedRevision: 3,
    };
    expect(
      parsePrivateDraftResult(result, intent, actor).consumedResourceId,
    ).toBe(type);
    expect(() =>
      parsePrivateDraftResult({ ...result, ownerId: key }, intent, actor),
    ).toThrow();
  });
  it("renders a readonly escaped summary with no fabricated historical catalogue names", () => {
    const html = renderToStaticMarkup(
      createElement(SchedulePreparationSummary, {
        content: { schedule: { ...fields, name: "<img src=x>" } },
      }),
    );
    expect(html).toContain("&lt;img src=x&gt;");
    expect(html).not.toMatch(/<(input|select|textarea|img)\b/);
  });
});
