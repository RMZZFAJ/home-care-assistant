import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

export const testProject = "home-care-assistant";
export const testRoot = resolve(process.cwd());
export const testDataRoot = join(testRoot, "supabase", ".temp");
export const fixtureFile = join(testDataRoot, "hca-fixtures.json");
export const testContainer = `supabase_db_${testProject}`;

export function assertLocalProject({ running = true } = {}) {
  const config = join(testRoot, "supabase", "config.toml");
  if (resolve(process.cwd()) !== testRoot || !existsSync(config) || !/^project_id\s*=\s*"home-care-assistant"\s*$/m.test(readFileSync(config, "utf8"))) {
    throw new Error("Run local database commands from the verified home-care-assistant repository.");
  }
  // A repository may be linked to production. Tests always use --local or the exact local container;
  // the link and authentication metadata are preserved and never used as a mutable target.
  if (running) {
    let labels;
    try {
      labels = JSON.parse(execFileSync("docker", ["inspect", testContainer, "--format", "{{json .Config.Labels}}"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
    } catch { throw new Error("The development database is not running. Use npm run test:db:prepare."); }
    if (labels["com.supabase.cli.project"] !== testProject || resolve(labels["com.supabase.cli.workdir"] ?? "") !== testRoot) {
      throw new Error("Refusing a database container that does not belong to this repository.");
    }
  }
}

export function getTestEnvironment() {
  assertLocalProject();
  let status;
  try {
    status = JSON.parse(execFileSync("supabase", ["status", "--workdir", testRoot, "-o", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  } catch { throw new Error("Local Supabase is not healthy. Use npm run test:db:prepare."); }
  const api = new URL(status.API_URL);
  const database = new URL(status.DB_URL);
  if (![api.hostname, database.hostname].every((host) => ["127.0.0.1", "localhost"].includes(host)) || api.port !== "54321" || database.port !== "54322") {
    throw new Error("Refusing a target outside the local development API/database ports.");
  }
  return { url: "http://127.0.0.1:54321", anonKey: status.ANON_KEY, serviceKey: status.SERVICE_ROLE_KEY };
}

export function assertLocalReplay() {
  getTestEnvironment();
  const backupIndex = process.argv.indexOf("--backup");
  const backup = backupIndex >= 0 ? process.argv[backupIndex + 1] : undefined;
  if (!process.argv.includes("--replay-local") || !backup) {
    throw new Error("Local reset/replay requires explicit --replay-local --backup <verified backup file>. Ordinary prepare never resets data.");
  }
  const file = resolve(backup);
  if (!existsSync(file) || !statSync(file).isFile() || statSync(file).size === 0 || !existsSync(`${file}.json`)) {
    throw new Error("A nonempty local backup and its .json manifest are required before reset.");
  }
  const manifest = JSON.parse(readFileSync(`${file}.json`, "utf8"));
  const sha256 = createHash("sha256").update(readFileSync(file)).digest("hex");
  if (manifest.projectId !== testProject || manifest.container !== testContainer || manifest.sha256 !== sha256 || !Number.isFinite(Date.parse(manifest.createdAt))) {
    throw new Error("Backup manifest does not prove this local project's backup integrity.");
  }
  return file;
}

export function sql(statement) {
  assertLocalProject();
  const result = spawnSync("docker", ["exec", "-i", testContainer, "psql", "-U", "postgres", "-d", "postgres", "-X", "-qAt", "-v", "ON_ERROR_STOP=1"], { input: statement, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`Local SQL failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

export function sqlLiteral(value) { return `'${String(value).replaceAll("'", "''")}'`; }
