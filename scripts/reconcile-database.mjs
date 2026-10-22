import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { isAbsolute, join, dirname } from "node:path";
import { sql } from "./test-environment.mjs";

const root = "docs/audits/2026-10-21";
function remote(file) {
  return JSON.parse(execFileSync(process.execPath, ["scripts/supabase-project.mjs", "db", "query", "--linked", "--file", isAbsolute(file) ? file : `${root}/${file}`, "--output-format", "json"], { encoding: "utf8", maxBuffer: 2_000_000 }));
}
function save(name, value) { writeFileSync(`${root}/${name}.json`, JSON.stringify(value, null, 2) + "\n"); }
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}

// These fixed repository queries contain only BEGIN READ ONLY and aggregate/catalog
// SELECTs. Administrative authentication uses the pinned project wrapper.
const local = JSON.parse(sql(readFileSync(`${root}/public-metadata.sql`, "utf8")));
const hosted = remote("public-metadata.sql");
const remoteMetadata = hosted.rows[0].metadata;
save("LOCAL_METADATA", local);
save("REMOTE_METADATA", hosted);
const components = Object.fromEntries(Object.keys(local).map((key) => [key, {
  localCount: Array.isArray(local[key]) ? local[key].length : undefined,
  remoteCount: Array.isArray(remoteMetadata[key]) ? remoteMetadata[key].length : undefined,
  equal: JSON.stringify(canonical(local[key])) === JSON.stringify(canonical(remoteMetadata[key])),
}]));
const integrity = remote("remote-integrity.sql");
const before = JSON.parse(readFileSync(`${root}/REMOTE_BEFORE.json`, "utf8")).rows[0].integrity;
const after = integrity.rows[0].integrity;
save("REMOTE_AFTER", integrity);
save("SERVICE_GRANTS_REMOTE_AFTER", remote("service-grants.sql"));
const preservedKeys = ["requests", "items", "movements", "request_integrity", "item_integrity", "movement_integrity"];
const aggregateUnchanged = preservedKeys.every((key) => before[key] === after[key]);
let dataPreserved = aggregateUnchanged;
let baselineVerification;
if (!aggregateUnchanged) {
  const backupIndex = process.argv.indexOf("--baseline-backup");
  const backup = backupIndex < 0 ? undefined : process.argv[backupIndex + 1];
  assert.ok(backup && isAbsolute(backup), "New remote records require comparison of the original IDs from the verified external backup.");
  const bytes = readFileSync(backup);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  assert.equal(sha256, "516d0b63956959a4a543d7691657ead26dfc0333fa4de782aff3cf0fd534602d", "Expected the verified pre-migration public data backup.");
  let query = readFileSync(`${root}/remote-integrity.sql`, "utf8");
  for (const [table, count] of [["requisitions", "requests"], ["requisition_items", "items"], ["stock_movements", "movements"]]) {
    const block = bytes.toString("utf8").match(new RegExp(`COPY "public"\\."${table}" \\([^\\n]+\\) FROM stdin;\\r?\\n([\\s\\S]*?)\\\\\\.`, "m"));
    assert.ok(block, `Missing baseline COPY block for ${table}`);
    const ids = block[1].trim().split(/\r?\n/).filter(Boolean).map((line) => line.split("\t")[0]);
    assert.equal(ids.length, before[count]);
    assert.ok(ids.every((id) => /^[a-f0-9-]{36}$/i.test(id)));
    const filter = ids.length ? `id in (${ids.map((id) => `'${id}'`).join(",")})` : "false";
    query = query.replaceAll(`from public.${table})`, `from public.${table} where ${filter})`);
  }
  // IDs and query remain beside the private backup, never in the repository.
  const queryFile = join(dirname(backup), "remote-original-records-integrity.sql");
  writeFileSync(queryFile, query, { mode: 0o600 });
  const original = remote(queryFile).rows[0].integrity;
  dataPreserved = preservedKeys.every((key) => before[key] === original[key]);
  baselineVerification = { backupSha256: sha256, originalRecordHashesPreserved: dataPreserved, original, newRequests: after.requests - before.requests, newItems: after.items - before.items };
  save("REMOTE_ORIGINAL_INTEGRITY", baselineVerification);
}
const migrationCount = readdirSync("supabase/migrations").filter((file) => file.endsWith(".sql")).length;
save("DATABASE_COMPARISON", {
  generatedAt: new Date().toISOString(),
  method: "Read-only SQL catalogs; canonical object keys; function hashes normalize CRLF to LF only; aggregate or verified original-record integrity hashes; no patient row data.",
  migrationCount, remoteMigrationCount: after.migrations, components, dataPreserved, aggregateUnchanged, baselineVerification,
  activeGlobalAdministrators: after.global_admins,
});
assert.ok(Object.values(components).every((component) => component.equal), "Local and remote metadata differ; inspect DATABASE_COMPARISON.json.");
assert.equal(after.migrations, migrationCount);
assert.ok(dataPreserved, "Remote historical records changed; investigate before publication.");
assert.ok(after.global_admins >= 1);
console.log(`Local and remote catalogs match; ${migrationCount} migrations; historical request/item/movement hashes preserved.`);
