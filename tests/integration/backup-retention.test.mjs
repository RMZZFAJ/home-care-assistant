import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { randomBytes } from "node:crypto";
import {
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  runBackup,
  backupStoreStatus,
} from "../../scripts/backup-filesystem-store.mjs";
import {
  createOperatorDirectory,
  externalOperatorPath,
  removeOperatorBackupTree,
} from "../../scripts/operator-files.mjs";
import { verifyBackup } from "../../scripts/backup-archive.mjs";

const owned = [];
afterEach(async () => {
  for (const path of owned.splice(0)) {
    const target = await realpath(path),
      parent = await realpath(tmpdir());
    assert.equal(dirname(target), parent);
    assert.ok(target.startsWith(join(parent, "hca-backup-retention-")));
    await rm(target, { recursive: true });
  }
});
async function fixture() {
  const parent = await mkdtemp(join(tmpdir(), "hca-backup-retention-"));
  owned.push(parent);
  const root = join(parent, "store"),
    key = randomBytes(32);
  let captured = 0;
  const capture = async (path) => {
    await createOperatorDirectory(path);
    await writeFile(
      join(path, "controlled.txt"),
      "Synthetic capture " + ++captured,
    );
    return { controlledSource: true };
  };
  return { parent, root, key, capture, captures: () => captured };
}
const clock = (day) => new Date(Date.UTC(2026, 8, day, 17));

test("filesystem retention keeps seven daily slots, four actual weekly copies and pinned critical backups", async () => {
  const f = await fixture(),
    receipts = [];
  for (let day = 1; day <= 35; day++)
    receipts.push(
      await runBackup({ ...f, scheduleEnabled: true, now: clock(day) }),
    );
  let index = await backupStoreStatus(f);
  assert.equal(Object.keys(index.daily).length, 7);
  assert.equal(Object.keys(index.weekly).length, 4);
  assert.deepEqual(
    Object.keys(index.daily).sort(),
    [29, 30, 31, 32, 33, 34, 35].map((day) =>
      clock(day).toISOString().slice(0, 10),
    ),
  );
  const retained = new Set([
    ...Object.values(index.daily),
    ...Object.values(index.weekly),
  ]);
  assert.deepEqual(new Set(await readdir(join(f.root, "archives"))), retained);
  assert.equal((await readdir(join(f.root, "captures"))).length, 0);
  assert.ok(receipts.filter((r) => !retained.has(r.backupId)).length > 20);
  for (const entry of Object.values(index.entries))
    assert.equal(
      (
        await verifyBackup({
          directory: join(f.root, "archives", entry.id),
          key: f.key,
        })
      ).backupId,
      entry.id,
    );
  const critical = await runBackup({ ...f, mode: "critical", now: clock(36) });
  for (let day = 37; day <= 47; day++)
    await runBackup({ ...f, scheduleEnabled: true, now: clock(day) });
  index = await backupStoreStatus(f);
  assert.ok(index.entries[critical.backupId]);
  assert.equal(index.entries[critical.backupId].mode, "critical");
  assert.equal(Object.keys(index.daily).length, 7);
  assert.equal(Object.keys(index.weekly).length, 4);
  assert.equal(index.pendingPrune.length, 0);
  assert.equal(
    (await verifyBackup({ directory: critical.archivePath, key: f.key }))
      .backupId,
    critical.backupId,
  );
});

test("disabled schedule and repeated daily ticks never fabricate new captures; downtime records a missed window", async () => {
  const f = await fixture();
  assert.equal(
    (await runBackup({ ...f, now: clock(1) })).state,
    "schedule_disabled",
  );
  assert.equal(f.captures(), 0);
  const first = await runBackup({ ...f, scheduleEnabled: true, now: clock(1) });
  assert.equal(first.state, "verified");
  assert.equal(
    (await runBackup({ ...f, scheduleEnabled: true, now: clock(1) })).state,
    "not_due",
  );
  assert.equal(f.captures(), 1);
  const next = await runBackup({ ...f, scheduleEnabled: true, now: clock(4) });
  assert.equal(next.missedDailyWindow, true);
  assert.equal(next.operationalExternalBackupActive, false);
  assert.equal(next.recoveryD6Proved, false);
  const index = await backupStoreStatus(f);
  assert.equal(Object.keys(index.daily).length, 2);
  await assert.rejects(
    runBackup({ ...f, mode: "critical", now: clock(2) }),
    /clock regressed/,
  );
});

