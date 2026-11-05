import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { getTestEnvironment, sql, sqlLiteral, testContainer } from "../../scripts/test-environment.mjs";

// A real database lock is the synchronization boundary. No timeout/sleep is
// treated as evidence that the authenticated transaction reached that point.
export async function whileAdvisoryWaits(lockName, send, whileWaiting) {
  getTestEnvironment();
  const holder = spawn("docker", ["exec", "-i", testContainer, "psql", "-U", "postgres", "-d", "postgres", "-X", "-qAt", "-v", "ON_ERROR_STOP=1"], { stdio: ["pipe", "pipe", "pipe"] });
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
