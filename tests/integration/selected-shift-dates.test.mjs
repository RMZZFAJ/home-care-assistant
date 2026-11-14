import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  selectedDatesFixture,
  chosenDates,
  datePacket,
  dateBody,
  datesState,
  conflictingOtherPatient,
  rpc,
  shiftCommand,
} from "./selected-dates-fixtures.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";
import { shiftWorker } from "./shift-fixtures.mjs";

test("twelve selected dates in45 days materialize only19–07 UTC intervals and preserve the type snapshot", async () => {
  const f = await selectedDatesFixture(),
    packet = datePacket(f),
    series = await rpc(f.admin, "schedule_command", packet);
  assert.equal(series.recurrence, "dates");
  assert.deepEqual(series.specific_dates, chosenDates);
  const parts = await Promise.all([
    rpc(f.admin, "schedule_workspace", {
      p_patient: f.patient,
      p_from: "2100-01-15",
      p_until: "2100-02-24",
    }),
    rpc(f.admin, "schedule_workspace", {
      p_patient: f.patient,
      p_from: "2100-02-25",
      p_until: "2100-02-28",
    }),
  ]);
  const shifts = parts
    .flatMap((p) => p.shifts)
    .filter((s) => s.series_id === series.id)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  assert.equal(shifts.length, 12);
  for (const [i, shift] of shifts.entries()) {
    assert.equal(
      Date.parse(shift.starts_at),
      Date.parse(chosenDates[i] + "T22:00:00Z"),
    );
    assert.equal(
      Date.parse(shift.ends_at) - Date.parse(shift.starts_at),
      12 * 3600000,
    );
    assert.equal(shift.timezone, "America/Sao_Paulo");
    assert.equal(shift.is_exception, false);
  }
  const before = datesState(f);
  assert.equal((await rpc(f.admin, "schedule_command", packet)).id, series.id);
  assert.equal(datesState(f), before);
  await shiftCommand(
    f.admin,
    f.patient,
    "type",
    {
      id: f.type.id,
      name: f.type.name,
      startsLocal: "20:00",
      durationMinutes: 720,
    },
    f.type.version,
  );
  const afterType = datesState(f),
    stale = await f.admin.rpc("schedule_command", {
      ...packet,
      p_key: randomUUID(),
    });
  assert.equal(stale.error?.code, "PT409", stale.error?.message);
  assert.equal(datesState(f), afterType);
  const original = (
    await rpc(f.admin, "schedule_workspace", {
      p_patient: f.patient,
      p_from: "2100-01-15",
      p_until: "2100-01-15",
    })
  ).shifts.find((s) => s.series_id === series.id);
  assert.equal(
    Date.parse(original.starts_at),
    Date.parse("2100-01-15T22:00:00Z"),
  );
});

test("a middle selected date conflicting in another patient rolls back the whole series and an ended series cannot republish", async () => {
  const f = await selectedDatesFixture(),
    other = await conflictingOtherPatient(f),
    before = datesState(f);
  const result = await f.admin.rpc("schedule_command", datePacket(f));
  assert.ok(result.error);
  assert.match(result.error.message, /overlap|conflict/i);
  assert.ok(
    !JSON.stringify(result.error).includes("DADO_RESERVADO_OUTRO_PACIENTE"),
  );
  assert.equal(datesState(f), before);
  assert.equal(
    (
      await f.admin.rpc("schedule_workspace", {
        p_patient: other,
        p_from: "2100-02-11",
        p_until: "2100-02-11",
      })
    ).error?.code,
    "42501",
  );
  const dates = chosenDates.map((day) =>
      day === "2100-02-11" ? "2100-02-12" : day,
    ),
    series = await rpc(f.admin, "schedule_command", datePacket(f, dates));
  const ended = await shiftCommand(
      f.admin,
      f.patient,
      "end_series",
      {
        id: series.id,
        fromDate: "2100-02-15",
        reason:
          "Corte explícito da programação, preservando os dias anteriores",
      },
      series.version,
    ),
    cutState = datesState(f);
  const denied = await f.admin.rpc("schedule_command", {
    p_patient: f.patient,
    p_action: "approve",
    p_body: { id: series.id },
    p_key: randomUUID(),
    p_version: ended.version,
  });
  assert.ok(denied.error);
  assert.match(denied.error.message, /ended|stale|decided/i);
  assert.equal(datesState(f), cutState);
  const state = JSON.parse(cutState),
    rows = state.shifts.filter((s) => s.series_id === series.id);
  assert.equal(rows.length, 12);
  for (const s of rows)
    assert.equal(
      s.status,
      s.starts_at.slice(0, 10) >= "2100-02-15" ? "cancelled" : "published",
    );
});

