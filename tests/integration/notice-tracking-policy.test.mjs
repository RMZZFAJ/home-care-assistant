import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { setup, actor, env, rpc } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

const owned = new Set();
afterEach(() => { if (owned.size) sql(`update public.care_recipients set is_active=false where id=any(array[${[...owned].map(sqlLiteral).join(",")}]::uuid[]);`); owned.clear(); });
async function fixture() {
  const f = await setup(); owned.add(f.patient); const owner = await actor("family", f.patient);
  const doc = await rpc(owner, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "1" }] }, p_key: randomUUID(), p_draft: false });
  return { ...f, owner, doc };
}
function policy(f, value) { sql(`insert into public.patient_settings(care_recipient_id,settings) values(${sqlLiteral(f.patient)},${sqlLiteral(JSON.stringify(value))}) on conflict(care_recipient_id) do update set settings=excluded.settings;`); }
test("current document reader receives only the configured0/5/10-second policy and the documented default", async () => {
  const f = await fixture();
  for (const [settings, seconds] of [[{}, 10], [{ shareWaitSeconds: null }, 10], [{ shareWaitSeconds: 0 }, 0], [{ shareWaitSeconds: 5, privateSentinel: "DO_NOT_RETURN" }, 5], [{ shareWaitSeconds: 10 }, 10]]) {
    policy(f, settings); const result = await rpc(f.owner, "document_notice_tracking_policy", { p_document: f.doc.id });
    assert.deepEqual(result, { waitSeconds: seconds });
  }
  for (const bad of [-1, 11, 1.5, "5", true, {}]) { policy(f, { shareWaitSeconds: bad }); assert.equal((await f.owner.rpc("document_notice_tracking_policy", { p_document: f.doc.id })).error?.code, "22023"); }
});
test("policy read preserves document/context/session authority and grants no anonymous or worker path", async () => {
  const a = await fixture(), b = await fixture();
  await rpc(a.owner, "select_active_context", { p_patient: a.patient });
  assert.equal((await a.owner.rpc("document_notice_tracking_policy", { p_document: b.doc.id })).error?.code, "42501");
  for (const key of [env.anonKey, env.serviceKey]) { const client = createClient(env.url, key, { auth: { persistSession: false } }); assert.ok((await client.rpc("document_notice_tracking_policy", { p_document: a.doc.id })).error); }
  const global = await actor("global"); assert.equal((await global.rpc("document_notice_tracking_policy", { p_document: a.doc.id })).error?.code, "42501");
  sql(`update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(a.patient)} and user_id=${sqlLiteral((await a.owner.auth.getUser()).data.user.id)};`);
  assert.equal((await a.owner.rpc("document_notice_tracking_policy", { p_document: a.doc.id })).error?.code, "42501");
});
