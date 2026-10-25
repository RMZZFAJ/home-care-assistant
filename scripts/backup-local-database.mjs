import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, mkdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import { getTestEnvironment, testContainer, testProject, testRoot } from "./test-environment.mjs";

function completion(child) {
  return new Promise((done, fail) => {
    child.once("error", fail);
    child.once("close", (code) => code === 0 ? done() : fail(new Error(`Local backup command failed with exit ${code}.`)));
  });
}

export async function backupLocalDatabase() {
  getTestEnvironment();
  const directory = resolve(process.env.LOCALAPPDATA ?? join(homedir(), ".local", "share"), "home-care-assistant", "backups");
  const withinWorkspace = relative(testRoot, directory);
  if (!isAbsolute(withinWorkspace) && withinWorkspace !== ".." && !withinWorkspace.startsWith(`..${sep}`)) throw new Error("Backups must stay outside the Git workspace.");
  mkdirSync(directory, { recursive: true });
  const createdAt = new Date().toISOString();
  const file = join(directory, `local-${createdAt.replaceAll(/[^0-9TZ]/g, "")}.dump`);
  const dump = spawn("docker", ["exec", testContainer, "pg_dump", "-U", "postgres", "-d", "postgres", "--format=custom"], { stdio: ["ignore", "pipe", "ignore"] });
  await Promise.all([completion(dump), pipeline(dump.stdout, createWriteStream(file, { flags: "wx", mode: 0o600 }))]);
  if (statSync(file).size === 0) throw new Error("Local backup is empty.");
  // pg_restore --list stops reading after the archive TOC. Drain the full input
  // first so larger archives cannot close Docker's stdin mid-pipeline on Windows.
  const check = spawn("docker", ["exec", "-i", testContainer, "sh", "-c", 'archive=$(mktemp); cat > "$archive" && pg_restore --list "$archive"; result=$?; rm -f -- "$archive"; exit "$result"'], { stdio: ["pipe", "ignore", "ignore"] });
  await Promise.all([completion(check), pipeline(createReadStream(file), check.stdin)]);
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  const manifest = { projectId: testProject, container: testContainer, createdAt, sha256: hash.digest("hex"), format: "pg_dump-custom", archiveListVerified: true };
  writeFileSync(`${file}.json`, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  return { file, bytes: statSync(file).size, ...manifest };
}

if (process.argv[1]?.endsWith("backup-local-database.mjs")) {
  const backup = await backupLocalDatabase();
  console.log(JSON.stringify({ backup: backup.file, bytes: backup.bytes, sha256: backup.sha256, archiveListVerified: true }));
}
