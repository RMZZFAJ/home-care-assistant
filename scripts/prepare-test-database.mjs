import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { testRoot, testDataRoot, testProject, assertLocalProject, getTestEnvironment } from "./test-environment.mjs";

assertLocalProject({ running: false });
mkdirSync(testDataRoot, { recursive: true });
if (process.argv.includes("--restart")) {
  assertLocalProject();
  const stopped = spawnSync("supabase", ["stop", "--workdir", testRoot], { encoding: "utf8" });
  if (stopped.status !== 0) { process.stderr.write(stopped.stderr); process.exit(stopped.status ?? 1); }
}
for (const args of [
  // The application uses Auth/PostgREST/PostgreSQL; Studio and metadata remain available for local inspection.
  ["start", "--workdir", testRoot, "--exclude", "edge-runtime,realtime,storage-api,logflare,vector,supavisor"],
  ["migration", "up", "--local", "--include-all", "--workdir", testRoot],
]) {
  // Validate the running container and localhost endpoints before the first database mutation.
  if (args[0] === "migration") getTestEnvironment();
  const result = spawnSync("supabase", args, { encoding: "utf8" });
  // start/status may print local credentials: report success only, never their output.
  if (result.status !== 0) { process.stderr.write(result.stderr); process.exit(result.status ?? 1); }
}
getTestEnvironment();
console.log(`Local development project ${testProject} ready on API 54321 / database 54322; migrations applied without reset.`);
