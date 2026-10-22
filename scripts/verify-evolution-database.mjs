import { readFileSync, readdirSync } from "node:fs";
import { sql, getTestEnvironment } from "./test-environment.mjs";
import { seedFixtures } from "./seed-test-fixtures.mjs";

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
    `begin;\n${migrations}\n${readFileSync("tests/database/supply-workflows.sql", "utf8")}\nrollback;`,
  ),
);
