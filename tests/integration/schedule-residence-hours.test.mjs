import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { rpc, setup } from "./v4-fixtures.mjs";
import { dayOffset, localToday, shiftCommand, shiftWorker } from "./shift-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

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
