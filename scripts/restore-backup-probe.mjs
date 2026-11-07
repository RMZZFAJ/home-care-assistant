import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extractBackup } from "./backup-archive.mjs";
import { getTestEnvironment, testContainer } from "./test-environment.mjs";
import { trustedExecutable } from "./trusted-executable.mjs";
import { compareBackupSnapshots } from "./backup-snapshots.mjs";
import { verifyStorageCapture } from "./verify-storage-capture.mjs";

const prefix = "hca_restore_probe_";
export function assertProbeDatabase(name) {
  if (typeof name !== "string" || !/^hca_restore_probe_[a-f0-9]{12}$/.test(name)) throw new Error("Only a new isolated recovery-probe database is permitted.");
  return name;
}

/** Compare the restored registries with Storage bytes already authenticated. */
export function verifyRegisteredPdfCapture(sql, storage) {
  const rows = (query) => JSON.parse(sql(query).split(/\r?\n/).find((line) => line.startsWith("[")));
  const legacy = rows("select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select object_path,sha256 from public.document_pdf_renders union select object_path,sha256 from public.document_pdfs) x;");
  // D-A captures predate this table. Never reference it in a parsed query until
  // its existence in the isolated restored database has been confirmed.
  const signed = sql("select to_regclass('private.pdf_issuances') is not null;").trim() === "t"
    ? rows("select coalesce(jsonb_agg(jsonb_build_object('object_path',object_path,'sha256',sha256)),'[]'::jsonb) from private.pdf_issuances where state='ready';")
    : [];
  for (const reference of [...legacy, ...signed]) {
    const object = storage.objects.find((entry) => entry.bucket === "document-receipts" && entry.name === reference.object_path);
    assert.ok(object, "Registered PDF bytes must exist in the recovery package.");
    assert.equal(object.sha256, reference.sha256, "Registered PDF digest must match recovered Storage bytes.");
  }
  return { pdfDigestsVerified: legacy.length + signed.length, signedIssuanceDigestsVerified: signed.length };
}

