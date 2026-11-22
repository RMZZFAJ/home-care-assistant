import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setup, issue, actor, rpc } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

test("the recount recovery read ignores an unsupported source type without turning unrelated REQ into a BAL or blocking the workspace", async () => {
  const f = await setup(),
    request = await issue(f.patient, f.products),
    admin = await actor("adminA", f.patient);
  const source = await rpc(admin, "operational_document", { p_id: request.id });
  assert.equal(source.type, "REQ");
  assert.equal(source.status, "submitted");
  const cycle = randomUUID(),
    before = sql(
      `select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(request.id)};`,
    );
  // Deliberately unsupported local fixture. The historical FK checks existence,
  // not the document type. It must not make a read call a BAL-only projection
  // for REQ, regardless of join ordering or the presence of other patients.
  sql(
    `insert into public.bal_cycles(id,care_recipient_id,state,document_id,counted_at) values(${sqlLiteral(cycle)},${sqlLiteral(f.patient)},'counted',${sqlLiteral(request.id)},clock_timestamp());`,
  );
  try {
    const result = await admin.rpc("balance_workspace", {
      p_patient: f.patient,
    });
    assert.ifError(result.error);
    assert.deepEqual(result.data.recountRecovery, { total: 0, items: [] });
    assert.equal(
      (await admin.rpc("balance_recount_context", { p_id: request.id })).error
        ?.code,
      "22023",
      "The BAL-specific endpoint still rejects a direct request for a REQ",
    );
    assert.equal(
      sql(
        `select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(request.id)};`,
      ),
      before,
    );
  } finally {
    sql(
      `delete from public.bal_cycles where id=${sqlLiteral(cycle)} and care_recipient_id=${sqlLiteral(f.patient)} and document_id=${sqlLiteral(request.id)};`,
    );
  }
});
