import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { balanceSetup } from "./shift-fixtures.mjs";
import { assignRecount, pendingRecount, workspace } from "./bal-recount-fixtures.mjs";
import { legacyBalance } from "./bal-review-fixtures.mjs";
import { rpc } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

const extra = name => ({ id: randomUUID(), name, unit: "unidade", quantity: "2" });
const addProduct = (f, name) => rpc(f.admin, "admin_upsert_recipient_product", {
  p_care_recipient_id: f.patient, p_product_id: null, p_name: name, p_category: "higiene",
  p_unit: "unidade", p_aliases: [], p_is_active: true,
});

test("BAL binds extras and stage to its own draft; catalogue names and divergent confirmation are rejected", async () => {
  const f = await balanceSetup({ stableCurrentWindow: true });
  const state = await workspace(f.pro.client, f.patient);
  const assignment = state.eligibility.assignment;
  const entries = [extra("Espátula sem cadastro")];
  const lines = f.products.map(productId => ({ productId, quantity: "0" }));
  const content = { counts: Object.fromEntries(lines.map(x => [x.productId,x.quantity])), observationTimes: {}, notes: "Conferência",
    materials: [], balanceExtras: entries, materialCategory: "higiene",
    context: { mode: "scheduled", documentId: null, documentVersion: null, assignmentId: assignment.id,
      assignmentVersion: assignment.version, referenceRevision: state.referenceRevision } };
  const saved = await rpc(f.pro.client,"creation_draft_command",{ p_patient: f.patient, p_kind:"BAL", p_target:null, p_id:null,
    p_expected:null, p_key:randomUUID(), p_body:{action:"save",content,navigation:{version:1,stage:"bal_extras"}} });
  const read = await rpc(f.pro.client,"creation_draft_context",{p_patient:f.patient,p_kind:"BAL",p_target:null});
  assert.deepEqual(read.navigation,{version:1,stage:"bal_extras"});
  assert.deepEqual(read.content.balanceExtras,entries);
  const payload = { lines, notes: content.notes, balanceExtras: entries, balanceAssignment: {
    id: assignment.id, version: assignment.version, referenceRevision: state.referenceRevision,
  }};
  const packet = { p_id: saved.id, p_expected: saved.revision, p_target: null, p_key: randomUUID(),
    p_body: { action:"create_bal", payload } };
  const ledger = () => sql(`select count(*) from public.stock_movements where care_recipient_id=${q(f.patient)}`);
  const before = ledger();
  const divergent = await f.pro.client.rpc("commit_creation_draft",{...packet,p_body:{...packet.p_body,
    payload:{...payload,balanceExtras:[{...entries[0],quantity:"3"}]}}});
  assert.equal(divergent.error?.code,"PT409");
  const catalogue = await f.pro.client.rpc("create_supply_document", {p_patient:f.patient,p_type:"BAL",p_key:randomUUID(),p_draft:false,
    p_payload:{...payload,balanceExtras:[extra("material fictício v4 0")]}});
  assert.match(catalogue.error?.message,/extra matches patient catalogue/);
  assert.equal(sql(`select count(*) from public.operational_documents where care_recipient_id=${q(f.patient)} and type='BAL'`),"0");
  const committed = await rpc(f.pro.client,"commit_creation_draft",packet);
  assert.deepEqual(committed.result.payload.balanceExtras,entries);
  assert.equal((await rpc(f.pro.client,"commit_creation_draft",packet)).replayed,true);
  assert.equal(sql(`select count(*) from public.document_lines where document_id=${q(committed.result.id)}`),String(lines.length));
  assert.equal(ledger(),before);
});

