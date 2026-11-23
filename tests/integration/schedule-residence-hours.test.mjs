import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { rpc, setup } from "./v4-fixtures.mjs";
import { dayOffset, localToday, shiftCommand, shiftWorker } from "./shift-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { resourceFixture, saveResource, resourcePacket } from "./schedule-resource-fixtures.mjs";
import { saveSchedulePreparation, schedulePreparationCommit } from "./schedule-preparation-fixtures.mjs";

const defaultHours = { timezone: "America/Manaus", dayStart: "06:25", nightStart: "20:40" };
const readHours = (client, patient) => rpc(client, "schedule_residence", { p_patient: patient });
const saveHours = (client, patient, body, version = null, key = randomUUID()) =>
  client.rpc("set_schedule_residence", { p_patient: patient, p_body: body, p_version: version, p_key: key });
const queryOccurrences = id => JSON.parse(sql(`select coalesce(json_agg(json_build_object(
  'start',to_char(starts_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI'),
  'end',to_char(ends_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI'),
  'status',status) order by starts_at),'[]') from public.scheduled_shifts where series_id=${q(id)}`));
const localDay = (offset = 0) => dayOffset(localToday(), offset);

async function residenceFixture() {
  const f = await setup(), worker = await shiftWorker(f.patient);
  const type = await shiftCommand(f.admin, f.patient, "type", {
    name: "Plantão de residência", startsLocal: "08:17", durationMinutes: 720,
  });
  const result = await saveHours(f.admin, f.patient, defaultHours);
  assert.ifError(result.error);
  return { ...f, worker, type, hours: result.data.hours };
}

function series(f, day, overrides = {}) {
  return {
    professionalId: f.worker.id, shiftTypeId: f.type.id, shiftTypeVersion: f.type.version,
    timezone: defaultHours.timezone, recurrence: "once", weekdays: [],
    anchorDate: day, validUntil: day, notes: "",
    residenceHours: { version: f.hours.version, period: "day", startsLocal: f.hours.dayStart, endsLocal: null },
    ...overrides,
  };
}

test("residence hours use patient authority, optimistic versions and the original accepted receipt", async () => {
  const f = await residenceFixture();
  assert.deepEqual(await readHours(f.worker.client, f.patient), { careRecipientId: f.patient, hours: f.hours });
  assert.equal((await saveHours(f.worker.client, f.patient, defaultHours, 1)).error?.code, "42501");
  const other = await setup(), outsider = await shiftWorker(other.patient);
  assert.equal((await outsider.client.rpc("schedule_residence", { p_patient: f.patient })).error?.code, "42501");
  assert.equal((await saveHours(other.admin, other.patient, { ...defaultHours, timezone: "Invalid/Timezone" })).error?.code, "22023");
  await rpc(f.admin, "select_active_context", { p_patient: f.patient });
  const key = randomUUID(), update = { ...defaultHours, dayStart: "07:10" };
  const applied = await saveHours(f.admin, f.patient, update, 1, key);
  assert.ifError(applied.error);
  assert.equal(applied.data.hours.version, 2);
  assert.deepEqual((await saveHours(f.admin, f.patient, update, 1, key)).data, applied.data);
  assert.equal((await saveHours(f.admin, f.patient, update, 1)).error?.code, "PT409");
  assert.equal((await saveHours(f.admin, f.patient, defaultHours, 1, key)).error?.code, "23505");
});

