import { readFileSync, readdirSync } from "node:fs";
import { sql, getTestEnvironment, assertLocalReplay } from "./test-environment.mjs";
import { seedFixtures } from "./seed-test-fixtures.mjs";

// This legacy tool provisions fixtures before its rollback transaction.
// Require explicit consent and the verified backup before that mutation.
assertLocalReplay();
getTestEnvironment();
await seedFixtures();
const applied = new Set(
  sql("select version from supabase_migrations.schema_migrations;").split("\n"),
);
const migrations = readdirSync("supabase/migrations")
  .filter(
    (name) =>
      name.startsWith("20261022") &&
      name.endsWith(".sql") &&
      !applied.has(name.split("_")[0]),
  )
  .sort()
  .map((name) => readFileSync(`supabase/migrations/${name}`, "utf8"))
  .join("\n");
console.log(
  sql(
    `begin;\n${migrations}\n${readFileSync("tests/database/assertions.sql", "utf8")}\n${readFileSync("tests/database/assume-context.sql", "utf8")}\n${readFileSync("tests/database/supply-workflows.sql", "utf8")}\nrollback;`,
  ),
);
