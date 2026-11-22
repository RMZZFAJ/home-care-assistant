import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { createOperatorDirectory } from "../../scripts/operator-files.mjs";
import { sealBackup } from "../../scripts/backup-archive.mjs";
import { reportOperatorEvent, reportVerifiedBackup } from "../../scripts/operations-telemetry.mjs";

const owned = [];
afterEach(async () => { for (const path of owned.splice(0)) { const target = await realpath(path), parent = await realpath(tmpdir()); assert.equal(dirname(target), parent); assert.ok(target.startsWith(join(parent, "hca-operations-telemetry-"))); await rm(target, { recursive: true }); } });
async function fixture() {
  const parent = await mkdtemp(join(tmpdir(), "hca-operations-telemetry-")); owned.push(parent);
  const source = join(parent, "source"), archivePath = join(parent, "archive"), serviceKeyFile = join(parent, "service-key.txt"), key = randomBytes(32), at = new Date().toISOString();
  await createOperatorDirectory(source); await writeFile(join(source, "controlled.txt"), "Private controlled fixture not to be sent.");
  await writeFile(serviceKeyFile, "synthetic-service-key", { mode: 0o600 });
  const sealed = await sealBackup({ source, destination: archivePath, key, metadata: { project: "qwfrqychokvhdzakibid", migrationsMatched: 146, stableTablesMatchedAcrossCapture: true, requestedAt: at } });
  const receipt = { ...sealed, state: "verified", at, archivePath, retentionComplete: true };
  return { parent, archivePath, key, receipt, config: { enabled: true, url: "http://127.0.0.1:54321", serviceKeyFile } };
}
test("operator reporting is disabled by default; an authenticated archive supplies only technical evidence and its original time", async () => {
  const f = await fixture(), calls = [], transport = async (url, input) => { const body = JSON.parse(input.body); calls.push({ url: String(url), input, body }); return Response.json({ recorded: true, idempotencyKey: body.p_event.idempotencyKey }); };
  assert.equal(await reportVerifiedBackup(undefined, f.receipt, f.key, transport), "disabled"); assert.equal(calls.length, 0);
  assert.equal(await reportVerifiedBackup(f.config, f.receipt, f.key, transport), "confirmed"); assert.equal(calls.length, 1);
  const event = calls[0].body.p_event;
  assert.equal(event.code, "BACKUP_VERIFIED"); assert.equal(event.observedAt, f.receipt.at); assert.equal(event.metrics.sourceMigrations, 146);
  assert.equal(event.metrics.manifestSha256, f.receipt.manifestSha256);
  assert.ok(!JSON.stringify(event).includes(f.parent)); assert.ok(!JSON.stringify(event).includes("Private controlled")); assert.ok(!JSON.stringify(event).includes("synthetic-service-key"));
  assert.equal(await reportVerifiedBackup(f.config, { ...f.receipt, at: new Date(Date.now()+5000).toISOString() }, f.key, transport), "unconfirmed");
  assert.equal(await reportVerifiedBackup(f.config, f.receipt, randomBytes(32), transport), "unconfirmed");
  assert.equal(calls.length, 1);
});
test("telemetry failure, wrong receipt or unapproved host preserves the verified archive without confirmation", async () => {
  const f = await fixture(), bytes = await readFile(join(f.archivePath, "manifest.gcm")), event = { environment: "operator", component: "backup", code: "BACKUP_FAILURE", idempotencyKey: randomUUID(), correlationId: randomUUID(), observedAt: new Date().toISOString(), metrics: { count: 1 } };
  let calls = 0; const transport = async () => { calls++; throw new Error("PRIVATE_DIAGNOSTIC"); };
  assert.equal(await reportVerifiedBackup(f.config, f.receipt, f.key, transport), "unconfirmed");
  assert.equal(calls, 1);
  assert.equal(await reportOperatorEvent({ ...f.config, url: "https://unapproved.invalid" }, event, transport), "unconfirmed"); assert.equal(calls, 1);
  assert.equal(await reportVerifiedBackup(f.config, f.receipt, f.key, async () => Response.json({ recorded: true, idempotencyKey: randomUUID() })), "unconfirmed");
  assert.deepEqual(await readFile(join(f.archivePath, "manifest.gcm")), bytes);
});
