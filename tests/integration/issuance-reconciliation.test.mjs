import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import {
  confirmPacket, draftDevice, officialState, privateDraftFixture, rpc, savePacket,
} from "./private-draft-fixtures.mjs";
import { fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

const args = (f, command) => ({
  p_patient: f.patient,
  p_draft: command.p_id,
  p_revision: command.p_expected,
  p_key: command.p_key,
});

test("a settled absence preserves the draft and denies a late writer with the same key", async () => {
  const f = await privateDraftFixture();
  const draft = await rpc(f.pro, "creation_draft_command", savePacket(f));
  const command = confirmPacket(f, draft);
  const settle = args(f, command);
  const before = officialState(f);
  const other = await draftDevice(f.patient, "family");
  const denial = await other.rpc("reconcile_document_issuance", settle);
  assert.equal(denial.error?.code, "42501");
  assert.deepEqual(await rpc(f.pro, "reconcile_document_issuance", settle), {
    state: "not_applied", draftSaved: true,
  });
  const late = await f.pro.rpc("commit_creation_draft", command);
  assert.equal(late.error?.code, "23505");
  assert.equal(officialState(f), before);
  const issued = await rpc(f.pro, "commit_creation_draft", { ...command, p_key: randomUUID() });
  assert.ok(issued.consumedDocumentId);
  assert.deepEqual(await rpc(f.pro, "reconcile_document_issuance", settle), {
    state: "not_applied", draftSaved: false,
  });
});

test("the issuing author can recover the applied document after losing write access", async () => {
  const f = await privateDraftFixture();
  const draft = await rpc(f.pro, "creation_draft_command", savePacket(f));
  const command = confirmPacket(f, draft);
  const issued = await rpc(f.pro, "commit_creation_draft", command);
  const before = officialState(f);
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled)
    values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},'req.create',false);`);
  assert.deepEqual(await rpc(f.pro, "reconcile_document_issuance", args(f, command)), {
    state: "applied", documentId: issued.consumedDocumentId,
  });
  assert.equal(officialState(f), before);
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled)
    values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},'req.read',false);`);
  const denial = await f.pro.rpc("reconcile_document_issuance", args(f, command));
  assert.equal(denial.error?.code, "42501");
});

test("concurrent settlement and issuance return one authoritative outcome", async () => {
  const f = await privateDraftFixture();
  const draft = await rpc(f.pro, "creation_draft_command", savePacket(f));
  const command = confirmPacket(f, draft);
  const before = officialState(f);
  const [issue, settlement] = await Promise.all([
    f.pro.rpc("commit_creation_draft", command),
    rpc(f.pro, "reconcile_document_issuance", args(f, command)),
  ]);
  if (settlement.state === "applied") {
    assert.ifError(issue.error);
    assert.equal(settlement.documentId, issue.data.consumedDocumentId);
  } else {
    assert.deepEqual(settlement, { state: "not_applied", draftSaved: true });
    assert.equal(issue.error?.code, "23505");
    assert.equal(officialState(f), before);
  }
  assert.deepEqual(await rpc(f.pro, "reconcile_document_issuance", args(f, command)), settlement);
});
