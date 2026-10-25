import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { env, rpc } from "./v4-fixtures.mjs";
import { balanceSetup } from "./shift-fixtures.mjs";
import { getTestEnvironment, sql, sqlLiteral, testContainer } from "../../scripts/test-environment.mjs";

async function overlapAtStockLock(patient, send) {
  getTestEnvironment();
  const holder = spawn("docker", ["exec", "-i", testContainer, "psql", "-U", "postgres", "-d", "postgres", "-X", "-qAt", "-v", "ON_ERROR_STOP=1"], { stdio: ["pipe", "pipe", "pipe"] });
  const closed = new Promise(resolve => holder.once("close", resolve));
  const ready = new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => reject(new Error("Local stock-lock barrier did not start")), 10_000);
    holder.once("error", error => { clearTimeout(timeout); reject(error); });
    holder.stdout.on("data", chunk => {
      output += chunk.toString();
      if (output.includes("stock-ready")) { clearTimeout(timeout); resolve(); }
    });
  });
  holder.stdin.write(`begin; select pg_advisory_xact_lock(hashtextextended('stock:'||${sqlLiteral(patient)},0)); select 'stock-ready';\n`);
  let pending;
  try {
    await ready;
    pending = Promise.allSettled([send(), send()]);
    const started = Date.now();
    while (true) {
      // Both authenticated HTTP transactions must be queued on this patient's
      // lock before either can commit. This reproduces the lost-response race.
      const waiting = Number(sql(`select count(*) from pg_locks where locktype='advisory' and not granted and objsubid=1
        and classid=((hashtextextended('stock:'||${sqlLiteral(patient)},0)>>32)&4294967295)::oid
        and objid=(hashtextextended('stock:'||${sqlLiteral(patient)},0)&4294967295)::oid;`));
      if (waiting >= 2) break;
      assert.ok(Date.now() - started < 20_000, "Two independent BAL requests must reach the stock-lock barrier");
      await delay(25);
    }
  } finally {
    holder.stdin.end("rollback;\n\\q\n");
    assert.equal(await closed, 0, "Local barrier must release its transaction");
  }
  return (await pending).map(result => {
    assert.equal(result.status, "fulfilled");
    return result.value;
  });
}

for (const action of ["create", "revise", "submit"]) {
  test(`overlapping BAL ${action} requests recover the same successful idempotent result`, { timeout: 60_000 }, async () => {
    const { patient, pro, products } = await balanceSetup();
    const workspace = await rpc(pro.client, "balance_workspace", { p_patient: patient });
    const assignment = workspace.eligibility.assignment;
    const payload = {
      lines: products.map((productId, index) => ({ productId, quantity: index ? "0" : "1" })),
      balanceAssignment: { id: assignment.id, version: assignment.version, referenceRevision: workspace.referenceRevision },
    };
    const key = randomUUID();
    const draft = action === "create" ? null : await rpc(pro.client, "create_supply_document", { p_patient: patient, p_type: "BAL", p_payload: payload, p_key: randomUUID(), p_draft: true });
    const name = action === "create" ? "create_supply_document" : action === "revise" ? "revise_supply_document" : "supply_document_command";
    const args = action === "create"
      ? { p_patient: patient, p_type: "BAL", p_payload: payload, p_key: key, p_draft: false }
      : action === "revise"
        ? { p_id: draft.id, p_payload: { ...payload, notes: "Conferência simultânea fictícia" }, p_key: key, p_version: draft.version }
        : { p_id: draft.id, p_action: "submit", p_body: {}, p_key: key, p_version: draft.version };
    const session = (await pro.client.auth.getSession()).data.session;
    const send = async () => {
      const response = await fetch(`${env.url}/rest/v1/rpc/${name}`, {
        method: "POST",
        headers: { apikey: env.anonKey, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" },
        body: JSON.stringify(args), signal: AbortSignal.timeout(30_000),
      });
      return { status: response.status, body: await response.json() };
    };
    const responses = await overlapAtStockLock(patient, send);
    for (const response of responses) assert.equal(response.status, 200, JSON.stringify(response.body));
    const [first, second] = responses.map(response => response.body);
    assert.ok(first.id);
    assert.equal(second.id, first.id);
    assert.equal(second.version, first.version);
    assert.equal(second.status, first.status);
    assert.deepEqual(second.payload, first.payload);
    assert.equal((await send()).body.id, first.id, "Recovery remains valid after the assignment closes");
    assert.equal(Number(sql(`select count(*) from public.operational_documents where care_recipient_id=${sqlLiteral(patient)} and type='BAL';`)), 1);
    if (action !== "create") assert.equal(Number(sql(`select count(*) from public.document_events where document_id=${sqlLiteral(first.id)} and actor_id=${sqlLiteral(pro.id)} and idempotency_key=${sqlLiteral(key)};`)), 1);
    const after = await rpc(pro.client, "balance_workspace", { p_patient: patient });
    const counted = action !== "revise";
    const current = after.assignments.find(row => row.id === assignment.id);
    assert.equal(current.status, counted ? "counted" : "active");
    assert.equal(current.version, assignment.version + (counted ? 1 : 0));
  });
}
