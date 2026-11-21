import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { actor, fixtures, rpc, setup } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";

const readName = "catalogue_preparation_read";
const commandName = "catalogue_preparation_command";
const scope = (patient, purpose = "create", target = null, mode = "patient") => ({
  p_patient: patient, p_mode: mode, p_purpose: purpose, p_target: target,
});
const read = (client, args, key = null) => rpc(client, readName, { ...args, p_key: key });
const packet = (args, action, options = {}) => ({
  ...args, p_action: action, p_key: randomUUID(), p_id: options.draft?.id ?? null,
  p_revision: options.draft?.revision ?? 0, p_fields: options.fields ?? null, p_reference_hash: options.hash ?? null,
});
const fields = (name = "Material " + randomUUID()) => ({
  name, category: "higiene", unit: "pacote", aliases: "", description: "", sortOrder: "0", isActive: true,
});
const productCount = (patient) => sql(`select count(*) from public.care_recipient_products where care_recipient_id=${sqlLiteral(patient)};`);

test("catalogue draft is owner and context scoped, CAS protects other devices, and discard clears only its own fields", async () => {
  const f = await setup(), another = await setup();
  await actor("adminA", f.patient);
  const args = scope(f.patient), otherAdmin = await actor("global", f.patient), reader = await actor("reader", f.patient);
  const start = await read(f.admin, args);
  const partial = fields("");
  partial.sortOrder = "em revisão";
  partial.aliases = "Primeiro, , segundo,";
  const first = packet(args, "save", { fields: partial, hash: start.reference.hash });
  assert.equal((await f.admin.rpc(commandName, { ...first, p_fields: { ...partial, privateNotes: ["x"] } })).error?.code, "22023");
  const before = productCount(f.patient);
  const saved = await rpc(f.admin, commandName, first);
  const snapshot = await read(f.admin, args);
  assert.deepEqual(snapshot.draft.fields, partial);
  assert.deepEqual((await read(f.admin, args, first.p_key)).receipt, saved);
  assert.equal(saved.ownerId, fixtures.adminA.id);
  assert.equal((await read(otherAdmin, args)).draft, null);
  assert.equal((await read(otherAdmin, args, first.p_key)).receipt, null);
  assert.equal((await otherAdmin.rpc(commandName, packet(args, "discard", { draft: snapshot.draft }))).error?.code, "PT409");
  assert.equal((await reader.rpc(readName, args)).error?.code, "42501");
  assert.equal((await f.admin.rpc(readName, scope(another.patient))).error?.code, "42501");
  assert.equal((await otherAdmin.rpc(readName, scope(f.patient, "create", null, "global"))).error?.code, "42501");
  const changes = ["A", "B"].map(name => packet(args, "save", { draft: snapshot.draft, fields: { ...partial, name }, hash: start.reference.hash }));
  const outcomes = await Promise.all(changes.map(change => f.admin.rpc(commandName, change)));
  assert.equal(outcomes.filter(result => result.error === null).length, 1);
  assert.equal(outcomes.find(result => result.error)?.error.code, "PT409");
  const latest = (await read(f.admin, args)).draft;
  assert.equal(latest.revision, 2);
  assert.equal((await f.admin.rpc(commandName, packet(args, "discard", { draft: snapshot.draft }))).error?.code, "PT409");
  assert.equal((await rpc(f.admin, commandName, packet(args, "discard", { draft: latest }))).state, "discarded");
  assert.equal((await read(f.admin, args)).draft, null);
  assert.equal(productCount(f.patient), before);
  assert.equal(sql(`select count(*) from private.catalogue_preparations where id=${sqlLiteral(latest.id)} and fields is null and reference_hash is null;`), "1");
});

