import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { getTestEnvironment, sql, sqlLiteral, testContainer } from "../../scripts/test-environment.mjs";
import { trustedExecutable } from "../../scripts/trusted-executable.mjs";

// A real database lock is the synchronization boundary. No timeout/sleep is
// treated as evidence that the authenticated transaction reached that point.
export async function whileAdvisoryWaits(lockName, send, whileWaiting) {
  getTestEnvironment();
  const holder = spawn(trustedExecutable("docker"), ["exec", "-i", testContainer, "psql", "-U", "postgres", "-d", "postgres", "-X", "-qAt", "-v", "ON_ERROR_STOP=1"], { stdio: ["pipe", "pipe", "pipe"] });
  const closed = new Promise(resolve => holder.once("close", resolve));
  const ready = new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error("Local lock barrier did not start")), 10_000);
    holder.once("error", error => { clearTimeout(timer); reject(error); });
    holder.stdout.on("data", chunk => {
      output += chunk.toString();
      if (output.includes("barrier-ready")) { clearTimeout(timer); resolve(); }
    });
  });
  let pending;
  holder.stdin.write(`begin; select pg_advisory_xact_lock(hashtextextended(${sqlLiteral(lockName)},0)); select 'barrier-ready';\n`);
  try {
    await ready;
    pending = Promise.resolve(send());
    const started = Date.now();
    while (Number(sql(`select count(*) from pg_locks where locktype='advisory' and not granted and objsubid=1 and classid=((hashtextextended(${sqlLiteral(lockName)},0)>>32)&4294967295)::oid and objid=(hashtextextended(${sqlLiteral(lockName)},0)&4294967295)::oid;`)) === 0) {
      assert.ok(Date.now() - started < 15_000, "Authenticated request must actually wait at the specified lock");
      await delay(25);
    }
    await whileWaiting();
  } finally {
    holder.stdin.end("rollback;\n\\q\n");
    assert.equal(await closed, 0, "Local barrier must release its transaction");
  }
  return pending;
}

// These existing rows expose later waits after the patient's advisory lock.
export async function whileRowWaits(target, id, requestName, send, whileWaiting) {
  getTestEnvironment();
  const table = { catalogue: "public.care_recipient_products", products: "public.products", purchase_receipts: "public.purchase_receipts", consumption_reports: "public.consumption_reports", stock_movements:"public.stock_movements", product_presentations: "public.product_presentations",profiles:"public.profiles" }[target];
  assert.ok(table && ["create_supply_document", "revise_supply_document", "supply_document_command", "decide_consumption_report", "supplement_consumption_report", "configure_catalogue_unit", "admin_upsert_recipient_product", "catalogue_presentation_command", "balance_command", "create_transfer_declaration", "transfer_command", "catalogue_identity_command", "family_stock_movement", "submit_remaining_requisition", "creation_draft_command", "commit_creation_draft", "configure_patient_access", "residence_preparation_command"].includes(requestName));
  const holder = spawn(trustedExecutable("docker"), ["exec", "-i", testContainer, "psql", "-U", "postgres", "-d", "postgres", "-X", "-qAt", "-v", "ON_ERROR_STOP=1"], { stdio: ["pipe", "pipe", "pipe"] });
  const closed = new Promise(resolve => holder.once("close", resolve));
  const ready = new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error("Local row barrier did not start")), 10_000);
    holder.once("error", error => { clearTimeout(timer); reject(error); });
    holder.stdout.on("data", chunk => { output += chunk.toString(); const match = output.match(/barrier-ready:(\d+)/); if (match) { clearTimeout(timer); resolve(Number(match[1])); } });
  });
  let pending;
  const predicate = target === "catalogue" ? `care_recipient_id=${sqlLiteral(id.patient)} and product_id=${sqlLiteral(id.product)}` : `id=${sqlLiteral(id)}`;
  holder.stdin.write(`begin; select 1 from ${table} where ${predicate} for update; select 'barrier-ready:'||pg_backend_pid();\n`);
  try {
    const blocker = await ready;
    pending = Promise.resolve(send());
    const started = Date.now();
    while (Number(sql(`select count(*) from pg_stat_activity a where ${blocker}=any(pg_blocking_pids(a.pid)) and a.query ilike ${sqlLiteral("%" + requestName + "%")};`)) === 0) {
      assert.ok(Date.now() - started < 15_000, "Authenticated request must actually wait for the specified row holder");
      await delay(25);
    }
    await whileWaiting();
  } finally {
    holder.stdin.end("rollback;\n\\q\n");
    assert.equal(await closed, 0, "Local row barrier must release its transaction");
  }
  return pending;
}
