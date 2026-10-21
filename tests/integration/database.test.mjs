import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { getTestEnvironment, sql, sqlLiteral, fixtureFile } from "../../scripts/test-environment.mjs";
import { fixturePassword, patientA, patientB } from "../../scripts/seed-test-fixtures.mjs";

const env = getTestEnvironment();
const fixtures = JSON.parse(readFileSync(fixtureFile, "utf8"));
const clients = new Map();
const row = (value) => Array.isArray(value) ? value[0] : value;
async function actor(name) {
  if (!clients.has(name)) {
    const client = createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const result = await client.auth.signInWithPassword({ email: fixtures[name].email, password: fixturePassword });
    assert.ifError(result.error);
    clients.set(name, client);
  }
  return clients.get(name);
}
const requestArgs = (idempotencyKey, patient = patientA, stock = 2) => ({
  p_care_recipient_id: patient, p_idempotency_key: idempotencyKey, p_payload_hash: "caller-cannot-choose-database-hash",
  p_lines: [{ productId: "fralda", productName: "untrusted display label", currentStock: stock, urgent: false }],
  p_extra_items: [], p_observations: ["Teste de integração HTTP fictício"],
});

test("Data API grants, local authority and cross-patient isolation use real Auth sessions", async () => {
  const [local, reader, revoked, unlinked] = await Promise.all([actor("adminA"), actor("reader"), actor("revoked"), actor("unlinked")]);
  const anon = createClient(env.url, env.anonKey, { auth: { persistSession: false } });
  assert.ok((await anon.from("current_stock_balances").select("*")).error);
  const balances = await local.from("current_stock_balances").select("*").eq("care_recipient_id", patientB);
  assert.ifError(balances.error); assert.deepEqual(balances.data, []);
  assert.ok((await local.from("audit_events").insert({ actor_id: fixtures.adminA.id, action: "forged", entity_type: "test" })).error);
  assert.ok((await local.rpc("admin_set_profile", { p_user_id: fixtures.adminA.id, p_full_name: "Teste adminA", p_role: "admin", p_status: "active", p_global_scope: true })).error);
  assert.ok((await local.rpc("admin_upsert_membership", { p_care_recipient_id: patientB, p_user_id: fixtures.adminA.id, p_role: "admin", p_can_manage_stock: true, p_can_count_stock: true })).error);
  for (const client of [reader, revoked, unlinked]) assert.ok((await client.rpc("submit_requisition", requestArgs(randomUUID()))).error);
  const noBalances = await revoked.from("current_stock_balances").select("*");
  assert.ifError(noBalances.error); assert.deepEqual(noBalances.data, []);
  const localRole = await local.rpc("recipient_role", { p_recipient_id: patientA });
  assert.ifError(localRole.error); assert.equal(localRole.data, "admin");
});

test("concurrent HTTP submissions persist one canonical request and immutable receipt snapshots", async () => {
  const professional = await actor("professional");
  const key = randomUUID(); let savedId;
  try {
    const results = await Promise.all(Array.from({ length: 8 }, () => professional.rpc("submit_requisition", requestArgs(key))));
    for (const result of results) assert.ifError(result.error);
    const rows = results.map((result) => row(result.data)); savedId = rows[0].requisition_id;
    assert.equal(new Set(rows.map((entry) => entry.requisition_id)).size, 1);
    assert.equal(new Set(rows.map((entry) => entry.protocol)).size, 1);
    const items = await professional.from("requisition_items").select("product_name_snapshot,snapshot_source").eq("requisition_id", savedId);
    assert.ifError(items.error); assert.equal(items.data.length, 1);
    assert.equal(items.data[0].snapshot_source, "persisted"); assert.notEqual(items.data[0].product_name_snapshot, "untrusted display label");
    const forged = requestArgs(key); forged.p_payload_hash = "second-forged-hash"; forged.p_lines[0].productName = "changed forged label";
    const replay = await professional.rpc("submit_requisition", forged);
    assert.ifError(replay.error); assert.equal(row(replay.data).requisition_id, savedId);
    assert.ok((await professional.rpc("submit_requisition", requestArgs(key, patientA, 99))).error);
    const shared = await actor("shared");
    assert.ok((await shared.rpc("submit_requisition", requestArgs(key, patientB))).error);
  } finally {
    if (savedId) sql(`delete from public.requisitions where id=${sqlLiteral(savedId)};`);
  }
});

