import { spawnSync } from "node:child_process";
import { unlinkSync, existsSync } from "node:fs";
import { assertLocalReplay, testRoot, testProject } from "./test-environment.mjs";
import { seedFixtures, fixtureFile } from "./seed-test-fixtures.mjs";

// Reset is an explicit maintenance operation, backed up and restricted to the local development DB.
assertLocalReplay();
const result = spawnSync("supabase", ["db", "reset", "--local", "--workdir", testRoot], { encoding: "utf8" });
if (result.status !== 0) { process.stderr.write(result.stderr); process.exit(result.status ?? 1); }
if (existsSync(fixtureFile)) unlinkSync(fixtureFile);
await seedFixtures();
console.log(`Clean migration chain and fictional Auth fixtures ready in ${testProject}.`);
