import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { setup, actor, rpc, fixtures, env } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits, whileRowWaits } from "./lock-barrier.mjs";

const body = { reason: "Expectativa remanescente fictícia dispensada pela família", confirmed: true };
const view = (client, id) => rpc(client, "operational_document", { p_id: id });
const command = (client, document, action, value, key = randomUUID()) => rpc(client, "supply_document_command", { p_id: document.id, p_action: action, p_body: value, p_key: key, p_version: document.version });
const evidence = id => sql(`select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(id)}),'lines',(select jsonb_agg(to_jsonb(l) order by id) from public.document_lines l where document_id=${sqlLiteral(id)}),'events',(select jsonb_agg(to_jsonb(e) order by version) from public.document_events e where document_id=${sqlLiteral(id)}),'receipts',(select jsonb_agg(to_jsonb(r) order by id) from public.purchase_receipts r where document_id=${sqlLiteral(id)}));`);
const ledger = patient => sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(patient)};`);
const credit = patient => sql(`select coalesce(sum(quantity),0)::text from public.stock_movements where care_recipient_id=${sqlLiteral(patient)} and reference_type='purchase_receipt';`);
async function purchased(amount = "2", origin = "purchase") {
  const f = await setup(), family = await actor("family", f.patient);
  let document = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_payload: { origin, lines: [{ productId: f.products[0], quantity: "10" }] }, p_key: randomUUID(), p_draft: false });
  document = await command(family, document, "purchase", { lines: [{ lineId: document.lines[0].id, quantity: amount }] });
  return { ...f, family, document };
}
async function arrival(f, amount = "2", client = f.family) {
  const key = randomUUID(), document = await command(client, f.document, "receive", { lines: [{ lineId: f.document.lines[0].id, quantity: amount }] }, key);
  const receipt = document.receipts.find(receipt => receipt.submission_key === key);
  assert.ok(receipt, "The arrival must have an explicit causal receipt identity");
  return { document, receipt, key };
}
function decisionEvent(id, action) {
  return JSON.parse(sql(`select body from public.document_events where document_id=${sqlLiteral(id)} and action=${sqlLiteral(action)} order by version desc limit 1;`));
}

test("COM immediate validation respects an explicitly denied validation capability", async () => {
  const f = await purchased();
  sql(`insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${sqlLiteral(f.patient)},'com.validate',${sqlLiteral(fixtures.adminA.id)},false);`);
  assert.equal(sql(`select private.member_can(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.adminA.id)},'com.validate');`), "f");
  const initial = ledger(f.patient), result = await arrival(f, "2", f.admin);
  assert.equal(result.receipt.state, "pending"); assert.equal(Number(result.document.lines[0].accepted_quantity), 0); assert.equal(ledger(f.patient), initial);
});

test("COM implicit approval respects a denied approval capability on both new emission and draft submission", async () => {
  const f = await setup();
  sql(`insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${sqlLiteral(f.patient)},'com.approve',${sqlLiteral(fixtures.adminA.id)},false);`);
  assert.equal(sql(`select private.member_can(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.adminA.id)},'com.approve');`), "f");
  for (const p_draft of [false, true]) {
    let document = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "10" }] }, p_key: randomUUID(), p_draft });
    if (p_draft) document = await command(f.admin, document, "submit", {});
    assert.equal(document.status, "pending_approval"); assert.equal(Number(document.lines[0].approved_quantity), 0);
  }
});

test("COM receipt rejection rechecks its validation capability after the observed receipt row wait", async () => {
  const f = await purchased(), arrived = await arrival(f), before = evidence(arrived.document.id), stock = ledger(f.patient);
  sql(`insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${sqlLiteral(f.patient)},'com.validate',${sqlLiteral(fixtures.adminA.id)},true);`);
  const response = await whileRowWaits("purchase_receipts", arrived.receipt.id, "supply_document_command",
    () => f.admin.rpc("supply_document_command", { p_id: arrived.document.id, p_action: "reject_receipt", p_body: { receiptId: arrived.receipt.id, reason: "Decisão não pode sobreviver à revogação de sua permissão" }, p_key: randomUUID(), p_version: arrived.document.version }),
    async () => { sql(`update public.capability_overrides set enabled=false where care_recipient_id=${sqlLiteral(f.patient)} and capability='com.validate' and subject_user=${sqlLiteral(fixtures.adminA.id)};`); });
  assert.deepEqual({ code: response.error?.code ?? null, unchanged: evidence(arrived.document.id) === before, stock: ledger(f.patient) === stock }, { code: "42501", unchanged: true, stock: true });
});

test("COM creation rechecks its creation capability after the observed catalogue FK wait", async () => {
  const f = await setup(), key = randomUUID(), stock = ledger(f.patient);
  sql(`insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${sqlLiteral(f.patient)},'com.create',${sqlLiteral(fixtures.adminA.id)},true);`);
  const response = await whileRowWaits("catalogue", { patient: f.patient, product: f.products[0] }, "create_supply_document",
    () => f.admin.rpc("create_supply_document", { p_patient: f.patient, p_type: "COM", p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "10" }] }, p_key: key, p_draft: false }),
    async () => { sql(`update public.capability_overrides set enabled=false where care_recipient_id=${sqlLiteral(f.patient)} and capability='com.create' and subject_user=${sqlLiteral(fixtures.adminA.id)};`); });
  assert.deepEqual({ code: response.error?.code ?? null, documents: Number(sql(`select count(*) from public.operational_documents where care_recipient_id=${sqlLiteral(f.patient)} and idempotency_key=${sqlLiteral(key)};`)), stock: ledger(f.patient) === stock }, { code: "42501", documents: 0, stock: true });
});

test("COM closes 10 as 2 validated plus 8 waived with one concurrent intention and no invented stock", async () => {
  const f = await purchased(), result = await arrival(f, "2", f.admin), document = result.document;
  assert.equal(result.receipt.state, "approved"); assert.ok(result.receipt.submitted_name); assert.ok(result.receipt.validated_name);
  const initial = ledger(f.patient), key = randomUUID(), args = { p_id: document.id, p_action: "close_expectation", p_body: body, p_key: key, p_version: document.version };
  const unauthorized = await f.family.rpc("supply_document_command", args); assert.equal(unauthorized.error?.code, "42501");
  const [first, recovered] = await Promise.all([rpc(f.admin, "supply_document_command", args), rpc(f.admin, "supply_document_command", args)]);
  assert.equal(first.version, recovered.version); assert.equal(first.version, document.version + 1);
  assert.equal(first.status, "received"); assert.equal(first.purchaseProgress.state, "closed_below_quantity");
  const line = first.lines[0]; assert.equal(Number(line.quantity), 10); assert.equal(Number(line.approved_quantity), 10);
  assert.equal(Number(line.purchased_quantity), 2); assert.equal(Number(line.accepted_quantity), 2); assert.equal(Number(line.waived_quantity), 8);
  assert.equal(first.purchaseProgress.expectationPending, false); assert.equal(first.purchaseProgress.physicalPending, false);
  assert.equal(ledger(f.patient), initial); assert.equal(credit(f.patient), "2.000000");
  const event = decisionEvent(document.id, "com.close_expectation"); assert.deepEqual(event.event, body); assert.equal(event.purchaseProgress.closure.actorId, fixtures.adminA.id);
  assert.equal(event.purchaseReceipts[0].id, result.receipt.id); assert.equal(Number(event.purchaseProgress.lines[0].waivedQuantity), 8);
  assert.equal(first.events.filter(event => event.action === "com.close_expectation").length, 1);
  for (const [p_action, p_body] of [["purchase", { lines: [{ lineId: line.id, quantity: "8" }] }], ["cancel", { reason: "Não pode apagar fatos físicos nem o encerramento" }]]) {
    assert.ok((await f.admin.rpc("supply_document_command", { p_id: first.id, p_action, p_body, p_key: randomUUID(), p_version: first.version })).error);
  }
  assert.equal((await view(f.admin, document.id)).version, first.version); assert.equal(ledger(f.patient), initial);
});

test("COM closure permits an explicitly delegated family member and refuses professional/global identities without local authority", async () => {
  const f = await purchased(), arrived = await arrival(f), stock = ledger(f.patient), before = evidence(f.document.id);
  const pro = await actor("professional", f.patient);
  const args = { p_id: arrived.document.id, p_action: "close_expectation", p_body: body, p_key: randomUUID(), p_version: arrived.document.version };
  assert.equal((await pro.rpc("supply_document_command", args)).error?.code, "42501");
  sql(`delete from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.global.id)};`);
  const global = await actor("global"); assert.equal((await global.rpc("supply_document_command", args)).error?.code, "42501");
  assert.equal(evidence(f.document.id), before);
  sql(`insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${sqlLiteral(f.patient)},'com.close_expectation',${sqlLiteral(fixtures.family.id)},true);`);
  const closed = await command(f.family, arrived.document, "close_expectation", body);
  assert.equal(closed.purchaseProgress.state, "closed_pending_validation"); assert.equal(closed.purchaseProgress.closure.actorId, fixtures.family.id);
  assert.equal(Number(closed.lines[0].waived_quantity), 8); assert.equal(ledger(f.patient), stock);
});

test("COM expectation closure preserves a pending parcel; concurrent validation credits exactly its declared 2 once", async () => {
  const f = await purchased(), { document, receipt } = await arrival(f), initial = ledger(f.patient);
  assert.equal(receipt.state, "pending"); assert.equal(credit(f.patient), "0");
  const receiveEvent = decisionEvent(document.id, "com.receive"); assert.equal(receiveEvent.receiptId, receipt.id); assert.equal(receiveEvent.purchaseReceipt.id, receipt.id);
  assert.equal(Number(receiveEvent.purchaseReceipt.lines[0].quantity), 2);
  const closed = await command(f.admin, document, "close_expectation", body);
  assert.equal(closed.purchaseProgress.state, "closed_pending_validation"); assert.notEqual(closed.status, "received"); assert.equal(ledger(f.patient), initial);
  const before = evidence(document.id);
  for (const p_body of [{ receiptId: receipt.id, quantity: "8" }, { receiptId: receipt.id, lines: [{ lineId: closed.lines[0].id, quantity: "8" }] }]) {
    assert.equal((await f.admin.rpc("supply_document_command", { p_id: closed.id, p_action: "validate_receipt", p_body, p_key: randomUUID(), p_version: closed.version })).error?.code, "22023");
  }
  assert.equal(evidence(document.id), before); assert.equal(ledger(f.patient), initial);
  const attempts = [randomUUID(), randomUUID()].map(p_key => ({ p_id: closed.id, p_action: "validate_receipt", p_body: { receiptId: receipt.id }, p_key, p_version: closed.version }));
  const results = await Promise.all(attempts.map(args => f.admin.rpc("supply_document_command", args)));
  assert.equal(results.filter(result => !result.error).length, 1); assert.equal(results.filter(result => result.error).length, 1);
  const accepted = results.findIndex(result => !result.error); await rpc(f.admin, "supply_document_command", attempts[accepted]);
  const after = await view(f.admin, document.id); assert.equal(after.status, "received"); assert.equal(after.purchaseProgress.state, "closed_below_quantity");
  assert.equal(credit(f.patient), "2.000000"); const event = decisionEvent(document.id, "com.validate_receipt");
  assert.equal(event.receiptId, receipt.id); assert.equal(event.purchaseReceipt.state, "approved"); assert.equal(Number(event.purchaseReceipt.lines[0].quantity), 2);
});

test("COM rejection preserves the declared parcel and author; replacement arrival is distinct and closure never credits a rejected parcel", async () => {
  const f = await purchased("2", "donation"), { document, receipt } = await arrival(f), initial = ledger(f.patient);
  const closed = await command(f.admin, document, "close_expectation", body), before = evidence(document.id);
  for (const reason of [null, "", "x"]) assert.equal((await f.admin.rpc("supply_document_command", { p_id: closed.id, p_action: "reject_receipt", p_body: { receiptId: receipt.id, reason }, p_key: randomUUID(), p_version: closed.version })).error?.code, "22023");
  assert.equal(evidence(document.id), before);
  const rejected = await command(f.admin, closed, "reject_receipt", { receiptId: receipt.id, reason: "Parcela fictícia recusada após conferência" });
  assert.equal(rejected.purchaseProgress.state, "closed_pending_arrival"); assert.notEqual(rejected.status, "received"); assert.equal(ledger(f.patient), initial);
  const preserved = rejected.receipts.find(row => row.id === receipt.id);
  assert.deepEqual(preserved.lines, receipt.lines); assert.equal(preserved.submitted_by, receipt.submitted_by); assert.equal(preserved.submitted_name, receipt.submitted_name); assert.ok(preserved.validated_name);
  const event = decisionEvent(document.id, "com.reject_receipt"); assert.equal(event.receiptId, receipt.id); assert.equal(event.purchaseReceipt.state, "rejected");
  const replacement = await arrival({ ...f, document: rejected }); assert.notEqual(replacement.receipt.id, receipt.id);
  const validated = await command(f.admin, replacement.document, "validate_receipt", { receiptId: replacement.receipt.id });
  assert.equal(validated.purchaseProgress.state, "closed_below_quantity"); assert.equal(validated.receipts.length, 2); assert.equal(credit(f.patient), "2.000000");
  assert.equal(validated.receipts.find(row => row.id === receipt.id).state, "rejected");
});

test("COM multiple parcels keep their individual validation duties after the unacquired expectation is closed", async () => {
  const f = await purchased("3"), first = await arrival(f, "2"), second = await arrival({ ...f, document: first.document }, "1");
  const closed = await command(f.admin, second.document, "close_expectation", body);
  assert.equal(Number(closed.lines[0].waived_quantity), 7); assert.equal(closed.purchaseProgress.state, "closed_pending_validation");
  const one = await command(f.admin, closed, "validate_receipt", { receiptId: first.receipt.id });
  assert.equal(one.purchaseProgress.state, "closed_pending_validation"); assert.equal(credit(f.patient), "2.000000");
  const all = await command(f.admin, one, "validate_receipt", { receiptId: second.receipt.id });
  assert.equal(all.purchaseProgress.state, "closed_below_quantity"); assert.equal(credit(f.patient), "3.000000");
  assert.equal(all.receipts.filter(receipt => receipt.state === "approved").length, 2);
});

test("COM cannot waive acquired/unarrived material or cancel purchase/receipt facts and rejects a changed closure summary", async () => {
  const f = await purchased("10"), { document } = await arrival(f, "2", f.admin), initial = evidence(f.document.id), stock = ledger(f.patient);
  for (const [p_action, p_body] of [["close_expectation", body], ["cancel", { reason: "Não apagar aquisição e chegada já registradas" }]]) {
    assert.ok((await f.admin.rpc("supply_document_command", { p_id: document.id, p_action, p_body, p_key: randomUUID(), p_version: document.version })).error);
  }
  assert.equal(evidence(document.id), initial); assert.equal(ledger(f.patient), stock);
  const partial = await purchased(), pending = await arrival(partial), baseline = evidence(partial.document.id);
  for (const p_body of [{ ...body, confirmed: false }, { ...body, waivedQuantity: "8" }, { ...body, reason: null }])
    assert.equal((await partial.admin.rpc("supply_document_command", { p_id: pending.document.id, p_action: "close_expectation", p_body, p_key: randomUUID(), p_version: pending.document.version })).error?.code, "22023");
  assert.ok((await partial.admin.rpc("supply_document_command", { p_id: pending.document.id, p_action: "close_expectation", p_body: body, p_key: randomUUID(), p_version: pending.document.version - 1 })).error);
  assert.equal(evidence(partial.document.id), baseline);
});

for (const revocation of ["session", "capability", "context"]) test(`COM closure rechecks ${revocation} after its observed stock lock without dispensing or moving material`, async () => {
  const f = await purchased(), arrived = await arrival(f), other = revocation === "context" ? await setup() : null;
  sql(`insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${sqlLiteral(f.patient)},'com.close_expectation',${sqlLiteral(fixtures.family.id)},true);`);
  const family = await actor("family", f.patient), token = (await family.auth.getSession()).data.session.access_token;
  const stale = createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: "Bearer " + token } } });
  const before = evidence(arrived.document.id), stock = ledger(f.patient);
  const response = await whileAdvisoryWaits("stock:" + f.patient,
    () => stale.rpc("supply_document_command", { p_id: arrived.document.id, p_action: "close_expectation", p_body: body, p_key: randomUUID(), p_version: arrived.document.version }),
    async () => {
      if (revocation === "session") assert.ifError((await family.auth.signOut({ scope: "local" })).error);
      else if (revocation === "capability") sql(`update public.capability_overrides set enabled=false where care_recipient_id=${sqlLiteral(f.patient)} and capability='com.close_expectation' and subject_user=${sqlLiteral(fixtures.family.id)};`);
      else await rpc(family, "select_active_context", { p_patient: other.patient });
    });
  assert.equal(response.error?.code, "42501"); assert.equal(evidence(arrived.document.id), before); assert.equal(ledger(f.patient), stock);
});