test("recount requires previous identities, moves incorporated extras into the catalogue and permits a chosen addition", async () => {
  const carried = extra("Espátula incorporada"), retained = extra("Ponteira sem cadastro");
  const f = await pendingRecount({ stableCurrentWindow:true, balanceExtras:[carried,retained] });
  const incorporated = await addProduct(f,carried.name), added = await addProduct(f,"Incluído na nova contagem"),
    untaken = await addProduct(f,"Cadastro posterior fora desta recontagem");
  const target = f.initial.targets.find(s=>s.id===f.assignment.shift_id);
  assert.ifError((await assignRecount(f.family,f,target)).error);
  const state = await workspace(f.pro.client,f.patient), assignment = state.eligibility.assignment;
  const ids = [...f.products,incorporated.product_id,added.product_id];
  const lines = ids.map(productId=>({productId,quantity:"0"}));
  const payload = {lines,balanceExtras:[{...retained,quantity:"1"}],balanceAssignment:{id:assignment.id,version:assignment.version,referenceRevision:state.referenceRevision}};
  const args = {p_id:f.document.id,p_payload:payload,p_key:randomUUID(),p_version:f.document.version,p_recount:true};
  for(const [input,message] of [
    [{...payload,lines:lines.slice(1)},/previous materials/],
    [{...payload,lines:lines.filter(x=>x.productId!==incorporated.product_id)},/incorporated extra/],
    [{...payload,balanceExtras:[]},/previous extras/],
  ]) {
    const rejected = await f.pro.client.rpc("revise_supply_document",{...args,p_payload:input});
    assert.match(rejected.error?.message,message);
  }
  const document = await rpc(f.pro.client,"revise_supply_document",args);
  assert.deepEqual(new Set(document.lines.map(line=>line.product_id)),new Set(ids));
  assert.ok(!document.lines.some(line=>line.product_id===untaken.product_id));
  assert.deepEqual(document.payload.balanceExtras,payload.balanceExtras);
  assert.equal(sql(`select count(*) from public.document_events where document_id=${q(document.id)} and action='bal.recount'`),"1");
  const prior = sql(`select body#>'{payload,balanceExtras}' from public.document_events where document_id=${q(document.id)} and action='bal.issued'`);
  assert.deepEqual(JSON.parse(prior),[carried,retained]);
});

test("off-shift BAL accepts the extras stage and recounts its prior items without newly added catalogue items", async () => {
  const carry = extra("Item avulso ainda sem cadastro"), incorporated = extra("Item avulso incorporado");
  const f = await legacyBalance({ balanceExtras: [carry, incorporated] });
  const priorVersion = f.document.version;
  const mapped = await addProduct(f, incorporated.name), unrelated = await addProduct(f, "Cadastro que ficou fora da recontagem");
  const stock = await rpc(f.admin, "balance_count_reference", { p_patient: f.patient });
  const lines = [...f.products, mapped.product_id].map(productId => ({ productId, quantity: "0" }));
  const extras = [{ ...carry, quantity: "1.5" }];
  const content = {
    counts: Object.fromEntries(lines.map(line => [line.productId, line.quantity])), observationTimes: {}, notes: "",
    materials: [], balanceExtras: [{ ...carry, quantity: "1,5" }], materialCategory: "higiene",
    context: { mode: "legacy", documentId: f.document.id, documentVersion: priorVersion, assignmentId: null, assignmentVersion: null, referenceRevision: stock.revision },
  };
  const command = { p_patient: f.patient, p_kind: "BAL", p_target: f.document.id, p_id: null,
    p_expected: null, p_key: randomUUID(), p_body: { action: "save", content, navigation: { version: 1, stage: "bal_extras" } } };
  await rpc(f.admin, "creation_draft_command", command);
  const draft = await rpc(f.admin, "creation_draft_context", { p_patient: f.patient, p_kind: "BAL", p_target: f.document.id });
  assert.deepEqual(draft.navigation, command.p_body.navigation);
  const payload = { lines, balanceExtras: extras, balanceReferenceRevision: stock.revision };
  const intent = { p_id: f.document.id, p_payload: payload, p_key: randomUUID(), p_version: priorVersion, p_recount: true };
  for (const [invalid, message] of [
    [{ ...payload, lines: lines.slice(1) }, /previous materials/],
    [{ ...payload, lines: lines.filter(line => line.productId !== mapped.product_id) }, /incorporated extra/],
    [{ ...payload, balanceExtras: [] }, /previous extras/],
  ]) assert.match((await f.admin.rpc("revise_supply_document", { ...intent, p_payload: invalid })).error?.message, message);
  const recounted = await rpc(f.admin, "revise_supply_document", intent);
  assert.deepEqual(new Set(recounted.lines.map(line => line.product_id)), new Set(lines.map(line => line.productId)));
  assert.ok(!recounted.lines.some(line => line.product_id === unrelated.product_id));
  assert.deepEqual(recounted.payload.balanceExtras, extras);
  assert.deepEqual(JSON.parse(sql(`select body#>'{payload,balanceExtras}' from public.document_events where document_id=${q(f.document.id)} and version=${priorVersion}`)), [carry, incorporated]);
});