test("exact retry and receipt recover one native catalogue write even after acknowledgment and another preparation", async () => {
  const f = await setup(), args = scope(f.patient), { reference } = await read(f.admin, args);
  const initialCount = Number(productCount(f.patient));
  const body = packet(args, "commit", { fields: fields(), hash: reference.hash });
  const [left, right] = await Promise.all([rpc(f.admin, commandName, body), rpc(f.admin, commandName, body)]);
  assert.deepEqual(left, right);
  assert.equal(left.state, "consumed");
  assert.equal((await f.admin.rpc(commandName, { ...body, p_fields: fields() })).error?.code, "23505");
  assert.equal(Number(productCount(f.patient)), initialCount + 1);
  const draft = (await read(f.admin, args)).draft;
  assert.equal(draft.fields, null);
  assert.equal(draft.outcome.productId, left.outcome.productId);
  assert.equal((await f.admin.rpc(commandName, packet(args, "discard", { draft }))).error?.code, "PT409");
  await rpc(f.admin, commandName, packet(args, "acknowledge", { draft }));
  await rpc(f.admin, commandName, packet(args, "save", { fields: fields("Outro preenchimento"), hash: reference.hash }));
  assert.deepEqual((await read(f.admin, args, body.p_key)).receipt, left);
  assert.deepEqual(await rpc(f.admin, commandName, body), left);
  assert.equal(Number(productCount(f.patient)), initialCount + 1);
});

test("edit and adoption require current scoped references and keep private input after stale or invalid final writes", async () => {
  const f = await setup(), product = f.products[0], args = scope(f.patient, "edit", product);
  const initial = await read(f.admin, args);
  const edit = fields("Novo nome para a mesma identidade");
  edit.unit = initial.reference.item.unit;
  const saved = await rpc(f.admin, commandName, packet(args, "save", { fields: edit, hash: initial.reference.hash }));
  await rpc(f.admin, "admin_upsert_recipient_product", {
    p_care_recipient_id: f.patient, p_product_id: product, p_name: "Nome alterado após a leitura",
    p_category: edit.category, p_unit: edit.unit, p_aliases: [], p_is_active: true,
  });
  const commit = packet(args, "commit", { draft: saved, fields: edit, hash: initial.reference.hash });
  assert.equal((await f.admin.rpc(commandName, commit)).error?.code, "PT409");
  assert.equal((await read(f.admin, args, commit.p_key)).receipt, null);
  const latest = await read(f.admin, args);
  assert.deepEqual(latest.draft.fields, edit);
  assert.equal((await f.admin.rpc(commandName, { ...commit, p_key: randomUUID(), p_fields: { ...edit, sortOrder: "12345678" }, p_reference_hash: latest.reference.hash })).error?.code, "22023");
  assert.equal((await rpc(f.admin, commandName, { ...commit, p_key: randomUUID(), p_reference_hash: latest.reference.hash })).outcome.productId, product);

  const modelId = "test-model-" + randomUUID(), adoption = scope(f.patient, "adopt");
  sql(`insert into public.products(id,name,category,unit,is_active) values(${sqlLiteral(modelId)}, ${sqlLiteral(modelId)}, 'higiene', 'pacote', true);`);
  const model = (await read(f.admin, adoption)).reference.models.find(item => item.id === modelId);
  const adoptionFields = { modelId };
  const selection = await rpc(f.admin, commandName, packet(adoption, "save", { fields: adoptionFields, hash: model.hash }));
  sql(`update public.products set aliases=array['Mudança da referência'] where id=${sqlLiteral(modelId)};`);
  assert.equal((await f.admin.rpc(commandName, packet(adoption, "commit", { draft: selection, fields: adoptionFields, hash: model.hash }))).error?.code, "PT409");
  const current = await read(f.admin, adoption);
  assert.deepEqual(current.draft.fields, adoptionFields);
  const currentModel = current.reference.models.find(item => item.id === modelId);
  assert.notEqual(currentModel.hash, model.hash);
  const adopted = await rpc(f.admin, commandName, packet(adoption, "commit", { draft: current.draft, fields: adoptionFields, hash: currentModel.hash }));
  assert.equal(adopted.outcome.productId, modelId);
  assert.equal((await read(f.admin, adoption)).reference.models.some(item => item.id === modelId), false);
});

