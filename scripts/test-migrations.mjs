import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, unlinkSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { assertLocalReplay, getTestEnvironment, sql, testRoot } from "./test-environment.mjs";
import { seedFixtures, fixtureFile, fixturePassword, patientA, patientB, legacyRequisition } from "./seed-test-fixtures.mjs";

assertLocalReplay();
function reset(version) {
  assertLocalReplay();
  console.log(`Starting explicit local migration replay: ${version ?? "complete migration chain"}.`);
  const args = ["db", "reset", "--local", "--workdir", testRoot];
  if (version) args.push("--version", version);
  const result = spawnSync("supabase", args, { encoding: "utf8", timeout: 600_000 });
  if (result.status !== 0) throw new Error(result.error?.message ?? result.stderr);
  if (existsSync(fixtureFile)) unlinkSync(fixtureFile);
}
reset();
assert.equal(sql("select count(*) from information_schema.columns where table_schema='public' and column_name='requested_quantity';"), "0");
const fixtures = await seedFixtures();
const backend = getTestEnvironment();
const client = createClient(backend.url, backend.anonKey, { auth: { persistSession: false } });
assert.ifError((await client.auth.signInWithPassword({ email: fixtures.global.email, password: fixturePassword })).error);
assert.ifError((await client.rpc("admin_adopt_product", { p_care_recipient_id: patientA, p_product_id: "fralda" })).error);
const first = await client.rpc("submit_requisition", {
  p_care_recipient_id: patientA, p_idempotency_key: "60000000-0000-4000-8000-000000000001", p_payload_hash: "not-authority",
  p_lines: [{ productId: "fralda", currentStock: 0, urgent: false }], p_extra_items: [], p_observations: [],
});
assert.ifError(first.error);
assert.equal((await client.rpc("operational_document",{p_id:first.data[0].requisition_id})).data.code,"REQ-0001");
console.log("PASS clean installation: complete migrations, real Auth and independent first code REQ-0001.");

reset("20261020001900");
const legacyFixtures=await seedFixtures({ legacy: true });
try { execFileSync("supabase", ["migration", "up", "--local", "--workdir", testRoot], { stdio: ["ignore", "pipe", "pipe"] }); }
catch (error) { throw new Error(`Upgrade failed: ${error.stderr?.toString() ?? "see Supabase migration logs"}`, { cause: error }); }
assert.equal(sql(`select protocol from public.requisitions where id='${legacyRequisition}';`), "HC-20260101-A1B2C3D4");
assert.equal(Number(sql(`select current_stock from public.requisition_items where requisition_id='${legacyRequisition}';`)), 2);
assert.equal(Number(sql(`begin; set local request.jwt.claim.sub=\'${legacyFixtures.global.id}\'; select balance from public.current_stock_balances where care_recipient_id='${patientA}' and product_id='fralda' and location='FAMILY'; rollback;`)), 10);
assert.equal(Number(sql(`begin; set local request.jwt.claim.sub='${legacyFixtures.global.id}'; select balance from public.current_stock_balances where care_recipient_id='${patientB}' and product_id='fralda' and location='CARE_TEAM'; rollback;`)), 7);
assert.equal(sql("select count(*) from public.stock_movements where care_recipient_id is null and product_id='gaze' and quantity=3;"), "1");
assert.equal(sql("select count(*) from public.requisition_items i left join public.care_recipient_products p on p.care_recipient_id=i.care_recipient_id and p.product_id=i.product_id where i.product_id is not null and p.product_id is null;"), "0");
console.log("PASS legacy upgrade: protocols, quantities, both patient balances, FKs and unassigned stock preserved.");

for (const file of ["transactions.sql", "invitations-import-outbox.sql", "alerts-routing.sql", "notification-read-model.sql", "protocol-and-stock-boundaries.sql", "service-role.sql", "supply-workflows.sql", "document-invariants.sql"]) {
  const content=readFileSync(`tests/database/${file}`, "utf8");
  const output = sql(file==="supply-workflows.sql"?"begin;"+content+"rollback;":content);
  assert.match(output, /passed/);
  console.log(`PASS PostgreSQL regression: ${file}`);
}

const compatibility = readFileSync("supabase/migrations/20261020002050_extension_migration_compatibility.sql", "utf8");
const cleanup = readFileSync("supabase/migrations/20261020003200_remove_migration_compatibility_bridge.sql", "utf8");
const compatibilityResult = sql(`begin;\n${compatibility}\n${readFileSync("tests/database/migration-search-path.sql", "utf8")}\n${cleanup}\n
do $$begin
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='digest' and obj_description(p.oid,'pg_proc')='HCA temporary migration digest bridge; removed by 032') then
    raise exception 'temporary migration bridge was not removed';
  end if;
end;$$;
rollback;`);
assert.match(compatibilityResult, /hosted migration search_path regression passed/);
console.log("PASS hosted migration compatibility: restricted public search_path, canonical SHA-256, client privileges and bridge cleanup.");