test("the versioned shift type supplies its cycle and keeps the intervals already published", async () => {
  const f = await setup(), worker = await shiftWorker(f.patient), day = localDay(9);
  const command = (action, body, client = f.admin, version = null, key = randomUUID()) =>
    client.rpc("schedule_command", {
      p_patient: f.patient, p_action: action, p_body: body, p_version: version, p_key: key,
    });
  const typeBody = { name: "Ciclo diurno", durationMinutes: 480, restHours: 40 };
  assert.equal((await command("type", typeBody, worker.client)).error?.code, "42501");
  assert.equal((await command("type", typeBody)).error?.code, "PT409");
  const hours = (await saveHours(f.admin, f.patient, defaultHours)).data.hours;
  const type = await shiftCommand(f.admin, f.patient, "type", typeBody);
  assert.equal(type.rest_hours, 40);
  assert.equal(type.duration_minutes, 480);
  const continuous = await shiftCommand(f.admin, f.patient, "type", {
    name: "Sem intervalo entre plantões", durationMinutes: 1440, restHours: 0,
  });
  assert.equal(continuous.rest_hours, 0);
  const request = series({ ...f, type, worker, hours }, day, {
    recurrence: "cycle", workHours: 8, restHours: 40, validUntil: dayOffset(day, 3),
  });
  assert.equal((await command("series", { ...request, restHours: 36 })).error?.code, "22023");
  const withoutHours = { ...request };
  delete withoutHours.residenceHours;
  assert.equal((await command("series", withoutHours)).error?.code, "PT409");
  const key = randomUUID();
  const first = await command("series", request, f.admin, null, key);
  assert.ifError(first.error);
  const original = [day, dayOffset(day, 2)].map(date => ({
    start: date + "T10:25", end: date + "T18:25", status: "published",
  }));
  assert.deepEqual(queryOccurrences(first.data.id), original);
  assert.equal((await command("type", { id: type.id, name: type.name, startsLocal: "08:00", durationMinutes: 480 }, f.admin, type.version)).error?.code, "22023");
  const updated = await command("type", { ...typeBody, id: type.id, durationMinutes: 600, restHours: 38 }, f.admin, type.version);
  assert.ifError(updated.error);
  assert.equal(updated.data.version, type.version + 1);
  assert.equal((await command("series", request)).error?.code, "PT409");
  assert.deepEqual((await command("series", request, f.admin, null, key)).data, first.data);
  assert.deepEqual(queryOccurrences(first.data.id), original);
});

test("the private edit can adopt a cycle on an existing type and return its new reference", async () => {
  const f = await resourceFixture();
  assert.ifError((await saveHours(f.admin, f.patient, defaultHours)).error);
  const fields = { ...f.fields, start: "", duration: "480", restHours: "40" };
  const saved = await saveResource(f, null, { ...f.content, scheduleAction: fields });
  const command = { action: "type", body: {
    id: f.target, name: fields.name, durationMinutes: 480, restHours: 40, active: fields.active,
  } };
  const result = await rpc(f.admin, "commit_schedule_resource_preparation", resourcePacket({ ...f, command }, saved));
  assert.deepEqual(result.receipt.fields, fields);
  assert.deepEqual(result.receipt.command, command);
  assert.equal(result.receipt.nativeResult.version, f.reference.version + 1);
  const { reference } = await rpc(f.admin, "schedule_resource_preparation_reference", f.scope);
  assert.equal(reference.workspace.types[0].rest_hours, 40);
  assert.equal(reference.version, f.reference.version + 1);
  assert.notEqual(reference.hash, f.reference.hash);
});

test("private preparation preserves and publishes the custom cycle reviewed by the actor", async () => {
  const f = await residenceFixture(), day = localDay(15);
  const type = await shiftCommand(f.admin, f.patient, "type", {
    name: "Ciclo de dez horas", durationMinutes: 600, restHours: 38,
  });
  const typeCycle = { workHours: 10, restHours: 38 };
  const fields = {
    form: "series", professionalId: f.worker.id, shiftTypeId: type.id, shiftTypeVersion: type.version,
    recurrence: "cycle", weekdays: [], dates: [], cycle: "12x36", typeCycle,
    from: day, until: "", timezone: defaultHours.timezone, notes: "", reason: "",
    residence: { ...f.hours, period: "day", special: false, specialStart: "", specialEnd: "" },
  };
  const intent = {
    ...f,
    scope: { p_patient: f.patient, p_purpose: "schedule_series_create" },
    content: { schedule: fields },
    command: { action: "series", body: series({ ...f, type }, day, { ...typeCycle, recurrence: "cycle", validUntil: null }) },
  };
  const saved = await saveSchedulePreparation(intent);
  const stored = await rpc(f.admin, "schedule_preparation_context", intent.scope);
  assert.deepEqual(stored.content.schedule.typeCycle, typeCycle);
  const packet = schedulePreparationCommit(intent, saved);
  const result = await rpc(f.admin, "commit_schedule_preparation", packet);
  assert.deepEqual(result.receipt.command, intent.command);
  assert.deepEqual(queryOccurrences(result.receipt.resourceId).slice(0, 2), [day, dayOffset(day, 2)].map(date => ({
    start: date + "T10:25", end: date + "T20:25", status: "published",
  })));
});

