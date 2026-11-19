import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { actor, rpc, setup } from "./v4-fixtures.mjs";
import { purchaseBalanceCommand } from "./purchase-entry-balance-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

const item = () => ({
  id: randomUUID(), name: "Extra de compra com cadastro pendente",
  category: "higiene", unit: "unidade", quantity: "2", details: "Acabamento fictício reforçado.",
});
const stock = patient => sql(`select jsonb_agg(to_jsonb(m) order by m.id) from public.stock_movements m where care_recipient_id=${q(patient)}`);

test("a pending extra can be the only item in a COM and confirmation protects the saved intent", async () => {
  const f = await setup();
  const family = await actor("family", f.patient);
  const extra = item();
  const before = stock(f.patient);
  const content = {
    form: { quantities: {}, pendingExtras: [extra], origin: "purchase", source: "FAMILY", recipientId: "", notes: "" },
    links: {}, materials: [],
    context: { documentId: null, documentVersion: null, requisitionId: null, recipientName: "" },
  };
  const saved = await rpc(family, "supply_draft_command", {
    p_patient: f.patient, p_kind: "COM", p_purpose: "create", p_id: null, p_expected: null, p_target: null,
    p_body: { action: "save", content }, p_key: randomUUID(),
  });
  const confirmation = {
    p_id: saved.id, p_expected: saved.revision, p_target: null, p_key: randomUUID(),
    p_body: { action: "create", payload: { origin: "purchase", lines: [], pendingExtras: [extra] } },
  };
  const changed = { ...confirmation, p_body: {
    ...confirmation.p_body, payload: { ...confirmation.p_body.payload, pendingExtras: [{ ...extra, quantity: "3" }] },
  } };
  assert.equal((await family.rpc("commit_supply_draft", changed)).error?.code, "22023");
  const result = await rpc(family, "commit_supply_draft", confirmation);
  const document = result.result;
  assert.ok(document.protocol);
  assert.equal(document.status, "pending_approval");
  assert.deepEqual(document.payload.pendingExtras, [extra]);
  assert.deepEqual(document.lines, []);
  assert.equal(document.purchaseProgress.identificationPending, true);
  assert.equal(document.purchaseProgress.expectationPending, true);
  assert.equal((await rpc(family, "commit_supply_draft", confirmation)).result.id, document.id);
  assert.equal(stock(f.patient), before);

  const selection = {
    p_id: document.id, p_action: "resolve_purchase_extra", p_body: { extraId: extra.id, productId: f.products[0] },
    p_key: randomUUID(), p_version: document.version,
  };
  assert.equal((await family.rpc("supply_document_command", selection)).error?.code, "42501");
  assert.equal((await f.admin.rpc("supply_document_command", { ...selection, p_version: document.version + 1 })).error?.code, "PT409");
  const final = await rpc(f.admin, "supply_document_command", selection);
  assert.equal(final.purchaseProgress.identificationPending, false);
  assert.equal(final.status, "pending_approval");
  assert.deepEqual(final.payload.pendingExtras, [extra]);
  assert.equal(final.lines.length, 1);
  assert.equal(final.lines[0].product_id, f.products[0]);
  assert.equal(Number(final.lines[0].quantity), 2);
  assert.equal(Number(final.lines[0].approved_quantity), 0);
  assert.equal(final.events.at(-1).action, "com.extra_identified");
  assert.equal((await rpc(f.admin, "supply_document_command", selection)).lines.length, 1);
  assert.equal(stock(f.patient), before);
});

test("an administrator's COM preserves approval separately from identification and keeps stock unchanged", async () => {
  const f = await setup();
  const extra = item();
  const before = stock(f.patient);
  const payload = { origin: "purchase", lines: [{ productId: f.products[0], quantity: "1" }], pendingExtras: [extra] };
  const args = { p_patient: f.patient, p_type: "COM", p_payload: payload, p_key: randomUUID(), p_draft: false };
  assert.equal((await f.admin.rpc("create_supply_document", { ...args, p_type: "BAL" })).error?.code, "22023");
  const invalid = { ...args, p_payload: { ...payload, pendingExtras: [{ ...extra, unit: "sem cadastro" }] } };
  assert.equal((await f.admin.rpc("create_supply_document", invalid)).error?.code, "22023");
  const document = await rpc(f.admin, "create_supply_document", args);
  assert.equal(document.status, "approved");
  assert.equal(Number(document.lines[0].approved_quantity), 1);
  const blocked = await f.admin.rpc("supply_document_command", {
    p_id: document.id, p_action: "purchase", p_body: { lines: [{ lineId: document.lines[0].id, quantity: "1" }] },
    p_key: randomUUID(), p_version: document.version,
  });
  assert.equal(blocked.error?.code, "PT409");
  const resolved = await purchaseBalanceCommand(f.admin, document, "resolve_purchase_extra", { extraId: extra.id, productId: f.products[1] });
  assert.equal(resolved.status, "approved");
  assert.equal(Number(resolved.lines.find(line => line.product_id === f.products[1]).approved_quantity), 2);
  assert.equal(stock(f.patient), before);
  assert.equal((await rpc(f.admin, "create_supply_document", args)).id, document.id);
});
