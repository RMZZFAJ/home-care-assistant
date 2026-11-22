import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { assignRecount, pendingRecount } from "./bal-recount-fixtures.mjs";
import { balanceSetup, shiftWorker } from "./shift-fixtures.mjs";
import { rpc } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

const workspace = (f, client = f.pro.client) => rpc(client, "balance_workspace", { p_patient: f.patient });

async function setupAdmission(t) {
  const f = await balanceSetup({ stableCurrentWindow: true });
  t.after(() => sql(`update public.care_recipients set is_active=false where id=${q(f.patient)}`));
  const state = await workspace(f), assignment = state.eligibility.assignment;
  assert.equal(state.eligibility.available, true);
  const request = {
    p_patient: f.patient, p_assignment: assignment.id, p_version: assignment.version,
    p_document: null, p_document_version: null,
  };
  const record = await rpc(f.pro.client, "admit_balance_count", request);
  const lines = f.products.map(productId => ({ productId, quantity: "0" }));
  const command = {
    p_patient: f.patient, p_type: "BAL", p_draft: false, p_key: randomUUID(),
    p_payload: { lines, balanceAssignment: {
      id: assignment.id, version: assignment.version, referenceRevision: state.referenceRevision, admissionId: record.id,
    } },
  };
  // This isolated fixture shortens the window after a real admission. The
  // production routines evaluate the database clock normally.
  const closeWindow = () => sql(`update public.bal_assignments set ends_at=clock_timestamp() where id=${q(assignment.id)}`);
  return { ...f, assignment, command, closeWindow, record, request, state };
}

test("a real admission survives expiry and resumes the same BAL exactly once", async t => {
  const f = await setupAdmission(t);
  assert.deepEqual(await rpc(f.pro.client, "admit_balance_count", f.request), f.record);
  const other = await shiftWorker(f.patient);
  assert.equal((await other.client.rpc("admit_balance_count", f.request)).error?.code, "42501");
  f.closeWindow();
  sql(`select private.process_bal_patient(${q(f.patient)})`);
  const after = await workspace(f);
  assert.equal(after.eligibility.available, false);
  assert.equal(after.eligibility.assignment.status, "active");
  assert.deepEqual(after.eligibility.admission, f.record);
  assert.equal((await workspace(f, f.admin)).eligibility.admission, null);

  const wrong = { ...f.command.p_payload, balanceAssignment: { ...f.command.p_payload.balanceAssignment, admissionId: randomUUID() } };
  assert.equal((await f.pro.client.rpc("create_supply_document", { ...f.command, p_payload: wrong })).error?.code, "42501");
  delete wrong.balanceAssignment.admissionId;
  assert.equal((await f.pro.client.rpc("create_supply_document", { ...f.command, p_payload: wrong })).error?.code, "42501");
  const document = await rpc(f.pro.client, "create_supply_document", f.command);
  assert.equal(document.payload.balanceContext.admissionId, f.record.id);
  assert.ok(new Date(document.payload.balanceContext.countedAt) > new Date(document.payload.balanceContext.endsAt));
  assert.equal((await rpc(f.pro.client, "create_supply_document", f.command)).id, document.id);
  assert.equal((await f.pro.client.rpc("create_supply_document", { ...f.command, p_key: randomUUID() })).error?.code, "42501");
  assert.equal((await workspace(f)).assignments.find(row => row.id === f.assignment.id).status, "counted");
});

test("discarding the scheduled draft closes admission and forbids a fresh start after expiry", async t => {
  const f = await setupAdmission(t);
  const draftScope = { p_patient: f.patient, p_kind: "BAL", p_target: null };
  const content = {
    counts: {}, observationTimes: {}, notes: "", materials: [],
    context: { mode: "scheduled", documentId: null, documentVersion: null,
      assignmentId: f.assignment.id, assignmentVersion: f.assignment.version, referenceRevision: f.state.referenceRevision },
  };
  const draft = await rpc(f.pro.client, "creation_draft_command", {
    ...draftScope, p_id: null, p_expected: null, p_key: randomUUID(), p_body: { action: "save", content },
  });
  f.closeWindow();
  await rpc(f.pro.client, "creation_draft_command", {
    ...draftScope, p_id: draft.id, p_expected: draft.revision, p_key: randomUUID(), p_body: { action: "discard" },
  });
  assert.equal((await workspace(f)).eligibility.admission, null);
  assert.equal((await f.pro.client.rpc("admit_balance_count", f.request)).error?.code, "42501");
  assert.equal((await f.pro.client.rpc("create_supply_document", f.command)).error?.code, "42501");
  sql(`select private.process_bal_patient(${q(f.patient)})`);
  assert.equal((await workspace(f)).assignments.find(row => row.id === f.assignment.id).status, "missed");
});

test("a formal recount can finish after expiry on the exact admitted document version", async t => {
  const f = await pendingRecount({ reviewPolicy: "optional", firstReview: false, stableCurrentWindow: true });
  t.after(() => sql(`update public.care_recipients set is_active=false where id=${q(f.patient)}`));
  const source = await rpc(f.family, "balance_recount_context", { p_id: f.document.id });
  const target = source.targets.find(entry => entry.id === f.assignment.shift_id);
  assert.ok(target);
  assert.ifError((await assignRecount(f.family, f, target)).error);
  const before = await workspace(f);
  const assignment = before.eligibility.assignment;
  assert.equal(before.eligibility.available, true);
  const current = await rpc(f.pro.client, "operational_document", { p_id: f.document.id });
  const start = {
    p_patient: f.patient, p_assignment: assignment.id, p_version: assignment.version,
    p_document: current.id, p_document_version: current.version,
  };
  const admission = await rpc(f.pro.client, "admit_balance_count", start);
  sql(`update public.bal_assignments set ends_at=clock_timestamp() where id=${q(assignment.id)};
    select private.process_bal_patient(${q(f.patient)})`);
  const expired = await workspace(f);
  assert.equal(expired.eligibility.available, false);
  assert.deepEqual(expired.eligibility.admission, admission);

  const revise = {
    p_id: current.id, p_version: current.version, p_recount: true, p_key: randomUUID(),
    p_payload: {
      lines: f.payload.lines,
      notes: "Contagem física iniciada antes do fim do plantão.",
      balanceAssignment: {
        id: assignment.id, version: assignment.version,
        referenceRevision: expired.referenceRevision, admissionId: admission.id,
      },
    },
  };
  assert.ok((await f.pro.client.rpc("revise_supply_document", { ...revise, p_version: current.version - 1 })).error);
  const counted = await rpc(f.pro.client, "revise_supply_document", revise);
  assert.equal(counted.id, current.id);
  assert.equal(counted.balanceReview.countVersion, 2);
  assert.equal(counted.payload.balanceContext.admissionId, admission.id);
  assert.ok(new Date(counted.payload.balanceContext.countedAt) > new Date(counted.payload.balanceContext.endsAt));
  assert.equal((await rpc(f.pro.client, "revise_supply_document", revise)).version, counted.version);
});