test("new shifts use the residence zone and duration with one-off and special overnight shifts", async () => {
  const f = await residenceFixture();
  const day = localDay(8), specialDay = localDay(11);
  const first = await shiftCommand(f.admin, f.patient, "series", series(f, day));
  assert.equal(first.residence_version, 1);
  assert.deepEqual(queryOccurrences(first.id), [{ start: day + "T10:25", end: day + "T22:25", status: "published" }]);
  const invalidDate = await f.admin.rpc("schedule_command", {
    p_patient: f.patient, p_action: "series", p_key: randomUUID(),
    p_body: series(f, day, { anchorDate: "infinity", validUntil: "infinity" }),
  });
  assert.equal(invalidDate.error?.code, "22023");
  const special = await shiftCommand(f.admin, f.patient, "series", series(f, specialDay, {
    residenceHours: { version: 1, period: "night", startsLocal: "21:45", endsLocal: "06:15" },
  }));
  assert.deepEqual(queryOccurrences(special.id), [{
    start: dayOffset(specialDay, 1) + "T01:45", end: dayOffset(specialDay, 1) + "T10:15", status: "published",
  }]);
  const changed = { ...defaultHours, dayStart: "07:10" };
  assert.ifError((await saveHours(f.admin, f.patient, changed, f.hours.version)).error);
  assert.equal((await f.admin.rpc("schedule_command", {
    p_patient: f.patient, p_action: "series", p_body: series(f, localDay(15)), p_key: randomUUID(),
  })).error?.code, "PT409");
  const saved = queryOccurrences(first.id);
  assert.equal(saved[0].start, day + "T10:25");
  assert.equal(saved[0].end, day + "T22:25");

  const full = await shiftCommand(f.admin, f.patient, "type", {
    name: "Plantão integral", startsLocal: "10:10", durationMinutes: 1440,
  });
  const fullDay = localDay(17);
  const whole = await shiftCommand(f.admin, f.patient, "series", series({ ...f, type: full }, fullDay, {
    residenceHours: { version: 2, period: "day", startsLocal: changed.dayStart, endsLocal: null },
  }));
  assert.deepEqual(queryOccurrences(whole.id), [{
    start: fullDay + "T11:10", end: dayOffset(fullDay, 1) + "T11:10", status: "published",
  }]);
});