test("concurrent withdrawals cannot overspend and transfers preserve both custodies", async () => {
  const local = await actor("adminA"); const global = await actor("global");
  let productId;
  try {
    const product = await local.rpc("admin_upsert_recipient_product", { p_care_recipient_id: patientA, p_product_id: null, p_name: `Teste concorrente ${randomUUID()}`, p_category: "higiene", p_unit: "unidade", p_aliases: [], p_is_active: true });
    assert.ifError(product.error); productId = row(product.data).product_id;
    const args = { p_care_recipient_id: patientA, p_product_id: productId, p_quantity: 2, p_movement_type: "inbound", p_source_location: null, p_destination_location: "FAMILY", p_justification: "Carga de teste", p_idempotency_key: randomUUID() };
    assert.ifError((await local.rpc("record_stock_movement", args)).error);
    const results = await Promise.all(Array.from({ length: 6 }, () => local.rpc("record_stock_movement", { ...args, p_movement_type: "outbound", p_source_location: "FAMILY", p_destination_location: "CARE_TEAM", p_idempotency_key: randomUUID() })));
    assert.equal(results.filter((result) => !result.error).length, 1);
    assert.equal(results.filter((result) => result.error).length, 5);
    const balances = await local.from("current_stock_balances").select("location,balance").eq("care_recipient_id", patientA).eq("product_id", productId);
    assert.ifError(balances.error);
    assert.deepEqual(Object.fromEntries(balances.data.map((entry) => [entry.location, Number(entry.balance)])), { FAMILY: 0, CARE_TEAM: 2 });
    assert.ok((await global.rpc("record_stock_movement", { ...args, p_movement_type: "outbound", p_source_location: "FAMILY", p_destination_location: null, p_idempotency_key: randomUUID() })).error);
  } finally {
    if (productId) sql(`delete from public.stock_movements where product_id=${sqlLiteral(productId)}; delete from public.care_recipient_products where product_id=${sqlLiteral(productId)}; delete from public.products where id=${sqlLiteral(productId)};`);
  }
});

test("concurrent global administrator demotions retain one active administrator", async () => {
  const [first, second] = await Promise.all([actor("global"), actor("global2")]);
  try {
    const args = (name) => ({ p_user_id: fixtures[name].id, p_full_name: `Teste ${name}`, p_role: "professional", p_status: "active", p_global_scope: false });
    const results = await Promise.all([first.rpc("admin_set_profile", args("global")), second.rpc("admin_set_profile", args("global2"))]);
    assert.equal(results.filter((result) => !result.error).length, 1);
    assert.equal(results.filter((result) => result.error).length, 1);
    assert.equal(Number(sql("select count(*) from public.profiles where status='active' and role='admin' and global_scope;")), 1);
    assert.equal(Number(sql("select active_count from public.global_admin_guard where singleton;")), 1);
  } finally {
    // Recovery uses only the verified local development database, preserving test identities.
    sql(`update public.profiles set role='admin',status='active',global_scope=true where id in (${sqlLiteral(fixtures.global.id)},${sqlLiteral(fixtures.global2.id)});`);
  }
});

test("competing outbox workers claim each notification once under real HTTP concurrency", async () => {
  const global = await actor("global"); let requisitionId;
  try {
    assert.ifError((await global.rpc("configure_recipient_notification", { p_care_recipient_id: patientA, p_recipient_user_id: fixtures.professional.id, p_recipient_group: "care_team", p_channel: "internal", p_destination: null, p_enabled: true })).error);
    const created = await global.rpc("submit_requisition", requestArgs(randomUUID())); assert.ifError(created.error);
    requisitionId = row(created.data).requisition_id;
    const workers = Array.from({ length: 6 }, () => randomUUID());
    const results = await Promise.all(workers.map((worker) => global.rpc("claim_notification_jobs", { p_limit: 1, p_worker_id: worker, p_external_enabled: false })));
    for (const result of results) assert.ifError(result.error);
    const claims = results.flatMap((result, index) => result.data.map((notification) => ({ notification, worker: workers[index] }))).filter((entry) => entry.notification.requisition_id === requisitionId);
    assert.equal(claims.length, 1);
    const { notification, worker } = claims[0];
    const validated = await global.rpc("validate_notification_job", { p_id: notification.id, p_worker_id: worker }); assert.ifError(validated.error); assert.equal(validated.data, true);
    assert.ok((await global.rpc("complete_notification_job", { p_id: notification.id, p_worker_id: randomUUID(), p_state: "delivered" })).error);
    assert.ifError((await global.rpc("complete_notification_job", { p_id: notification.id, p_worker_id: worker, p_state: "delivered", p_provider_reference: "internal" })).error);
    const checked = await global.from("requisition_notifications").select("state").eq("id", notification.id).single();
    assert.ifError(checked.error); assert.equal(checked.data.state, "delivered");
  } finally {
    if (requisitionId) sql(`delete from public.requisitions where id=${sqlLiteral(requisitionId)};`);
    sql(`delete from public.recipient_notification_settings where care_recipient_id=${sqlLiteral(patientA)} and recipient_user_id=${sqlLiteral(fixtures.professional.id)} and channel='internal';`);
  }
});
