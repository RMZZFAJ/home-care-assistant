import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const directory = "docs/audits/2026-10-25-production-readiness/evidence";
const files = readFileSync(resolve(directory, "tracked-files.txt"), "utf8").trim().split(/\r?\n/);
const selected = files.filter((path) => /^(docs\/(audits\/2026-10-2[01]|meta|references)|scripts\/historical-migrations)/.test(path) && /\.(json|csv)$/.test(path));
const summaries = selected.map((path) => {
  const bytes = readFileSync(path);
  const base = { path, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
  if (path.endsWith(".csv")) return { ...base, format: "csv", header: bytes.toString("utf8").split(/\r?\n/)[0], physicalLines: bytes.toString("utf8").trim().split(/\r?\n/).length };
  const data = JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/, ""));
  return { ...base, format: "json", rootType: Array.isArray(data) ? "array" : typeof data, entries: Array.isArray(data) ? data.length : Object.keys(data).length, keys: Array.isArray(data) ? [...new Set(data.flatMap((row) => row && typeof row === "object" ? Object.keys(row) : []))] : Object.keys(data), shape: Object.fromEntries(Object.entries(data).slice(0, 35).map(([key, value]) => [key, Array.isArray(value) ? { arrayLength: value.length, firstKeys: value[0] && typeof value[0] === "object" ? Object.keys(value[0]) : [] } : value && typeof value === "object" ? { keys: Object.keys(value).slice(0, 35) } : { type: typeof value }])) };
});
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const packageFile = JSON.parse(readFileSync("package.json", "utf8"));
summaries.push({ path: "package-lock.json", lockfileVersion: lock.lockfileVersion, packages: Object.keys(lock.packages).length, directDependenciesMatch: JSON.stringify(lock.packages[""].dependencies) === JSON.stringify(packageFile.dependencies), directDevDependenciesMatch: JSON.stringify(lock.packages[""].devDependencies) === JSON.stringify(packageFile.devDependencies), invalidIntegrityEntries: Object.entries(lock.packages).filter(([key, value]) => key && value.resolved?.startsWith("https:") && !value.integrity).map(([key]) => key), nonRegistrySources: Object.entries(lock.packages).filter(([, value]) => value.resolved && !value.resolved.startsWith("https://registry.npmjs.org/")).map(([key, value]) => ({ key, resolved: value.resolved })) });
writeFileSync(resolve(directory, "artifact-structure.json"), JSON.stringify(summaries, null, 2) + "\n");
console.log(JSON.stringify({ artifacts: summaries.length, lock: summaries.at(-1) }, null, 2));
