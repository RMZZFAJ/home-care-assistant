import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  getTestEnvironment,
  fixtureFile,
  sql,
  sqlLiteral,
} from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
const env = getTestEnvironment(),
  fixtures = JSON.parse(readFileSync(fixtureFile, "utf8"));
const clients = new Map();
async function actor(name, patient) {
  if (
    clients.has(name) &&
    (await clients.get(name).rpc("my_session_valid")).data !== true
  )
    clients.delete(name);
  if (!clients.has(name)) {
    const client = createClient(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    assert.ifError(
      (
        await client.auth.signInWithPassword({
          email: fixtures[name].email,
          password: fixturePassword,
        })
      ).error,
    );
    clients.set(name, client);
  }
  const client = clients.get(name);
  assert.ifError(
    (await client.rpc("select_active_context", { p_patient: patient ?? null }))
      .error,
  );
  return client;
}
async function rpc(client, name, args) {
  const result = await client.rpc(name, args);
  assert.ifError(result.error);
  return result.data;
}
const request = (patient, products) => ({
  p_care_recipient_id: patient,
  p_idempotency_key: randomUUID(),
  p_payload_hash: "ignored",
  p_lines: products.map((productId) => ({
    productId,
    currentStock: "0",
    urgent: true,
  })),
  p_extra_items: [],
  p_observations: [],
});
async function setup() {
  const global = await actor("global");
  const patient = (
    await rpc(global, "admin_upsert_recipient", {
      p_id: null,
      p_display_name: "Homologação fictícia V4 " + randomUUID().slice(0, 8),
      p_is_active: true,
      p_is_development: true,
    })
  ).id;
  // Controlled fixture setup only. All identities were issued by the official Auth API.
  for (const name of ["global", "adminA", "family", "professional", "reader"])
    sql(
      `insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values(${sqlLiteral(patient)},${sqlLiteral(fixtures[name].id)},${sqlLiteral(["global", "adminA"].includes(name) ? "admin" : name)});`,
    );
  const admin = await actor("adminA", patient);
  const products = [];
  for (let i = 0; i < 2; i++)
    products.push(
      (
        await rpc(admin, "admin_upsert_recipient_product", {
          p_care_recipient_id: patient,
          p_product_id: null,
          p_name: "Material fictício V4 " + i,
          p_category: "higiene",
          p_unit: "unidade",
          p_aliases: [],
          p_is_active: true,
        })
      ).product_id,
    );
  for (const product of products)
    await rpc(admin, "family_stock_movement", {
      p_patient: patient,
      p_product: product,
      p_quantity: "30",
      p_action: "inbound",
      p_reason: "Saldo fictício controlado de homologação V4",
      p_key: randomUUID(),
    });
  return { patient, admin, products };
}
async function issue(patient, products) {
  const pro = await actor("professional", patient);
  const row = (
    await rpc(pro, "submit_requisition", request(patient, products))
  )[0];
  const lines = await pro
    .from("requisition_items")
    .select("id,product_id")
    .eq("requisition_id", row.requisition_id);
  assert.ifError(lines.error);
  return { id: row.requisition_id, lines: lines.data };
}
async function delivery(patient, req, products, extras = {}) {
  const family = await actor("family", patient);
  return rpc(family, "create_supply_document", {
    p_patient: patient,
    p_type: "ENT",
    p_key: randomUUID(),
    p_payload: {
      source: "FAMILY",
      destination: "CARE_TEAM",
      recipientId: fixtures.professional.id,
      lines: products.map((productId, i) => ({
        productId,
        quantity: i ? "2" : "10",
        requisitionItemIds: [
          req.lines.find((row) => row.product_id === productId).id,
        ],
        ...extras,
      })),
    },
  });
}

export { env, fixtures, actor, rpc, setup, issue, delivery, request };
