import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extractBackup } from "./backup-archive.mjs";
import { getTestEnvironment, testContainer } from "./test-environment.mjs";
import { trustedExecutable } from "./trusted-executable.mjs";
import { verifyStorageCapture } from "./verify-storage-capture.mjs";

const prefix = "hca_restore_probe_";
export function assertProbeDatabase(name) {
  if (typeof name !== "string" || !/^hca_restore_probe_[a-f0-9]{12}$/.test(name)) throw new Error("Only a new isolated recovery-probe database is permitted.");
  return name;
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
    const differences = Object.keys(expected).filter((name) => JSON.stringify(expected[name]) !== JSON.stringify(restored[name]));
    // Separate pg_dump and Management API snapshots can differ in two live cron
    // cursors/heartbeats. Their captured rows are restored; they are not a claim
    // of an atomic cut across two independently committed reads.
    const volatile = new Set(["private.bal_scheduler_progress", "private.scheduler_health"]);
    const unexpected = differences.filter((name) => !volatile.has(name) || expected[name].rows !== restored[name]?.rows);
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
    const renders = JSON.parse(sql("select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select object_path,sha256 from public.document_pdf_renders union select object_path,sha256 from public.document_pdfs) x;").split(/\r?\n/).find((line) => line.startsWith("[")));
    for (const render of renders) {
      const object = storage.objects.find((entry) => entry.bucket === "document-receipts" && entry.name === render.object_path);
      assert.ok(object, "Registered PDF bytes must exist in the recovery package.");
      assert.equal(object.sha256, render.sha256, "Registered PDF digest must match recovered Storage bytes.");
    }
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
    result = { ...verified, restoredTables: Object.keys(expected).length, stableTableDigestsMatched: true, volatileSnapshotDifferences: differences, foreignKeysChecked: true, storageObjectsVerified: storage.objects.length, pdfDigestsVerified: renders.length, migrationsAppliedToProbe: migrations, catalogueComparison, cronEnabled: false, networkExtensionEnabled: false, seconds: (Date.now() - start) / 1000, operationalRecoveryGate: "D6_NOT_SATISFIED_BY_THIS_PROBE" };
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
