import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { actor, fixtures, rpc, setup } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

test("global identity cannot move stock without its active local membership; an explicit local restoration is required", async () => {
  const f = await setup();
  // setup deliberately seeds this local membership; remove its authority through
  // the real local administration RPC instead of assuming the fixture lacks it.
  const membership = { p_care_recipient_id: f.patient, p_user_id: fixtures.global.id };
  await rpc(f.admin, "admin_set_membership_status", { ...membership, p_status: "revoked" });
  const global = await actor("global");
  const ledger = () => sql(`select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`);
  const before = ledger(), key = randomUUID();
  const input = { p_patient: f.patient, p_product: f.products[0], p_quantity: "1", p_action: "inbound", p_reason: "Atuação local exige vínculo próprio ativo", p_key: key };
  assert.equal((await global.rpc("family_stock_movement", input)).error?.code, "42501");
  assert.equal((await global.rpc("select_active_context", { p_patient: f.patient })).error?.code, "42501");
  assert.equal(ledger(), before);
  assert.equal(sql(`select count(*) from public.stock_movements where idempotency_key=${sqlLiteral(key)};`), "0");
  await rpc(f.admin, "admin_set_membership_status", { ...membership, p_status: "active" });
  await actor("global", f.patient);
  await rpc(global, "family_stock_movement", { ...input, p_key: randomUUID() });
  assert.notEqual(ledger(), before);
  assert.equal((await rpc(global, "patient_capabilities", { p_patient: f.patient }))["stock.family.manage"], true);
});

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
