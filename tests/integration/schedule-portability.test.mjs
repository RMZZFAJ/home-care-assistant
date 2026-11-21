import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { sql } from "../../scripts/test-environment.mjs";

test("schedule migration patches both LF and Windows CRLF function sources without changing runtime state", () => {
  const base = readFileSync("supabase/migrations/20261105072306_phase_d1_schedule_decision_contract.sql", "utf8").replaceAll("\r\n", "\n");
  const functions = base.slice(base.indexOf("create or replace function public.schedule_command"), base.indexOf("revoke all on function private.schedule_shift_snapshot"));
  const patch = readFileSync("supabase/migrations/20261105074814_phase_d1_schedule_disconnected_workers.sql", "utf8").replaceAll("\r\n", "\n").replace(/^begin;\s*/, "").replace(/commit;\s*$/, "");
  const scenario = (source, followup) => "begin;\n" + source + "\n" + followup + "\nselect 'passed: schedule migration newline compatibility';\nrollback;";
  const mutant = patch.replaceAll(",E'\\r\\n',E'\\n')", "").replaceAll("definition:=replace(pg_get_functiondef(", "definition:=pg_get_functiondef(");
  assert.notEqual(mutant, patch);
  assert.throws(() => sql(scenario(functions.replaceAll("\n", "\r\n"), mutant)), /unexpected cancelled worker guard/);
  for (const source of [functions, functions.replaceAll("\n", "\r\n")]) assert.match(sql(scenario(source, patch)), /passed: schedule migration newline compatibility/);
});
