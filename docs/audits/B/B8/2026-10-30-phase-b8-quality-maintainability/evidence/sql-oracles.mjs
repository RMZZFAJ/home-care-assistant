import fs from "node:fs";
import { getTestEnvironment, sql } from "../../../../scripts/test-environment.mjs";

// Pure SQL truth-table: no fixture or application row is read or modified.
const backend = getTestEnvironment();
if (backend.url !== "http://127.0.0.1:54321") throw new Error("Unexpected local origin");
const query = `begin read only;
with cases(id,status,checked,balance) as (values
 ('SQL-01','disputed',0,3::numeric),
 ('SQL-02','disputed',0,2::numeric),
 ('SQL-03','disputed',0,null::numeric),
 ('SQL-04','incorrect',0,null::numeric)
), evaluated as (
 select *, status<>'disputed' or checked<>0 or balance<>3 as current_if_condition,
 status is distinct from 'disputed' or checked is distinct from 0
 or balance is distinct from 3 as strict_if_condition from cases
)
select json_agg(json_build_object('id',id,'status',status,'checked',checked,
 'balance',balance,'current_condition',current_if_condition,
 'current_guard_rejects',case when current_if_condition then true else false end,
 'strict_guard_rejects',strict_if_condition))::text from evaluated;
rollback;`;
const observations = JSON.parse(sql(query));
if (observations[2].current_guard_rejects || !observations[2].strict_guard_rejects) throw new Error("Unexpected SQL truth table");
fs.writeFileSync(new URL("sql-oracle-observations.json", import.meta.url), JSON.stringify({
  commandScope: "BEGIN READ ONLY; constant VALUES and SELECT; ROLLBACK",
  origin: backend.url, observations,
  currentGuardSource: "tests/database/supply-workflows.sql:50 (partial receipt guard)",
  limitation: "The isolated predicate admits a missing positive balance; this does not establish that the entire SQL suite would pass every missing-ledger mutation.",
}, null, 2) + "\n");
console.log("Read-only SQL oracle: four cases evaluated, NULL bypass confirmed.");
