import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { setup, rpc, env, fixtures, request } from "./v4-fixtures.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
async function identity(patient) {
  const client = createClient(env.url, env.anonKey, clientOptions);
  assert.ifError((await client.auth.signInWithPassword({ email: fixtures.adminA.email, password: fixturePassword })).error);
  if (patient) await rpc(client, "select_active_context", { p_patient: patient });
  return client;
}
function movement(f, overrides = {}) {
  return { p_patient: f.patient, p_product: f.products[0], p_quantity: "1", p_action: "inbound", p_reason: "Controle de quantidade e referência", p_key: randomUUID(), ...overrides };
}

test("stock RPC rejects fractional precision before storage coercion and preserves exact ledger", async () => {
  const f = await setup();
  const before = sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`);
  for (const amount of ["1.0000004", 1.0000004, "0.0000001", "NaN", "Infinity", null]) {
    const response = await f.admin.rpc("family_stock_movement", movement(f, { p_quantity: amount }));
    assert.ok(response.error, `RPC silently accepted ${amount}`);
  }
  assert.equal(sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`), before);
  const fluid = await rpc(f.admin, "admin_upsert_recipient_product", { p_care_recipient_id: f.patient, p_product_id: null, p_name: "Líquido fictício preciso", p_category: "higiene", p_unit: "mL", p_aliases: [], p_is_active: true });
  await rpc(f.admin, "configure_catalogue_unit", { p_patient: f.patient, p_product: fluid.product_id, p_unit: "mL", p_decimals: 6, p_barcode: null, p_presentation: null, p_base_quantity: null });
  await rpc(f.admin, "family_stock_movement", movement(f, { p_product: fluid.product_id, p_quantity: "0.000001" }));
  assert.deepEqual(JSON.parse(sql(`select jsonb_build_object('rows',count(*),'balance',sum(case when destination_location='FAMILY' then quantity else 0 end-case when source_location='FAMILY' then quantity else 0 end)::text) from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)} and product_id=${sqlLiteral(fluid.product_id)};`)), { rows: 1, balance: "0.000001" });
});

test("compensation requires the original movement, patient, product and opposite custody direction", async () => {
  const f = await setup();
  const original = await rpc(f.admin, "family_stock_movement", movement(f, { p_quantity: "3" }));
  for (const overrides of [
    { p_action: "correction_out" },
    { p_action: "correction_out", p_reference: randomUUID() },
    { p_action: "correction_out", p_reference: original, p_product: f.products[1] },
    { p_action: "correction_in", p_reference: original },
    { p_action: "outbound", p_reference: original },
  ]) assert.ok((await f.admin.rpc("family_stock_movement", movement(f, overrides))).error, JSON.stringify(overrides));
  const key = randomUUID(), args = movement(f, { p_action: "correction_out", p_reference: original, p_quantity: "2", p_key: key });
  const corrected = await rpc(f.admin, "family_stock_movement", args);
  assert.equal(await rpc(f.admin, "family_stock_movement", args), corrected);
  assert.equal(Number(sql(`select count(*) from public.stock_movements where reference_id=${sqlLiteral(original)};`)), 1);
  assert.equal(sql(`select quantity::text from public.stock_movements where id=${sqlLiteral(original)};`), "3.000000");
});

test("a revoked real Auth session cannot mutate profile or upload/read an owned avatar directly", async () => {
  const client = await identity();
  const session = (await client.auth.getSession()).data.session;
  const stale = createClient(env.url, env.anonKey, { ...clientOptions, global: { headers: { Authorization: `Bearer ${session.access_token}` } } });
  const path = `${fixtures.adminA.id}/${randomUUID()}.jpg`;
  const jpeg = await sharp({ create: { width: 1, height: 1, channels: 3, background: "#ffffff" } }).jpeg().toBuffer();
  assert.ifError((await client.storage.from("profile-avatars").upload(path, jpeg, { contentType: "image/jpeg" })).error);
  assert.ifError((await client.auth.signOut({ scope: "local" })).error);
  assert.equal(await rpc(stale, "my_session_valid", {}), false);
  const before = JSON.parse(sql(`select jsonb_build_object('name',full_name,'avatar',avatar_path) from public.profiles where id=${sqlLiteral(fixtures.adminA.id)};`));
  const profile = await stale.rpc("update_my_profile", { p_name: "Sessão encerrada não deve escrever", p_registration: "", p_state: null, p_category: "", p_preferences: {} });
  const avatar = await stale.rpc("set_my_avatar", { p_path: path });
  const upload = await stale.storage.from("profile-avatars").upload(`${fixtures.adminA.id}/${randomUUID()}.jpg`, jpeg, { contentType: "image/jpeg" });
  const download = await stale.storage.from("profile-avatars").download(path);
  const changed = sql(`select full_name from public.profiles where id=${sqlLiteral(fixtures.adminA.id)};`);
  // Preserve the shared synthetic identity even when the negative baseline
  // reproduces the forbidden write. Operational history is never rewritten.
  sql(`update public.profiles set full_name=${sqlLiteral(before.name)},avatar_path=${before.avatar ? sqlLiteral(before.avatar) : 'null'} where id=${sqlLiteral(fixtures.adminA.id)};`);
  assert.ok(profile.error, "revoked session changed its profile");
  assert.ok(avatar.error, "revoked session changed its avatar");
  assert.ok(upload.error, "revoked session uploaded an avatar");
  assert.ok(download.error, "revoked session read a private avatar");
  assert.equal(changed, before.name);
});

for (const workflow of ["stock", "requisition"]) {
  for (const revocation of ["session", "context"]) {
    test(`${workflow} revalidates ${revocation} after an authenticated request waits for its lock`, { timeout: 45_000 }, async () => {
      const f = await setup(), alternate = revocation === "context" ? await setup() : null;
      const client = await identity(f.patient);
      const token = (await client.auth.getSession()).data.session.access_token;
      const stale = createClient(env.url, env.anonKey, { ...clientOptions, global: { headers: { Authorization: `Bearer ${token}` } } });
      const key = randomUUID();
      const args = workflow === "stock" ? movement(f, { p_key: key }) : { ...request(f.patient, [f.products[0]]), p_idempotency_key: key };
      const name = workflow === "stock" ? "family_stock_movement" : "submit_requisition";
      const response = await whileAdvisoryWaits(`${workflow === "stock" ? "stock" : "requisition-patient"}:${f.patient}`, () => stale.rpc(name, args), async () => {
        if (revocation === "session") {
          assert.ifError((await client.auth.signOut({ scope: "local" })).error);
          assert.equal(await rpc(stale, "my_session_valid", {}), false);
        } else {
          await rpc(client, "select_active_context", { p_patient: alternate.patient });
          assert.equal((await rpc(client, "my_active_context", {})).care_recipient_id, alternate.patient);
        }
      });
      assert.ok(response.error, `${workflow} wrote after confirmed ${revocation} revocation`);
      assert.equal(response.error.code, "42501");
      assert.equal(Number(sql(`select count(*) from public.stock_movements where idempotency_key=${sqlLiteral(key)};`)), 0);
      assert.equal(Number(sql(`select count(*) from public.operational_documents where idempotency_key=${sqlLiteral(key)};`)), 0);
      if (revocation === "context") assert.ifError((await client.auth.signOut({ scope: "local" })).error);
    });
  }
}
