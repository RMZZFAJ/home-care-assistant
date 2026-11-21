import assert from "node:assert/strict";
import { test } from "node:test";
import {
  backupStateQuery,
  compareBackupSnapshots,
} from "../../scripts/backup-snapshots.mjs";
import {
  getTestEnvironment,
  sql,
  sqlLiteral,
} from "../../scripts/test-environment.mjs";
import { actor, rpc } from "./v4-fixtures.mjs";

test("real SQL snapshots qualify cursor clocks while policy versions, failure cause and business rows remain exact", async () => {
  getTestEnvironment();
  const patient = (
    await rpc(await actor("global"), "admin_upsert_recipient", {
      p_id: null,
      p_display_name: "Snapshot fictício de backup",
      p_is_active: true,
      p_is_development: true,
    })
  ).id;
  const p = sqlLiteral(patient),
    tables = [
      { schema: "private", name: "legacy_reminder_checkpoints" },
      { schema: "private", name: "legacy_reminder_failures" },
      { schema: "public", name: "patient_settings" },
    ];
  const snapshot = backupStateQuery(tables);
  try {
    const output = sql(`begin;
      insert into public.patient_settings(care_recipient_id,settings) values(${p},'{}') on conflict do nothing;
      insert into private.legacy_reminder_checkpoints values(${p},repeat('a',64),1,now(),now(),current_date-1,now());
      insert into private.legacy_reminder_failures(care_recipient_id,policy_fingerprint,sqlstate,first_failure_at,last_failure_at) values(${p},repeat('a',64),'22023',now(),now());
      ${snapshot}
      update private.legacy_reminder_checkpoints set checked_at=now()+interval '1 second',closed_through=closed_through-1 where care_recipient_id=${p};
      update private.legacy_reminder_failures set attempts=attempts+1,last_failure_at=now()+interval '1 second' where care_recipient_id=${p};
      ${snapshot}
      update private.legacy_reminder_checkpoints set source_version=2 where care_recipient_id=${p};
      update private.legacy_reminder_failures set sqlstate='40001' where care_recipient_id=${p};
      update public.patient_settings set version=version+1 where care_recipient_id=${p};
      ${snapshot}
      rollback;`);
    const values = output
      .split(/\r?\n/)
      .filter((s) => s.startsWith("{"))
      .map((s) => JSON.parse(s));
    assert.equal(values.length, 3);
    const clock = compareBackupSnapshots(values[0], values[1], 2);
    assert.deepEqual(clock.unexpected, []);
    assert.deepEqual(
      new Set(clock.differences),
      new Set([
        "private.legacy_reminder_checkpoints",
        "private.legacy_reminder_failures",
      ]),
    );
    assert.deepEqual(
      new Set(compareBackupSnapshots(values[1], values[2], 2).unexpected),
      new Set(tables.map((t) => t.schema + "." + t.name)),
    );
    assert.equal(
      sql(
        `select exists(select 1 from private.legacy_reminder_checkpoints where care_recipient_id=${p});`,
      ),
      "f",
    );
  } finally {
    sql(`update public.care_recipients set is_active=false where id=${p};`);
  }
});

test("snapshot v2 refuses missing stable hashes, changed cardinality, new tables and unsupported contracts", () => {
  const expected = {
    "private.legacy_reminder_progress": {
      rows: 1,
      sha256: "a".repeat(64),
      stableSha256: "b".repeat(64),
    },
  };
  assert.equal(
    compareBackupSnapshots(
      expected,
      {
        "private.legacy_reminder_progress": {
          ...expected["private.legacy_reminder_progress"],
          rows: 2,
        },
      },
      2,
    ).unexpected.length,
    1,
  );
  assert.equal(
    compareBackupSnapshots(
      expected,
      {
        "private.legacy_reminder_progress": { rows: 1, sha256: "c".repeat(64) },
      },
      2,
    ).unexpected.length,
    1,
  );
  assert.equal(compareBackupSnapshots(expected, {}, 2).unexpected.length, 1);
  assert.equal(compareBackupSnapshots({}, expected, 2).unexpected.length, 1);
  assert.throws(
    () => compareBackupSnapshots(expected, expected, 3),
    /Unsupported/,
  );
});

test("legacy archive compatibility never extends its two original qualifications to new tables", () => {
  const a = { rows: 1, sha256: "a".repeat(64) },
    b = { rows: 1, sha256: "b".repeat(64) };
  assert.deepEqual(
    compareBackupSnapshots(
      { "private.scheduler_health": a },
      { "private.scheduler_health": b },
    ).unexpected,
    [],
  );
  assert.equal(
    compareBackupSnapshots(
      { "private.legacy_reminder_checkpoints": a },
      { "private.legacy_reminder_checkpoints": b },
    ).unexpected.length,
    1,
  );
  assert.equal(
    compareBackupSnapshots(
      { "private.scheduler_health": a },
      { "private.scheduler_health": { ...b, rows: 2 } },
    ).unexpected.length,
    1,
  );
  assert.throws(() => backupStateQuery([]), /explicit/);
});

test("monitor observations qualify only clocks; incident severity, version, state and policy remain exact", () => {
  getTestEnvironment();
  const tables = [{ schema: "private", name: "operations_components" }, { schema: "private", name: "operations_incidents" }, { schema: "private", name: "operations_config" }];
  const snapshot = backupStateQuery(tables);
  const output = sql(`begin;
    select private.operations_condition('operator','recovery','RECOVERY_FAILURE',true,'warning',1);
    ${snapshot}
    update private.operations_components set observed_at=now()+interval '1 second',success_at=now()+interval '1 second' where environment='operator';
    update private.operations_incidents set last_observed_at=now()+interval '1 second' where environment='operator';
    ${snapshot}
    update private.operations_incidents set severity='critical',version=version+1 where environment='operator' and code='RECOVERY_FAILURE';
    update private.operations_config set version=version+1 where environment='operator';
    ${snapshot}
    rollback;`);
  const values = output.split(/\r?\n/).filter(s => s.startsWith("{")).map(s => JSON.parse(s));
  assert.equal(values.length, 3);
  assert.deepEqual(compareBackupSnapshots(values[0], values[1], 2).unexpected, []);
  assert.deepEqual(new Set(compareBackupSnapshots(values[1], values[2], 2).unexpected), new Set(["private.operations_incidents", "private.operations_config"]));
});
