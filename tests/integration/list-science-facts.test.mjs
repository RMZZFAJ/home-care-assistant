import assert from "node:assert/strict";
import test from "node:test";
import { setup, issue, actor, rpc, fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
test("L1 lists expose real science separately without inventing fulfillment or bypassing revocation", async () => {
  const f = await setup(), req = await issue(f.patient, f.products), family = await actor("family", f.patient);
  const read = () => rpc(family, "operational_document_list", { p_patient: f.patient, p_type: "REQ" });
  const before = (await read()).data.find(row => row.id === req.id);
  assert.deepEqual(before.requisitionState, { serviceStatus: "awaiting_fulfillment", scienceState: "pending" });
  const progress = await rpc(family, "requisition_progress", { p_id: req.id });
  await rpc(family, "acknowledge_requisition", { p_id: req.id, p_mode: "express", p_version: progress.version, p_material_identity: progress.materialIdentity });
  const after = (await read()).data.find(row => row.id === req.id);
  assert.deepEqual(after.requisitionState, { serviceStatus: "awaiting_fulfillment", scienceState: "recorded" });
  assert.deepEqual(after.fulfillment, before.fulfillment);
  sql(`update public.care_recipient_memberships set status='revoked' where care_recipient_id=${q(f.patient)} and user_id=${q(fixtures.family.id)};`);
  assert.equal((await family.rpc("operational_document_list", { p_patient: f.patient })).error?.code, "42501");
});