test("concurrent operators cannot create two backups for one daily slot", async () => {
  const f = await fixture();
  let release, entered;
  const gate = new Promise((r) => {
      release = r;
    }),
    entry = new Promise((r) => {
      entered = r;
    });
  const first = runBackup({
    ...f,
    scheduleEnabled: true,
    now: clock(1),
    capture: async (path) => {
      entered();
      await gate;
      return f.capture(path);
    },
  });
  await entry;
  await assert.rejects(
    runBackup({ ...f, scheduleEnabled: true, now: clock(1) }),
    (error) => error.code === "EEXIST",
  );
  release();
  await first;
  assert.equal(f.captures(), 1);
  assert.equal(Object.keys((await backupStoreStatus(f)).entries).length, 1);
});

test("an interrupted capture is quarantined and failure receipts contain no private error payload", async () => {
  const f = await fixture(),
    secret = "PRIVATE_ERROR_SENTINEL";
  await assert.rejects(
    runBackup({
      ...f,
      mode: "critical",
      now: clock(1),
      capture: async (path) => {
        await createOperatorDirectory(path);
        await writeFile(join(path, "partial.txt"), "Synthetic partial capture");
        throw new Error(secret);
      },
    }),
  );
  assert.equal(Object.keys((await backupStoreStatus(f)).entries).length, 0);
  assert.equal((await readdir(join(f.root, "archives"))).length, 0);
  const runs = await readdir(join(f.root, "runs"));
  assert.equal(runs.length, 1);
  const receipt = await readFile(join(f.root, "runs", runs[0]), "utf8");
  assert.ok(!receipt.includes(secret));
  assert.equal(JSON.parse(receipt).state, "not_confirmed");
  await runBackup({ ...f, mode: "critical", now: clock(2) });
  assert.equal(Object.keys((await backupStoreStatus(f)).entries).length, 1);
  assert.equal(
    (await readdir(join(f.root, "captures"))).length,
    1,
    "failed plaintext capture remains private for explicit reconciliation",
  );
});

test("corrupt retired archives remain quarantined in an authenticated prune queue instead of being deleted", async () => {
  const f = await fixture();
  await runBackup({ ...f, scheduleEnabled: true, now: clock(1) });
  const damaged = await runBackup({
    ...f,
    scheduleEnabled: true,
    now: clock(2),
  });
  const file = join(damaged.archivePath, "000000.gcm"),
    bytes = await readFile(file);
  bytes[0] ^= 1;
  await writeFile(file, bytes);
  let result;
  for (let day = 3; day <= 10; day++)
    result = await runBackup({ ...f, scheduleEnabled: true, now: clock(day) });
  assert.equal(result.state, "verified");
  assert.equal(result.retentionComplete, false);
  const index = await backupStoreStatus(f);
  assert.ok(index.pendingPrune.some((e) => e.id === damaged.backupId));
  assert.ok(
    (await readdir(join(f.root, "archives"))).includes(damaged.backupId),
  );
  await assert.rejects(
    verifyBackup({ directory: damaged.archivePath, key: f.key }),
  );
});

test("wrong keys, tampered indexes and unsafe linked paths fail before another capture or removal", async () => {
  const f = await fixture();
  await runBackup({ ...f, mode: "critical", now: clock(1) });
  await assert.rejects(
    runBackup({ ...f, key: randomBytes(32), mode: "critical", now: clock(2) }),
    /authentication/,
  );
  const path = join(f.root, "index.json"),
    original = await readFile(path, "utf8"),
    index = JSON.parse(original);
  index.payload = index.payload.replace('"critical"', '"scheduled"');
  await writeFile(path, JSON.stringify(index));
  await assert.rejects(
    runBackup({ ...f, mode: "critical", now: clock(2) }),
    /authentication/,
  );
  assert.equal(f.captures(), 1);
  await writeFile(path, original);
  const target = join(f.parent, "unrelated"),
    link = join(f.parent, "linked");
  await createOperatorDirectory(target);
  await writeFile(join(target, "keep.txt"), "untouched");
  await symlink(
    target,
    link,
    process.platform === "win32" ? "junction" : "dir",
  );
  await assert.rejects(externalOperatorPath(join(link, "keep.txt")), /links/);
  await assert.rejects(
    removeOperatorBackupTree(f.root, "archives", "../unrelated"),
    /Unsafe/,
  );
  assert.equal(await readFile(join(target, "keep.txt"), "utf8"), "untouched");
  assert.ok(resolve(f.root).startsWith(resolve(f.parent)));
});
