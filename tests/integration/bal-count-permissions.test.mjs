import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { countPermissionFixture, countPermissionWorkspace, publishReplacementShift, countPermissionCommand } from "./bal-count-permission-fixture.mjs";
import { actor, rpc } from "./v4-fixtures.mjs";

const reason = "Posso cobrir a contagem durante este plantão.";
const read = (fixture, client = fixture.admin) => countPermissionWorkspace(client, fixture.patient);
const request = async (fixture, key) => {
  const context = (await read(fixture, fixture.substitute.client)).countPermissions.request;
  return countPermissionCommand(fixture.substitute.client, fixture.patient, context.assignmentId, "request_count_permission",
    context.version, context.referenceHash, { reason }, key);
};
const decide = (fixture, client, permission, body, key) => countPermissionCommand(client, fixture.patient, permission.id,
  "decide_count_permission", 0, permission.decision.referenceHash, body, key);

test("only the patient administrator may authorize a real replacement shift, preserving the BAL deadline and the stock ledger", async () => {
  const f = await countPermissionFixture(), family = await actor("family", f.patient);
  const original = await read(f), source = original.eligibility.assignment;
  const key = randomUUID(), sent = await request(f, key);
  assert.ifError(sent.error);
  assert.equal(sent.data.result.status, "pending");
  const [pending] = (await read(f)).countPermissions.history;
  const readByOther = await read(f, f.pro.client);
  assert.deepEqual(readByOther.countPermissions.history, []);
  assert.equal(readByOther.eligibility.available, true);
  assert.equal((await read(f, f.substitute.client)).eligibility.available, false);
  assert.deepEqual(pending.decision.targets, []);
  assert.equal((await request(f)).error?.code, "PT409");
  assert.equal((await decide(f, family, pending, { approve:false, note:"" })).error?.code, "42501");
  assert.equal((await decide(f, f.admin, pending, { approve:true, note:"", shiftId: source.shift_id, shiftVersion: 1 })).error?.code, "PT409");

  await publishReplacementShift(f);
  const [prepared] = (await read(f)).countPermissions.history;
  const [shift] = prepared.decision.targets;
  assert.equal(shift.endsAt, source.ends_at);
  const body = { approve:true, note:"Autorizada para esta contagem.", shiftId:shift.id, shiftVersion:shift.version };
  assert.equal((await decide(f, f.admin, pending, body)).error?.code, "PT409");
  const confirmKey = randomUUID(), approved = await decide(f, f.admin, prepared, body, confirmKey);
  assert.ifError(approved.error);
  assert.equal(approved.data.result.status, "approved");
  assert.deepEqual((await decide(f, f.admin, prepared, body, confirmKey)).data, approved.data);
  assert.deepEqual(await rpc(f.admin,"settle_balance_decision",{p_patient:f.patient,p_target:prepared.id,p_key:confirmKey}),approved.data);
  const updated = await read(f, f.substitute.client);
  assert.equal(updated.eligibility.available, true);
  assert.equal(updated.eligibility.assignment.professional_id, f.substitute.id);
  assert.equal(updated.eligibility.assignment.ends_at, source.ends_at);
  assert.deepEqual(updated.obligations, original.obligations);
  assert.equal(updated.referenceRevision, original.referenceRevision);
  assert.equal((await read(f, f.pro.client)).eligibility.available, false);
  assert.equal(sql(`select count(*) from private.balance_count_permissions where assignment_id=${q(source.id)}`), "1");
});

test("a live BAL admission prevents replacement but the administrator can reject the pending request", async () => {
  const f = await countPermissionFixture();
  await publishReplacementShift(f);
  assert.ifError((await request(f)).error);
  const before = await read(f), [permission] = before.countPermissions.history;
  const source = before.eligibility.assignment, [target] = permission.decision.targets;
  const admission = await rpc(f.pro.client,"admit_balance_count",{
    p_patient:f.patient,p_assignment:source.id,p_version:source.version,p_document:null,p_document_version:null,
  });
  assert.ok(admission.id);
  const approval = await decide(f,f.admin,permission,{approve:true,note:"",shiftId:target.id,shiftVersion:target.version});
  assert.equal(approval.error?.code,"PT409");
  const [current] = (await read(f)).countPermissions.history;
  assert.deepEqual(current.decision.targets,[]);
  const rejected = await decide(f,f.admin,current,{approve:false,note:"A contagem já está em andamento."});
  assert.ifError(rejected.error);
  assert.equal(rejected.data.result.status,"rejected");
  const after = await read(f,f.pro.client);
  assert.deepEqual(after.eligibility.assignment,source);
  assert.equal(after.eligibility.admission.id,admission.id);
  assert.equal(after.referenceRevision,before.referenceRevision);
});

test("competing admission and authorization cannot assign two people to the same BAL", async () => {
  const f = await countPermissionFixture();
  await publishReplacementShift(f);
  assert.ifError((await request(f)).error);
  const before = await read(f), source = before.eligibility.assignment;
  const [permission] = before.countPermissions.history, [target] = permission.decision.targets;
  const [approval, admission] = await Promise.all([
    decide(f,f.admin,permission,{approve:true,note:"",shiftId:target.id,shiftVersion:target.version}),
    f.pro.client.rpc("admit_balance_count", {
      p_patient:f.patient,p_assignment:source.id,p_version:source.version,p_document:null,p_document_version:null,
    }),
  ]);
  assert.notEqual(Boolean(approval.data),Boolean(admission.data));
  const after = await read(f);
  assert.equal(after.eligibility.assignment.professional_id,approval.data ? f.substitute.id : f.pro.id);
  assert.equal(after.referenceRevision,before.referenceRevision);
  assert.equal(sql(`select count(*) from public.bal_assignments where care_recipient_id=${q(f.patient)} and status='active'`),"1");
});
