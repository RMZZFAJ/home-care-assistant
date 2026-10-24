import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { actor, fixtures, rpc, setup } from "./v4-fixtures.mjs";

test("delegated catalogue and audit authority stays separate from local administration", async () => {
  const { patient, admin } = await setup();
  const other = await setup();
  const professional = await actor("professional", patient);
  const adopt = { p_care_recipient_id: patient, p_product_id: "fralda" };
  assert.ok((await professional.rpc("admin_adopt_product", adopt)).error);
  async function configure(capability, enabled) {
    // actor() shares real Auth sessions: keep each actor in the intended context.
    await actor("adminA", patient);
    const version = (await rpc(admin, "patient_governance", { p_patient: patient })).data.version;
    await rpc(admin, "configure_patient_access", {
      p_patient: patient, p_kind: "capability",
      p_change: { capability, subjectUser: fixtures.professional.id, enabled },
      p_key: randomUUID(), p_version: version,
    });
  }
  await configure("catalog.manage", true);
  await configure("audit.read", true);
  await actor("professional", patient);
  assert.equal((await rpc(professional, "patient_capabilities", { p_patient: patient }))["access.manage"], false);
  const adopted = await rpc(professional, "admin_adopt_product", adopt);
  assert.equal(adopted.product_id, "fralda");
  assert.equal(adopted.care_recipient_id, patient);
  const audit = await professional.from("audit_events").select("metadata").eq("metadata->>care_recipient_id", patient);
  assert.ifError(audit.error);
  assert.ok(audit.data.length > 0);
  const isolated = await professional.from("audit_events").select("id").eq("metadata->>care_recipient_id", other.patient);
  assert.ifError(isolated.error);
  assert.equal(isolated.data.length, 0);
  assert.ok((await professional.rpc("admin_upsert_membership", { p_care_recipient_id: patient, p_user_id: fixtures.reader.id, p_role: "admin", p_can_manage_stock: true, p_can_count_stock: true })).error);
  await configure("catalog.manage", false);
  await configure("audit.read", false);
  await actor("professional", patient);
  assert.ok((await professional.rpc("admin_adopt_product", { ...adopt, p_product_id: "luvas" })).error);
  const revoked = await professional.from("audit_events").select("id").eq("metadata->>care_recipient_id", patient);
  assert.ifError(revoked.error);
  assert.equal(revoked.data.length, 0);
});
