import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createOperatorDirectory,
  externalOperatorPath,
} from "./operator-files.mjs";
import { migrationHistoryMatches } from "./migration-history.mjs";
import { verifyStorageCapture } from "./verify-storage-capture.mjs";
import { trustedExecutable } from "./trusted-executable.mjs";
import {
  backupStateQuery,
  compareBackupSnapshots,
} from "./backup-snapshots.mjs";

const repository = fileURLToPath(new URL("..", import.meta.url));
/** Read-only source adapter. Any stable-row or Storage mismatch quarantines the capture. */
export async function captureRemoteBackup(
  destination,
  { project, cliExecutable, profileFile },
  progress = () => {},
) {
  assert.equal(
    project,
    "qwfrqychokvhdzakibid",
    "Only the mission's linked source is authorized.",
  );
  assert.equal(
    readFileSync(join(repository, "supabase/.temp/project-ref"), "utf8").trim(),
    project,
  );
  const cli = await externalOperatorPath(cliExecutable);
  const pointer = await externalOperatorPath(profileFile);
  const profile = readFileSync(pointer, "utf8").trim();
  await externalOperatorPath(profile);
  const version = spawnSync(cli, ["--version"], {
    cwd: repository,
    encoding: "utf8",
    timeout: 15_000,
  });
  assert.equal(version.status, 0, "Supabase CLI unavailable.");
  assert.equal(
    version.stdout.trim(),
    "2.121.0",
    "Use the project's pinned CLI.",
  );
  const root = await createOperatorDirectory(destination);
  const save = (name, value) =>
    writeFileSync(
      join(root, name),
      typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n",
      { flag: "wx", mode: 0o600 },
    );
  function run(args, label, cwd = repository) {
    progress(label);
    const r = spawnSync(cli, [...args, "--profile", profile], {
      cwd,
      encoding: "utf8",
      maxBuffer: 64_000_000,
      timeout: 240_000,
    });
    save(label + ".log", (r.stderr ?? "") + "\n" + (r.stdout ?? ""));
    if (r.error || r.status !== 0)
      throw new Error(
        "Remote backup capture failed; inspect the protected capture.",
      );
    return r.stdout;
  }
  function query(body, label) {
    const file = join(root, label + ".sql");
    save(label + ".sql", "begin read only;\n" + body + "\ncommit;\n");
    const result = JSON.parse(
      run(
        ["db", "query", "--linked", "--file", file, "--output", "json"],
        label,
      ),
    );
    assert.ok(Array.isArray(result.rows));
    save(label + ".json", result);
    return result;
  }
  const history = query(
    "select version,name,statements from supabase_migrations.schema_migrations order by version;",
    "history-before",
  );
  const files = readdirSync(join(repository, "supabase/migrations"))
    .filter((n) => n.endsWith(".sql"))
    .sort();
  assert.ok(history.rows.length > 0);
  for (const row of history.rows) {
    const file = files.find((n) => n.startsWith(row.version + "_"));
    assert.ok(
      file &&
        migrationHistoryMatches(
          readFileSync(join(repository, "supabase/migrations", file), "utf8"),
          row.statements,
        ),
      "Remote migration content differs from the repository.",
    );
  }
  const pending = files.filter(
    (n) => n.slice(0, 14) > history.rows.at(-1).version,
  );
  save("history-verification.json", {
    matched: history.rows.length,
    pending: pending.map((file) => ({
      file,
      sha256: createHash("sha256")
        .update(readFileSync(join(repository, "supabase/migrations", file)))
        .digest("hex"),
    })),
  });
  const tables = query(
    "select n.nspname schema,c.relname name from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private','auth','storage','supabase_migrations') and c.relkind='r' order by n.nspname,c.relname;",
    "tables",
  );
  const ident = (s) => '"' + s.replaceAll('"', '""') + '"';
  const stateQuery = backupStateQuery(tables.rows);
  save("state-query.sql", "begin read only;\n" + stateQuery + "\ncommit;\n");
  const before = query(stateQuery, "state-before").rows[0].snapshot;
  query(
    readFileSync(join(repository, "scripts/migration-catalogue.sql"), "utf8")
      .replace(/^begin read only;/, "")
      .replace(/commit;\s*$/, ""),
    "catalogue-before",
  );
  const managed = [];
  for (const [schema, name] of [
    ["auth", "schema_migrations"],
    ["storage", "migrations"],
  ]) {
    const result = query(
      `select format('insert into %I.%I select * from jsonb_populate_record(null::%I.%I,%L::jsonb);','${schema}','${name}','${schema}','${name}',to_jsonb(t)::text) statement from ${ident(schema)}.${ident(name)} t;`,
      "managed-" + schema,
    );
    managed.push(...result.rows.map((r) => r.statement));
  }
  save("managed-metadata.sql", managed.join("\n") + "\n");
  const defaults = query(
    "select pg_get_userbyid(d.defaclrole) owner,case when d.defaclnamespace=0 then null else n.nspname end schema,d.defaclobjtype type,(select jsonb_agg(jsonb_build_object('grantee',case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,'privilege',a.privilege_type,'grantable',a.is_grantable) order by a.grantee,a.privilege_type) from aclexplode(d.defaclacl) a) grants from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace where n.nspname in ('public','private') or d.defaclnamespace=0 order by owner,schema,type;",
    "default-acl",
  );
  const types = {
      r: "TABLES",
      S: "SEQUENCES",
      f: "FUNCTIONS",
      T: "TYPES",
      n: "SCHEMAS",
    },
    defaultSql = [];
  for (const d of defaults.rows) {
    const type = types[d.type];
    assert.ok(type);
    const prefix = `alter default privileges for role ${ident(d.owner)}${d.schema ? " in schema " + ident(d.schema) : ""}`,
      role = (x) => (x === "PUBLIC" ? "PUBLIC" : ident(x));
    const grantees = [
      ...new Set([
        "PUBLIC",
        "anon",
        "authenticated",
        "service_role",
        "postgres",
        d.owner,
        ...(d.grants ?? []).map((x) => x.grantee),
      ]),
    ];
    defaultSql.push(
      `${prefix} revoke all on ${type} from ${grantees.map(role).join(",")};`,
    );
    for (const g of d.grants ?? []) {
      assert.match(g.privilege, /^[A-Z]+$/);
      defaultSql.push(
        `${prefix} grant ${g.privilege} on ${type} to ${role(g.grantee)}${g.grantable ? " with grant option" : ""};`,
      );
    }
  }
  save("default-privileges.sql", defaultSql.join("\n") + "\n");
  // Values in Vault require separate platform/operator custody. This records
  // recoverable job definitions and references, never claims platform root export.
  query(
    "select (select coalesce(jsonb_agg(to_jsonb(j) order by jobname),'[]') from cron.job j) jobs,(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'description',description) order by id),'[]') from vault.secrets) vault_references;",
    "runtime-recovery-references",
  );
  for (const [label, extra] of [
    ["schema", []],
    ["data", ["--data-only", "--use-copy"]],
    ["roles", ["--role-only"]],
  ]) {
    run(
      [
        "db",
        "dump",
        "--linked",
        ...(label === "roles"
          ? []
          : ["--schema", "public,private,auth,storage,supabase_migrations"]),
        ...extra,
        "--file",
        join(root, label + ".sql"),
      ],
      label + "-capture",
    );
  }
  const inventory = query(
    "select bucket_id,name,metadata from storage.objects order by bucket_id,name;",
    "storage-inventory",
  );
  mkdirSync(join(root, "storage"), { mode: 0o700 });
  for (const bucket of [...new Set(inventory.rows.map((r) => r.bucket_id))]) {
    assert.match(bucket, /^[a-z0-9-]+$/);
    run(
      [
        "storage",
        "cp",
        "--project-ref",
        project,
        "--experimental",
        "--recursive",
        "ss:///" + bucket,
        "./storage/" + bucket,
      ],
      "storage-" + bucket,
      root,
    );
  }
  const storage = verifyStorageCapture(root),
    after = query(stateQuery, "state-after-capture").rows[0].snapshot;
  const { differences, unexpected } = compareBackupSnapshots(before, after, 2);
  assert.deepEqual(
    unexpected,
    [],
    "Source changed during capture; quarantine and retry.",
  );
  const source = {
    project,
    snapshotVersion: 2,
    sha: spawnSync(trustedExecutable("git"), ["rev-parse", "HEAD"], {
      cwd: repository,
      encoding: "utf8",
    }).stdout.trim(),
    capturedAt: new Date().toISOString(),
    migrations: history.rows.length,
    storageObjects: storage.objects.length,
    cronIncluded: false,
    egressIncluded: false,
    runtimeConfigurationReferencesIncluded: true,
    vaultValuesRequireSeparateCustody: true,
  };
  save("source.json", source);
  const complete = {
    project,
    migrationsMatched: history.rows.length,
    pending: pending.length,
    storageObjects: storage.objects.length,
    storageBytes: storage.objects.reduce((n, x) => n + x.bytes, 0),
    defaultScopes: defaults.rows.length,
    tableSnapshots: tables.rows.length,
    stableTablesMatchedAcrossCapture: true,
    volatileSnapshotDifferences: differences,
  };
  save("CAPTURE_COMPLETE.json", complete);
  return { ...source, ...complete };
}
