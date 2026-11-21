import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { actor, fixtures, rpc, setup } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

const scope = (patient, purpose, target = null, mode = "patient") => ({
  p_patient: patient, p_purpose: purpose, p_target: target, p_mode: mode,
});
const read = (client, args, key = null) => rpc(client, "catalogue_preparation_read", { ...args, p_key: key });
const current = (client, args, selection = null) => rpc(client, "catalogue_preparation_current", { ...args, p_selection: selection });
const packet = (args, action, { fields = null, hash = null, draft = null } = {}) => ({
  ...args, p_action: action, p_fields: fields, p_reference_hash: hash, p_key: randomUUID(),
  p_id: draft?.id ?? null, p_revision: draft?.revision ?? 0,
});
const command = "catalogue_preparation_command";
async function unusedProduct(f) {
  return (await rpc(f.admin,"admin_upsert_recipient_product",{
    p_care_recipient_id:f.patient,p_product_id:null,p_name:"Material sem histórico "+randomUUID(),
    p_category:"higiene",p_unit:"unidade",p_aliases:[],p_is_active:true,
  })).product_id;
}

test("patient and global unit creation recover the same unit and preserve zero-prefixed codes", async () => {
  const f = await setup(), global = await actor("global");
  for (const [client, args] of [[f.admin, scope(f.patient, "unit_create")], [global, scope(null, "unit_create", null, "global")]]) {
    let snapshot = await read(client, args);
    if (args.p_patient === null && snapshot.draft?.state === "consumed") {
      const priorId = snapshot.draft.outcome.unitId;
      assert.equal(sql(`select count(*) from public.measurement_units where id=${q(priorId)} and care_recipient_id is null
        and name='Volume fictício' and code ~ '^00[0-9a-f]{8}$' and dimension='volume' and decimals=6;`), "1");
      await rpc(client, command, packet(args, "acknowledge", { draft: snapshot.draft }));
      snapshot = await read(client, args);
    }
    const { reference } = snapshot;
    const code = "00" + randomUUID().slice(0,8), fields = { code, name: "", dimension: "volume", decimals: "6" };
    const save = packet(args, "save", { fields, hash: reference.hash });
    const saved = await rpc(client, command, save);
    assert.deepEqual((await read(client, args)).draft.fields, fields);
    assert.equal(sql(`select count(*) from public.measurement_units where code=${q(code)};`), "0");
    const final = packet(args, "commit", { fields: { ...fields, name: "Volume fictício" }, hash: reference.hash, draft: saved });
    const [one, two] = await Promise.all([rpc(client, command, final), rpc(client, command, final)]);
    assert.deepEqual(one, two);
    assert.deepEqual((await read(client, args, final.p_key)).receipt, one);
    assert.equal(sql(`select code||':'||decimals from public.measurement_units where id=${q(one.outcome.unitId)};`), code+":6");
    assert.equal(sql(`select coalesce(care_recipient_id::text,'global') from public.measurement_units where id=${q(one.outcome.unitId)};`), args.p_patient ?? "global");
    const consumed = (await read(client,args)).draft;
    assert.equal((await rpc(client,command,packet(args,"acknowledge",{draft:consumed}))).state,"acknowledged");
  }
  assert.equal((await f.admin.rpc("catalogue_preparation_read", scope(null,"unit_create",null,"global"))).error?.code,"42501");
});

test("unit precision compares current material, retains raw input and commits once", async () => {
  const f = await setup(), args = scope(f.patient, "unit_configure");
  const productId = await unusedProduct(f), first = await current(f.admin,args,productId);
  const fields = { productId, unit: first.product.unit, decimals: "2" };
  const initial = await rpc(f.admin,command,packet(args,"save",{fields,hash:first.hash}));
  await rpc(f.admin,"configure_catalogue_unit",{p_patient:f.patient,p_product:productId,p_unit:fields.unit,p_decimals:1});
  const stale = packet(args,"commit",{fields,hash:first.hash,draft:initial});
  assert.equal((await f.admin.rpc(command,stale)).error?.code,"PT409");
  assert.equal((await read(f.admin,args,stale.p_key)).receipt,null);
  assert.deepEqual((await read(f.admin,args)).draft.fields,fields);
  const updated = await current(f.admin,args,productId);
  const commit = { ...stale,p_key:randomUUID(),p_reference_hash:updated.hash };
  const receipt = await rpc(f.admin,command,commit);
  assert.deepEqual(await rpc(f.admin,command,commit),receipt);
  assert.equal(receipt.outcome.productId,productId);
  assert.equal(sql(`select quantity_decimals from public.care_recipient_products where care_recipient_id=${q(f.patient)} and product_id=${q(productId)};`),"2");
});

test("presentation create and edit retain source precision, exact factor and native history", async () => {
  const f = await setup(), productId = await unusedProduct(f), create = scope(f.patient,"presentation_create");
  await rpc(f.admin,"configure_catalogue_unit",{p_patient:f.patient,p_product:productId,p_unit:"unidade",p_decimals:3});
  const { hash } = await current(f.admin,create,productId);
  const fields = { productId, name:"Embalagem fictícia", barcode:"0012345678901", factor:"2,125", active:true };
  const saved = await rpc(f.admin,command,packet(create,"save",{fields,hash}));
  assert.deepEqual((await read(f.admin,create)).draft.fields,fields);
  const created = await rpc(f.admin,command,packet(create,"commit",{fields,hash,draft:saved}));
  const { presentationId } = created.outcome;
  const edit = scope(f.patient,"presentation_edit",presentationId);
  const base = (await read(f.admin,edit)).reference;
  assert.equal(base.presentation.version,1);
  const edited = await rpc(f.admin,command,packet(edit,"commit",{fields:{...fields,factor:"3,25"},hash:base.hash}));
  assert.equal(edited.outcome.version,2);
  assert.equal(sql(`select barcode||':'||base_quantity::text from public.product_presentations where id=${q(presentationId)};`),"0012345678901:3.250000");
  assert.equal(sql(`select count(*) from public.product_presentation_versions where presentation_id=${q(presentationId)};`),"2");
});

test("successor preparation preserves the native event and actor-only receipt after write is revoked", async () => {
  const f = await setup(), product = f.products[0], successor = f.products[1];
  const args = scope(f.patient,"identity",product);
  const source = await current(f.admin,args,successor);
  const fields = { identityAction:"retire", successorId:successor, reason:"Escolha fictícia com sucessor próprio" };
  const saved = await rpc(f.admin,command,packet(args,"save",{fields,hash:source.hash}));
  assert.deepEqual((await read(f.admin,args)).draft.fields,fields);
  const commit = packet(args,"commit",{fields,hash:source.hash,draft:saved});
  const result = await rpc(f.admin,command,commit);
  assert.equal(result.outcome.productId,product);
  assert.equal(sql(`select successor_product_id from public.catalogue_successors where care_recipient_id=${q(f.patient)} and product_id=${q(product)};`),successor);
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'catalog.manage',false);`);
  assert.deepEqual((await read(f.admin,args,commit.p_key)).receipt,result);
  assert.deepEqual(await rpc(f.admin,command,commit),result);
  assert.equal((await f.admin.rpc(command,{...commit,p_key:randomUUID()})).error?.code,"42501");
  assert.equal((await f.admin.rpc("catalogue_preparation_read",args)).error?.code,"42501");
  assert.equal((await read(await actor("global",f.patient),args,commit.p_key)).receipt,null);
  assert.equal(sql(`select count(*) from public.catalogue_identity_events where care_recipient_id=${q(f.patient)};`),"1");
});
