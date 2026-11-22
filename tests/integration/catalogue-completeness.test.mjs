import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { setup, rpc, actor, env, fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

test("complete catalogue keeps more than1000 items and successor labels under real RLS without privileged execution", async () => {
  const f = await setup(), other = await setup(), prefix = "complete-" + randomUUID() + "-";
  sql(`insert into public.products(id,name,category,unit,owner_care_recipient_id)
    select ${q(prefix)}||n,'Material completo '||lpad(n::text,4,'0'),'higiene','unidade',${q(f.patient)} from generate_series(1,1005)n;
    insert into public.care_recipient_products(care_recipient_id,product_id,name,category,unit,aliases,sort_order)
    select ${q(f.patient)},id,name,category,unit,array['Alias final '||id],2000 from public.products where owner_care_recipient_id=${q(f.patient)} and id like ${q(prefix+'%')};
    update public.care_recipient_products set is_active=false where care_recipient_id=${q(f.patient)} and product_id=${q(prefix+'1005')};
    insert into public.catalogue_successors(care_recipient_id,product_id,successor_product_id) values(${q(f.patient)},${q(prefix+'1005')},${q(prefix+'1004')});`);
  await rpc(f.admin, "select_active_context", { p_patient: f.patient });
  const oracle = JSON.parse(sql(`select jsonb_agg(product_id order by sort_order,name,product_id) from public.care_recipient_products where care_recipient_id=${q(f.patient)};`));
  assert.ok(oracle.length > 1000);
  const before = sql(`select jsonb_build_object('items',(select jsonb_agg(to_jsonb(c) order by product_id) from public.care_recipient_products c where care_recipient_id=${q(f.patient)}),'guidance',(select jsonb_agg(to_jsonb(s) order by product_id) from public.catalogue_successors s where care_recipient_id=${q(f.patient)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(f.patient)}));`);
  const old = await f.admin.from("care_recipient_products").select("product_id", { count: "exact" }).eq("care_recipient_id", f.patient);
  assert.ifError(old.error); assert.equal(old.count, oracle.length);
  assert.equal(old.data.length, 1000, "The guarded project retains its1000-row tabular response limit.");
  const result = await rpc(f.admin, "catalogue_workspace", { p_patient: f.patient });
  assert.equal(result.careRecipientId, f.patient); assert.equal(result.total, oracle.length);
  assert.deepEqual(result.items.map(row => row.product_id), oracle);
  assert.ok(result.items.some(row => row.product_id === prefix + "1005" && !row.is_active));
  assert.deepEqual(result.successors, [{ product_id: prefix + "1005", successor_product_id: prefix + "1004" }]);
  const reader = await actor("reader", f.patient);
  assert.deepEqual((await rpc(reader, "catalogue_workspace", { p_patient: f.patient })).items.map(row => row.product_id), oracle);
  for (const patient of [other.patient, randomUUID()]) assert.equal((await f.admin.rpc("catalogue_workspace", { p_patient: patient })).error?.code, "42501");
  const global = await actor("global");
  assert.equal((await global.rpc("catalogue_workspace", { p_patient: f.patient })).error?.code, "42501");
  const anonymous = createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  assert.ok((await anonymous.rpc("catalogue_workspace", { p_patient: f.patient })).error);
  assert.equal(sql(`select not p.prosecdef and p.provolatile='s' and not has_function_privilege('anon',p.oid,'EXECUTE') and has_function_privilege('authenticated',p.oid,'EXECUTE') and not has_function_privilege('service_role',p.oid,'EXECUTE') from pg_proc p where p.oid='public.catalogue_workspace(uuid)'::regprocedure;`), "t");
  const after = sql(`select jsonb_build_object('items',(select jsonb_agg(to_jsonb(c) order by product_id) from public.care_recipient_products c where care_recipient_id=${q(f.patient)}),'guidance',(select jsonb_agg(to_jsonb(s) order by product_id) from public.catalogue_successors s where care_recipient_id=${q(f.patient)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(f.patient)}));`);
  assert.equal(after, before);
  sql(`update public.care_recipient_memberships set status='revoked' where care_recipient_id=${q(f.patient)} and user_id=${q(fixtures.adminA.id)};`);
  assert.equal((await f.admin.rpc("catalogue_workspace", { p_patient: f.patient })).error?.code, "42501");
});
