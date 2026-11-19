import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { actor, fixtures, rpc, setup } from "./v4-fixtures.mjs";

const read = (client, patient, kind) => rpc(client, "household_material_lists", { p_patient: patient, p_kind: kind });
const packet = (f, overrides = {}) => ({
  p_patient: f.patient, p_kind: "COM", p_id: null, p_revision: null,
  p_name: "Cuidados do dia a dia", p_products: f.products, p_key: randomUUID(), ...overrides,
});

test("listas da casa cruzam perfis e fichas; listas pessoais e outras residências conservam seu acesso", async () => {
  const f = await setup();
  const professional = await actor("professional", f.patient);
  const family = await actor("family", f.patient);
  const reader = await actor("reader", f.patient);
  const personal = await rpc(professional, "save_requisition_selection", {
    p_patient: f.patient, p_name: "Minha seleção anterior", p_products: [f.products[0]], p_key: randomUUID(),
  });
  assert.deepEqual(await read(professional, f.patient, "REQ"), []);
  const args = packet(f);
  const before = sql(`select count(*) from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)};`);
  const copies = await Promise.all([
    rpc(f.admin, "save_household_material_list", args),
    rpc(f.admin, "save_household_material_list", args),
  ]);
  assert.deepEqual(copies.map(result => result.replayed).sort(), [false, true]);
  assert.deepEqual(copies[0].list, copies[1].list);
  assert.deepEqual(Object.keys(copies[0].list).sort(), ["id", "name", "patientId", "productIds", "revision", "updatedAt", "updatedBy"]);
  assert.deepEqual(await read(professional, f.patient, "REQ"), [copies[0].list]);
  assert.deepEqual(await read(family, f.patient, "ENT"), [copies[0].list]);
  assert.deepEqual(await rpc(professional, "requisition_selections", { p_patient: f.patient }), [personal.selection]);
  assert.deepEqual(await rpc(f.admin, "requisition_selections", { p_patient: f.patient }), []);
  assert.equal((await reader.rpc("save_household_material_list", packet(f, { p_kind: "REQ" }))).error?.code, "42501");
  assert.equal((await family.rpc("household_material_lists", { p_patient: randomUUID(), p_kind: "ENT" })).error?.code, "42501");
  assert.equal(sql(`select count(*) from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)};`), before);
  assert.equal(sql("select has_table_privilege('authenticated','private.household_material_lists','select');"), "f");
  assert.equal(sql("select has_function_privilege('anon','public.household_material_lists(uuid,text)','execute');"), "f");
});

test("edição concorrente usa a revisão da lista e recupera só a tentativa confirmada", async () => {
  const f = await setup();
  const family = await actor("family", f.patient);
  const original = (await rpc(f.admin, "save_household_material_list", packet(f))).list;
  const edit = { p_id: original.id, p_revision: original.revision, p_products: [f.products[0]] };
  const first = packet(f, { ...edit, p_name: "Primeira atualização" });
  const second = packet(f, { ...edit, p_name: "Outra atualização", p_kind: "ENT" });
  const results = await Promise.all([
    f.admin.rpc("save_household_material_list", first),
    family.rpc("save_household_material_list", second),
  ]);
  assert.equal(results.filter(result => result.error?.code === "PT409").length, 1);
  assert.equal(results.filter(result => result.data?.list.revision === 2).length, 1);

  const current = (await read(f.admin, f.patient, "COM"))[0];
  sql(`update public.care_recipient_products set is_active=false where care_recipient_id=${sqlLiteral(f.patient)}
    and product_id=${sqlLiteral(f.products[0])};`);
  assert.equal((await f.admin.rpc("save_household_material_list", packet(f, { p_products: [f.products[0]] }))).error?.code, "22023");
  const rename = packet(f, {
    p_id: current.id, p_revision: current.revision, p_products: current.productIds, p_name: "Histórico preservado",
  });
  const last = await rpc(f.admin, "save_household_material_list", rename);
  assert.deepEqual(last.list.productIds, current.productIds);
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled)
    values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.adminA.id)},'com.create',false);`);
  assert.deepEqual(await rpc(f.admin, "save_household_material_list", rename), { ...last, replayed: true });
  assert.equal((await f.admin.rpc("save_household_material_list", packet(f))).error?.code, "42501");
  sql(`update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)}
    and user_id=${sqlLiteral(fixtures.adminA.id)};`);
  assert.equal((await f.admin.rpc("save_household_material_list", rename)).error?.code, "42501");
});