test("selected dates reject malformed ranges and a real Auth loss after the observed worker lock without partial series", async () => {
  const f = await selectedDatesFixture(),
    before = datesState(f),
    body = dateBody(f);
  for (const change of [
    { dates: [] },
    { dates: [chosenDates[0], chosenDates[0]] },
    { dates: ["2100-02-29"] },
    { dates: ["2100-03-01"] },
    { dates: [null] },
    { weekdays: [1] },
    { shiftTypeVersion: null },
    { recurrence: "weekly", weekdays: [1] },
  ]) {
    const result = await f.admin.rpc("schedule_command", {
      ...datePacket(f),
      p_body: { ...body, ...change },
    });
    assert.ok(result.error, JSON.stringify(change));
    assert.ok(result.error.code?.startsWith("22"), result.error.message);
    assert.equal(datesState(f), before);
  }
  const result = await whileAdvisoryWaits(
    "schedule-worker:" + f.worker.id,
    () => f.admin.rpc("schedule_command", datePacket(f)),
    async () =>
      assert.ifError((await f.admin.auth.signOut({ scope: "local" })).error),
  );
  assert.equal(result.error?.code, "42501", result.error?.message);
  assert.equal(datesState(f), before);
});

test("a change proposal after its selected series cutoff closes obsolete without republishing the cancelled shift", async () => {
  const f = await selectedDatesFixture(),
    other = await shiftWorker(f.patient),
    series = await rpc(f.admin, "schedule_command", datePacket(f));
  const source = (
    await rpc(f.admin, "schedule_workspace", {
      p_patient: f.patient,
      p_from: "2100-01-15",
      p_until: "2100-01-15",
    })
  ).shifts.find((s) => s.series_id === series.id);
  const proposal = await shiftCommand(
    f.worker.client,
    f.patient,
    "propose_change",
    {
      id: source.id,
      professionalId: other.id,
      startsAt: "2100-01-15T23:00:00Z",
      endsAt: "2100-01-16T11:00:00Z",
      notes: "Proposta20–08 anterior ao corte",
      reason: "Troca proposta antes de encerrar a série",
    },
    source.version,
  );
  await shiftCommand(
    f.admin,
    f.patient,
    "end_series",
    {
      id: series.id,
      fromDate: "2100-01-15",
      reason: "Encerramento definitivo anterior à decisão da proposta",
    },
    series.version,
  );
  const before = JSON.parse(datesState(f)),
    packet = {
      p_patient: f.patient,
      p_action: "decide_change",
      p_body: {
        id: proposal.id,
        approve: true,
        reason: "Decisão própria após constatar que a série foi encerrada",
      },
      p_key: randomUUID(),
      p_version: proposal.version,
    };
  const decision = await rpc(f.admin, "schedule_command", packet);
  assert.equal(decision.status, "obsolete");
  assert.equal(decision.reason, proposal.reason);
  assert.equal(decision.notes, proposal.notes);
  assert.deepEqual(decision.source_snapshot, proposal.source_snapshot);
  assert.deepEqual(decision.proposed_snapshot, proposal.proposed_snapshot);
  const after = JSON.parse(datesState(f));
  assert.deepEqual(after.shifts, before.shifts);
  assert.deepEqual(after.series, before.series);
  assert.ok(after.shifts.every((s) => s.status === "cancelled"));
  const committed = datesState(f);
  assert.equal(
    (await rpc(f.admin, "schedule_command", packet)).status,
    "obsolete",
  );
  assert.equal(datesState(f), committed);
});
