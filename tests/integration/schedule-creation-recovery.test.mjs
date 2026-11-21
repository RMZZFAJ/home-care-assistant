import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import {
  schedulePreparationFixture as fixture,
  saveSchedulePreparation as save,
  schedulePreparationCommit as packet,
  scheduleNativeFacts as facts,
  rpc,
  fixtures,
  sql,
  q,
  shiftCommand,
} from "./schedule-preparation-fixtures.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";

test("advanced pinned type proves nonapplication even before private CAS changes,while a known publication stays confirmed", async () => {
  const f = await fixture("schedule_series_create", "weekly"),
    saved = await save(f),
    intent = packet(f, saved);
  const changed = await shiftCommand(
      f.admin,
      f.patient,
      "type",
      {
        id: f.typ.id,
        name: "Referência atualizada",
        startsLocal: "09:00",
        durationMinutes: 720,
        active: true,
      },
      f.typ.version,
    ),
    before = facts(f);
  const result = await rpc(f.admin, "schedule_preparation_recovery", intent);
  assert.equal(result.status, "not_applied");
  assert.equal(result.reason, "source_advanced");
  assert.deepEqual(result.source, {
    savedTypeVersion: f.typ.version,
    currentTypeVersion: changed.version,
  });
  assert.equal(result.current.revision, saved.revision);
  assert.equal(facts(f), before);
  const adopted = await save(f, saved, {
      schedule: { ...f.fields, shiftTypeVersion: changed.version },
    }),
    next = packet(f, adopted),
    published = await rpc(f.admin, "commit_schedule_preparation", next);
  await shiftCommand(
    f.admin,
    f.patient,
    "type",
    {
      id: f.typ.id,
      name: "Referência ainda mais recente",
      startsLocal: "11:00",
      durationMinutes: 720,
      active: true,
    },
    changed.version,
  );
  const found = await rpc(f.admin, "schedule_preparation_recovery", next);
  assert.equal(found.status, "applied");
  assert.equal(
    found.confirmation.receipt.resourceId,
    published.receipt.resourceId,
  );
});

test("schedule recovery distinguishes unknown,advanced CAS,other completion and exact historical receipt without native writes", async () => {
  const f = await fixture(),
    saved = await save(f),
    intent = packet(f, saved),
    before = facts(f);
  assert.equal(
    (await rpc(f.admin, "schedule_preparation_recovery", intent)).status,
    "unknown",
  );
  assert.equal(facts(f), before);
  const newer = await save(f, saved),
    stale = await rpc(f.admin, "schedule_preparation_recovery", intent);
  assert.equal(stale.status, "not_applied");
  assert.equal(stale.reason, "advanced_revision");
  assert.equal(facts(f), before);
  const winning = packet(f, newer),
    published = await rpc(f.admin, "commit_schedule_preparation", winning),
    actual = facts(f);
  assert.equal(
    (await rpc(f.admin, "schedule_preparation_recovery", intent)).status,
    "not_applied",
  );
  const own = await rpc(f.admin, "schedule_preparation_recovery", winning);
  assert.equal(own.status, "applied");
  assert.equal(
    own.confirmation.receipt.resourceId,
    published.receipt.resourceId,
  );
  assert.equal(facts(f), actual);
  const consumed = await rpc(f.admin, "schedule_preparation_context", f.scope);
  await save(f, consumed, undefined, f.admin, randomUUID(), "acknowledge");
  const historical = await rpc(
    f.admin,
    "schedule_preparation_recovery",
    winning,
  );
  assert.equal(historical.confirmation.draft.state, "completed");
  assert.equal(
    historical.confirmation.receipt.resourceId,
    published.receipt.resourceId,
  );
  assert.equal(facts(f), actual);
});

test("schedule recovery actually waits for the original key and revalidates membership after the wait", async () => {
  const f = await fixture(),
    saved = await save(f),
    intent = packet(f, saved),
    keyName = `schedule-preparation-key:${fixtures.adminA.id}:${intent.p_key}`;
  let recovery;
  const created = await whileAdvisoryWaits(
    `schedule:${f.patient}`,
    () => rpc(f.admin, "commit_schedule_preparation", intent),
    async () => {
      recovery = f.admin
        .rpc("schedule_preparation_recovery", intent)
        .then((v) => v);
      const start = Date.now();
      while (
        Number(
          sql(
            `select count(*) from pg_locks where locktype='advisory' and not granted and objsubid=1 and classid=((hashtextextended(${q(keyName)},0)>>32)&4294967295)::oid and objid=(hashtextextended(${q(keyName)},0)&4294967295)::oid`,
          ),
        ) === 0
      ) {
        assert.ok(
          Date.now() - start < 15000,
          "Recovery must wait on the original private command key",
        );
        await delay(25);
      }
    },
  );
  const found = await recovery;
  assert.ifError(found.error);
  assert.equal(found.data.status, "applied");
  assert.equal(
    found.data.confirmation.receipt.resourceId,
    created.receipt.resourceId,
  );
  assert.equal(
    sql(
      `select count(*) from public.shift_types where care_recipient_id=${q(f.patient)}`,
    ),
    "1",
  );
  const other = packet(f, saved, randomUUID());
  const denied = await whileAdvisoryWaits(
    `schedule-preparation-key:${fixtures.adminA.id}:${other.p_key}`,
    () => f.admin.rpc("schedule_preparation_recovery", other),
    async () => {
      sql(
        `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${q(f.patient)} and user_id=${q(fixtures.adminA.id)}`,
      );
    },
  );
  assert.equal(denied.error?.code, "42501");
  assert.equal(
    sql(
      "select has_function_privilege('anon','public.schedule_preparation_recovery(uuid,text,uuid,integer,jsonb,uuid)','execute'),has_function_privilege('authenticated','public.schedule_preparation_recovery(uuid,text,uuid,integer,jsonb,uuid)','execute'),has_function_privilege('service_role','public.schedule_preparation_recovery(uuid,text,uuid,integer,jsonb,uuid)','execute')",
    ),
    "f|t|f",
  );
});