test("global catalogue preparation requires local approval and private helpers have no public execution", async () => {
  const f = await setup(), global = await actor("global"), args = scope(f.patient, "create", null, "global");
  const { reference } = await read(global, args);
  const name = "Proposta de catálogo " + randomUUID();
  const before = Number(productCount(f.patient));
  const body = packet(args, "commit", { fields: fields(name), hash: reference.hash });
  const receipt = await rpc(global, commandName, body);
  assert.equal(receipt.ownerId, fixtures.global.id);
  assert.equal(Number(productCount(f.patient)), before);
  assert.equal((await global.rpc(readName, scope(f.patient))).error?.code, "42501");
  assert.equal((await f.admin.rpc(readName, args)).error?.code, "42501");
  const id = receipt.outcome.proposalId;
  assert.equal(sql(`select status from public.access_change_requests where id=${sqlLiteral(id)};`), "pending");
  const approved = await rpc(f.admin, "configure_patient_access", {
    p_patient: f.patient, p_kind: "administration", p_change: {}, p_key: randomUUID(), p_version: 1,
    p_request_id: id, p_decision: "approve",
  });
  assert.equal(approved.status, "applied");
  assert.equal(Number(productCount(f.patient)), before + 1);
  assert.equal(sql(`select count(*) from public.care_recipient_products where care_recipient_id=${sqlLiteral(f.patient)} and name=${sqlLiteral(name)};`), "1");
  assert.deepEqual((await read(global, args, body.p_key)).receipt, receipt);
  assert.equal(sql(`select count(*) from (values
    (has_function_privilege('anon','public.catalogue_preparation_read(uuid,text,text,text,uuid)','execute')),
    (has_function_privilege('service_role','public.catalogue_preparation_command(uuid,text,text,text,text,uuid,uuid,integer,jsonb,text)','execute')),
    (has_function_privilege('authenticated','private.catalogue_preparation_reference(uuid,text,text,text,text)','execute')),
    (has_table_privilege('authenticated','private.catalogue_preparations','select'))
  ) v(allowed) where allowed;`), "0");
});

test("native and prepared adoption wait on stock without holding catalogue and recheck revoked authority", async () => {
  const f = await setup(), args = scope(f.patient, "adopt");
  const modelId = "test-model-" + randomUUID();
  sql(`insert into public.products(id,name,category,unit,is_active) values(${sqlLiteral(modelId)}, ${sqlLiteral(modelId)}, 'higiene', 'pacote', true);`);
  const reference = (await read(f.admin, args)).reference.models.find(item => item.id === modelId);
  const native = () => f.admin.rpc("admin_adopt_product", { p_care_recipient_id: f.patient, p_product_id: modelId });
  const before = productCount(f.patient);
  const stock = "stock:" + f.patient, catalogue = "catalogue:" + f.patient;
  const waiting = () => {
    assert.equal(sql(`select pg_try_advisory_xact_lock(hashtextextended(${sqlLiteral(catalogue)},0));`), "t");
    sql(`update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.adminA.id)};`);
  };
  const deniedNative = await whileAdvisoryWaits(stock, native, waiting);
  assert.equal(deniedNative.error?.code, "42501");
  sql(`update public.care_recipient_memberships set status='active' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.adminA.id)};`);
  const commit = packet(args, "commit", { fields: { modelId }, hash: reference.hash });
  const deniedPrepared = await whileAdvisoryWaits(stock, () => f.admin.rpc(commandName, commit), waiting);
  assert.equal(deniedPrepared.error?.code, "42501");
  assert.equal(productCount(f.patient), before);
  assert.equal(sql(`select count(*) from private.catalogue_preparation_commands where key=${sqlLiteral(commit.p_key)};`), "0");
});