/** No reset, no roles import and no second Supabase stack. The original DB is untouched. */
export async function probeRestore({ directory, key, destination, applyAfterVersion }) {
  getTestEnvironment();
  if (!isAbsolute(destination)) throw new Error("An explicit external restore directory is required.");
  const verified = await extractBackup({ directory, destination, key });
  const source = JSON.parse(readFileSync(join(destination, "source.json"), "utf8"));
  assert.equal(source.project, "qwfrqychokvhdzakibid", "Recovery source must be the authorized project.");
  const storage = verifyStorageCapture(destination);
  const docker = trustedExecutable("docker");
  const database = assertProbeDatabase(prefix + randomBytes(6).toString("hex"));
  const run = (args, input) => {
    const child = spawnSync(docker, args, { input, encoding: "utf8", maxBuffer: 16_000_000 });
    if (child.error || child.status !== 0) {
      // Raw diagnostics can contain row data. Keep them only beside the protected capture.
      writeFileSync(join(destination, `failure-${randomBytes(4).toString("hex")}.log`), (child.stderr ?? "") + (child.stdout ?? ""), { flag: "wx", mode: 0o600 });
      throw new Error("Isolated restore failed. Protected diagnostics retained; source database unchanged.");
    }
    return child.stdout;
  };
  const sql = (body) => run(["exec", "-i", testContainer, "psql", "-X", "-U", "supabase_admin", "-d", assertProbeDatabase(database), "-v", "ON_ERROR_STOP=1", "-At"], body);
  const start = Date.now();
  run(["exec", testContainer, "createdb", "-U", "supabase_admin", "--owner=postgres", "--template=template0", database]);
  let result;
  try {
    sql(`revoke connect on database ${database} from public,anon,authenticated,service_role;
      create schema extensions;
      create extension pgcrypto with schema extensions;
      create extension "uuid-ossp" with schema extensions;
      create extension btree_gist with schema extensions;
      create extension unaccent with schema public;`);
    const schema = readFileSync(join(destination, "schema.sql"), "utf8");
    const data = readFileSync(join(destination, "data.sql"), "utf8");
    const managed = readFileSync(join(destination, "managed-metadata.sql"), "utf8");
    const defaults = readFileSync(join(destination, "default-privileges.sql"), "utf8");
    // COPY has circular FKs. Disable their triggers in this isolated connection only.
    sql("begin; set local session_replication_role=replica;\n" + schema + "\n" + data + "\n" + managed + "\n" + defaults + "\ncommit;");
    const query = readFileSync(join(destination, "state-query.sql"), "utf8");
    const expected = JSON.parse(readFileSync(join(destination, "state-before.json"), "utf8")).rows[0].snapshot;
    const restored = JSON.parse(sql(query).split(/\r?\n/).find((line) => line.startsWith("{")));
    // v2 projects only named replay-safe clock/cursor fields. Versions, policy
    // fingerprints, failure cause and every business table remain exact.
    const { differences, unexpected } = compareBackupSnapshots(expected, restored, source.snapshotVersion ?? 1);
    assert.deepEqual(unexpected, [], "Every stable captured table count and row digest must restore exactly.");
    const foreignKeyCheck = `do $verify$ declare c record; bad boolean; predicate text; guards text; begin
      for c in select conrelid::regclass relation,confrelid::regclass target,conkey,confkey from pg_constraint where contype='f' loop
       select string_agg(format('r.%I=t.%I',a.attname,b.attname),' and ' order by x.i),string_agg(format('r.%I is not null',a.attname),' and ' order by x.i)
        into predicate,guards from generate_subscripts(c.conkey,1) x(i)
        join pg_attribute a on a.attrelid=c.relation and a.attnum=c.conkey[x.i]
        join pg_attribute b on b.attrelid=c.target and b.attnum=c.confkey[x.i];
       execute format('select exists(select 1 from %s r where %s and not exists(select 1 from %s t where %s))',c.relation,guards,c.target,predicate) into bad;
       if bad then raise exception 'restored foreign key has orphaned records'; end if;
      end loop; end; $verify$;`;
    sql(foreignKeyCheck);
    const pdfCoverage = verifyRegisteredPdfCapture(sql, storage);
    const forbiddenExtensions = Number(sql("select count(*) from pg_extension where extname in ('pg_cron','pg_net');").trim());
    assert.equal(forbiddenExtensions, 0, "Recovery probe must have no cron or HTTP-egress extension.");
    const migrations = [];
    if (applyAfterVersion !== undefined) {
      if (!/^\d{14}$/.test(applyAfterVersion)) throw new Error("An explicit baseline migration version is required.");
      for (const name of readdirSync("supabase/migrations").filter((name) => name.endsWith(".sql") && name.slice(0, 14) > applyAfterVersion).sort((a, b) => a.localeCompare(b, "en"))) {
        sql("begin; set local role postgres; set local lock_timeout='5s'; set local statement_timeout='60s';\n" + readFileSync(join("supabase/migrations", name), "utf8") + "\ncommit;");
        migrations.push(name);
      }
    }
    let catalogueComparison = null;
    if (migrations.length) {
      const catalogueSql = readFileSync("scripts/migration-catalogue.sql", "utf8");
      const parse = (output) => JSON.parse(output.split(/\r?\n/).find((line) => line.startsWith("{")));
      const candidate = parse(sql(catalogueSql));
      const local = parse(run(["exec", "-i", testContainer, "psql", "-X", "-U", "supabase_admin", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At"], catalogueSql));
      catalogueComparison = Object.fromEntries(Object.keys(local).map((section) => [section, JSON.stringify(candidate[section]) === JSON.stringify(local[section])]));
      writeFileSync(join(destination, "CATALOGUE_COMPARISON.json"), JSON.stringify({ comparison: catalogueComparison, candidate, local }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
      // Catalogue text differences remain a separate preflight review. A
      // successful restore never promotes unmatched sections to equivalent.
    }
    result = { ...verified, restoredTables: Object.keys(expected).length, stableTableDigestsMatched: true, volatileSnapshotDifferences: differences, foreignKeysChecked: true, storageObjectsVerified: storage.objects.length, ...pdfCoverage, migrationsAppliedToProbe: migrations, catalogueComparison, cronEnabled: false, networkExtensionEnabled: false, seconds: (Date.now() - start) / 1000, operationalRecoveryGate: "D6_NOT_SATISFIED_BY_THIS_PROBE" };
    writeFileSync(join(destination, "RECOVERY_PROBE.json"), JSON.stringify(result, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  } finally {
    // Name is generated locally and checked again; never drops postgres or a supplied target.
    run(["exec", testContainer, "dropdb", "-U", "supabase_admin", "--if-exists", assertProbeDatabase(database)]);
  }
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const option = (name) => { const index = process.argv.indexOf(name); if (index < 0 || !process.argv[index + 1]) throw new Error(`Required option: ${name}`); return process.argv[index + 1]; };
    const key = readFileSync(option("--key-file"));
    console.log(JSON.stringify(await probeRestore({ directory: option("--archive"), destination: option("--destination"), key, applyAfterVersion: process.argv.includes("--apply-after") ? option("--apply-after") : undefined })));
  } catch (error) { console.error(error instanceof Error ? error.message : "Recovery probe failed."); process.exitCode = 1; }
}