test("open-ended cycles preserve cadence, stop on conflicts and extend after resolution", async t => {
  const f = await residenceFixture(), anchor = localDay(18);
  t.after(() => sql(`update public.care_recipients set is_active=false where id=${q(f.patient)}`));
  const rolling = await shiftCommand(f.admin, f.patient, "series", series(f, anchor, {
    recurrence: "cycle", workHours: 12, restHours: 36, validUntil: null,
  }));
  assert.equal(rolling.open_ended, true);
  const old = queryOccurrences(rolling.id);
  assert.equal(old.length, 29);
  const next = dayOffset(rolling.valid_until, 2), check = dayOffset(rolling.valid_until, -14);
  const overlapping = await shiftCommand(f.admin, f.patient, "series", series(f, next));
  const shift = sql(`select id from public.scheduled_shifts where series_id=${q(overlapping.id)}`);
  sql(`select private.extend_residence_schedules(${q(check + "T12:00:00Z")})`);
  assert.equal(sql(`select continuation_blocked from public.shift_series where id=${q(rolling.id)}`), "t");
  assert.deepEqual(queryOccurrences(rolling.id), old);
  await shiftCommand(f.admin, f.patient, "cancel", { id: shift, reason: "Liberar o plantão isolado" }, 1);
  sql(`select private.extend_residence_schedules(${q(dayOffset(check, 1) + "T12:00:00Z")})`);
  const extended = queryOccurrences(rolling.id);
  assert.equal(sql(`select continuation_blocked from public.shift_series where id=${q(rolling.id)}`), "f");
  assert.deepEqual(extended.slice(0, old.length), old);
  assert.equal(extended[old.length].start, next + "T10:25");
  assert.ok(extended.length > old.length);
  const distinct = new Set(extended.map(item => item.start));
  assert.equal(distinct.size, extended.length);
  const advanced = dayOffset(rolling.valid_until, 9);
  await shiftCommand(f.admin, f.patient, "end_series", {
    id: rolling.id, fromDate: advanced, reason: "Encerrar as próximas ocorrências",
  }, 1);
  const after = queryOccurrences(rolling.id);
  sql(`select private.extend_residence_schedules(${q(dayOffset(advanced, 60) + "T12:00:00Z")})`);
  assert.deepEqual(queryOccurrences(rolling.id), after);
});

test("residence series reject empty weeks and special hours incompatible with a cycle", async () => {
  const f = await residenceFixture();
  const day = localDay(10);
  const failing = body => f.admin.rpc("schedule_command", {
    p_patient: f.patient, p_action: "series", p_key: randomUUID(), p_body: body,
  });
  const nextWeekday = new Date(`${dayOffset(day, 1)}T12:00Z`).getUTCDay();
  const emptyWeek = await failing(series(f, day, { recurrence: "weekly", weekdays: [nextWeekday] }));
  assert.equal(emptyWeek.error?.code, "22023");
  assert.match(emptyWeek.error?.message, /no scheduled occurrence/);
  const cycle = series(f, day, { recurrence: "cycle", workHours: 12, restHours: 36, validUntil: dayOffset(day, 2),
    residenceHours: { version: f.hours.version, period: "day", startsLocal: "07:00", endsLocal: "15:00" },
  });
  assert.match((await failing(cycle)).error?.message, /match cycle work hours/);
  assert.equal(sql(`select count(*) from public.shift_series where care_recipient_id=${q(f.patient)}`), "0");
  cycle.residenceHours.endsLocal = "19:00";
  const accepted = await shiftCommand(f.admin, f.patient, "series", cycle);
  assert.deepEqual(queryOccurrences(accepted.id), [day, dayOffset(day, 2)].map(date => ({
    start: date+"T11:00", end: date+"T23:00", status: "published",
  })));
});

test("rolling a weekly horizon records a DST gap and preserves the neighboring valid shifts", async t => {
  const f = await residenceFixture();
  const zone = "America/New_York";
  const changed = await saveHours(f.admin, f.patient, { ...defaultHours, timezone: zone, dayStart: "02:30" }, f.hours.version);
  assert.ifError(changed.error);
  const anchor = "2100-01-03";
  const rolling = await shiftCommand(f.admin, f.patient, "series", series(f, anchor, {
    timezone: zone, recurrence: "weekly", weekdays: [0], validUntil: null,
    residenceHours: { version: changed.data.hours.version, period: "day", startsLocal: "02:30", endsLocal: null },
  }));
  t.after(() => sql(`update public.care_recipients set is_active=false where id=${q(f.patient)}`));
  assert.equal(rolling.valid_until, "2100-02-28");
  sql(`select private.materialize_residence_schedule(s, '2100-03-01', '2100-03-21') from public.shift_series s where id=${q(rolling.id)}`);
  assert.deepEqual(queryOccurrences(rolling.id).slice(-2).map(row => row.start), ["2100-03-07T07:30", "2100-03-21T06:30"]);
  assert.equal(sql(`select metadata->>'date' from public.audit_events where entity_id=${q(rolling.id)} and action='schedule.civil_time_skipped' and actor_id is null`), "2100-03-14");
});
