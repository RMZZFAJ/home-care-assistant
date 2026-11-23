import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { remainingNeedFixture, physicalState } from "./remaining-need-fixtures.mjs";
import { actor, fixtures, issue, rpc, setup } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { purchaseBalanceCommand, purchaseBalanceFacts, purchaseBalanceFixture } from "./purchase-entry-balance-fixtures.mjs";
import { shiftWorker } from "./shift-fixtures.mjs";

const read = (client, document, lineId, section, options = {}) => rpc(client, "document_material_context", {
  p_document: document, p_line: lineId ?? null, p_section: section, p_page: 1, ...options,
});
const timeline = (client, document, line, page = 1) => read(client, document, line, "history", {
  p_include_decisions: true, p_page: page,
});
const stockScope = (document, line) => ({
  p_patient: null, p_product: null, p_document: document, p_line: line, p_page: 1,
});

test("material context reads current balances and only authorized records for the selected physical line", async () => {
  const f = await remainingNeedFixture();
  const { patient, source, ent, pro } = f;
  const line = source.lines.find(item => item.product_id === f.products[0]);
  const otherLine = source.lines.find(item => item.product_id !== f.products[0]);
  const before = physicalState(f);
  const summary = await read(f.admin, source.id, null, "stock");
  assert.equal(summary.patientId, patient);
  assert.equal(summary.balances.length, 2);
  const available = summary.balances.find(row => row.lineId === line.id);
  assert.equal(available.productId, f.products[0]);
  assert.equal(available.family, "20");
  assert.equal(available.team, "2");

  const stock = await read(pro, source.id, line.id, "stock");
  assert.ok(stock.observations.some(row => row.documentId === source.id));
  const material = await rpc(pro, "material_stock_context", stockScope(source.id, line.id));
  assert.equal(material.productId, f.products[0]);
  assert.equal(Number(material.positions.team.confirmed), 2);
  assert.ok(Number(material.positions.team.disputed) > 0);
  const otherMaterial = await rpc(pro, "material_stock_context", stockScope(source.id, otherLine.id));
  assert.equal(Number(otherMaterial.positions.team.incoming), 0);
  const links = await read(pro, source.id, line.id, "links");
  assert.ok(links.rows.some(row => row.id === ent.id));
  const unrelatedLine = await read(pro, source.id, otherLine.id, "links");
  assert.equal(unrelatedLine.rows.some(row => row.id === ent.id), false);

  const history = await read(pro, source.id, line.id, "history");
  assert.ok(history.available);
  assert.ok(history.rows.some(row => row.document?.id === ent.id && row.destination === "CARE_TEAM"));
  const entries = await timeline(pro, source.id, line.id);
  assert.ok(entries.rows.some(row => row.type === "req.issued" && row.document?.id === source.id));
  assert.ok(entries.rows.some(row => row.type === "ent.receive" && row.kind === "decision" &&
    Number(row.quantity) === 2 && row.document?.id === ent.id));
  assert.ok(entries.rows.some(row => row.kind === "movement" && row.destination === "CARE_TEAM"));
  const crossLine = await pro.rpc("document_material_context", { p_document: source.id, p_line: ent.lines[0].id });
  assert.equal(crossLine.error?.code, "42501");
  assert.equal((await pro.rpc("material_stock_context", stockScope(source.id, ent.lines[0].id))).error?.code, "42501");

  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled)
    values (${q(patient)},${q(fixtures.professional.id)},'ent.read',false),
    (${q(patient)},${q(fixtures.professional.id)},'stock.family.read',false),
    (${q(patient)},${q(fixtures.professional.id)},'req.family_stock',false)`);
  const limited = await read(pro, source.id, line.id, "stock");
  assert.equal(limited.family, null);
  assert.equal(limited.team, "2");
  const restrictedMaterial = await rpc(pro, "material_stock_context", stockScope(source.id, line.id));
  assert.equal(restrictedMaterial.positions.family, null);
  assert.equal(restrictedMaterial.positions.transfersAvailable, false);
  assert.equal(Number(restrictedMaterial.positions.team.incoming), 0);
  assert.ok((await read(pro, source.id, line.id, "links")).rows.every(row => row.id !== ent.id));
  assert.ok((await read(pro, source.id, line.id, "history")).rows.every(row => row.document?.id !== ent.id));
  assert.ok((await timeline(pro, source.id, line.id)).rows.every(row => row.document?.id !== ent.id && row.type !== "ent.receive"));
  const foreignPatient = await setup();
  const outsider = await actor("family", foreignPatient.patient);
  const wrongContext = await outsider.rpc("document_material_context", { p_document: source.id, p_line: line.id });
  assert.equal(wrongContext.error?.code, "42501");
  assert.equal((await outsider.rpc("material_stock_context", stockScope(source.id, line.id))).error?.code, "42501");
  assert.equal(physicalState(f), before);
});

test("material decisions retain the frozen arrival quantity and actor, independently from stock permission", async () => {
  const f = await purchaseBalanceFixture();
  const [line, other] = f.document.lines;
  const originalLine = { lineId: line.id, quantity: "4", expectedQuantity: "6", remainingAction: "wait" };
  const declaration = await purchaseBalanceCommand(f.family, f.document, "receive", { lines: [originalLine] });
  const [receipt] = declaration.receipts;
  const reason = "Confira as unidades de cada embalagem.";
  const requested = await purchaseBalanceCommand(f.admin, declaration, "request_receipt_correction", { receiptId: receipt.id, reason });
  const resubmitted = await purchaseBalanceCommand(f.family, requested, "resubmit_receipt", {
    receiptId: receipt.id, lines: [{ ...originalLine, quantity: "5" }],
  });
  await purchaseBalanceCommand(f.admin, resubmitted, "validate_receipt", { receiptId: receipt.id });
  const { result: arrival } = await rpc(f.family, "unlinked_arrival_command", {
    p_patient: f.patient, p_key: randomUUID(),
    p_body: { origin: "gift", lines: [{ productId: line.product_id, quantity: "2" }] },
  });
  const pro = await actor("professional", f.patient);
  const req = await issue(f.patient, [line.product_id]);
  const before = purchaseBalanceFacts(f);
  const history = await timeline(f.family, f.document.id, line.id);
  const onlyDecisions = history.rows.filter(row => row.kind === "decision");
  const decision = type => onlyDecisions.find(row => row.type === type);
  assert.equal(Number(decision("com.receive").quantity), 4);
  assert.equal(Number(decision("com.request_receipt_correction").quantity), 4);
  assert.equal(decision("com.request_receipt_correction").reason, reason);
  assert.equal(decision("com.request_receipt_correction").author, requested.receipts[0].corrections[0].requesterName);
  assert.equal(Number(decision("com.resubmit_receipt").quantity), 5);
  assert.equal(Number(decision("com.validate_receipt").quantity), 5);
  assert.equal(decision("arrival.reported").arrival.id, arrival.id);
  assert.equal(decision("arrival.reported").author, arrival.author);
  assert.ok(history.rows.some(row => row.kind === "movement" && Number(row.quantity) === 5 && row.document?.id === f.document.id));
  assert.ok(history.rows.every((row, index, rows) => index === 0 ||
    Date.parse(rows[index - 1].createdAt) >= Date.parse(row.createdAt)));
  const otherMaterial = await timeline(f.family, f.document.id, other.id);
  assert.ok(otherMaterial.rows.every(row => row.arrival === null && !row.type.includes("receive")));
  const nextPage = await timeline(f.family, f.document.id, line.id, 2);
  assert.equal(nextPage.total, history.total);
  assert.deepEqual(nextPage.rows, []);

  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled)
    values (${q(f.patient)},${q(fixtures.family.id)},'stock.family.read',false),
    (${q(f.patient)},${q(fixtures.family.id)},'stock.team.read',false)`);
  const filtered = await timeline(f.family, f.document.id, line.id);
  assert.equal(filtered.available, false);
  assert.deepEqual(filtered.rows, onlyDecisions);
  const professional = await timeline(pro, req.id, req.lines[0].id);
  assert.ok(professional.rows.every(row => row.arrival === null && !row.type.startsWith("arrival.")));
  assert.equal(purchaseBalanceFacts(f), before);
});

test("material history applies the same visibility as the individual unlinked arrival", async () => {
  const f = await setup();
  const [productId] = f.products;
  const req = await issue(f.patient, [productId]);
  const family = await actor("family", f.patient);
  const other = await shiftWorker(f.patient, "family");
  const register = async (client, quantity) => (await rpc(client, "unlinked_arrival_command", {
    p_patient: f.patient, p_key: randomUUID(),
    p_body: { origin: "gift", lines: [{ productId, quantity }] },
  })).result;
  const pending = await register(family, "2");
  const approved = await register(f.admin, "3");
  const history = client => timeline(client, req.id, req.lines[0].id);
  const containsArrival = (rows, arrival) => rows.some(row => row.arrival?.id === arrival.id || row.id.startsWith(arrival.id + ":"));
  assert.equal((await other.client.rpc("read_unlinked_arrivals", { p_patient: f.patient, p_id: pending.id })).error?.code, "42501");
  assert.equal((await rpc(other.client, "read_unlinked_arrivals", { p_patient: f.patient, p_id: approved.id })).id, approved.id);
  const owner = await history(family);
  const reviewer = await history(f.admin);
  const anotherFamily = await history(other.client);
  assert.ok(containsArrival(owner.rows, pending));
  assert.ok(containsArrival(reviewer.rows, pending));
  assert.ok(!containsArrival(anotherFamily.rows, pending));
  assert.equal(anotherFamily.total, owner.total - 1);
  assert.ok(containsArrival(anotherFamily.rows, approved));

  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled)
    values (${q(f.patient)},${q(other.id)},'stock.family.read',false)`);
  assert.equal((await other.client.rpc("read_unlinked_arrivals", { p_patient: f.patient, p_id: approved.id })).error?.code, "42501");
  assert.ok(!containsArrival((await history(other.client)).rows, approved));
});

test("catalogue consultation works before a document exists and respects patient, product and custody boundaries", async () => {
  const f = await remainingNeedFixture();
  const before = physicalState(f);
  const [productId, otherProduct] = f.products;
  const consult = (client, product, section) => rpc(client, "catalogue_material_context", {
    p_patient: f.patient, p_product: product, p_section: section,
  });
  const balances = await consult(f.pro, productId, "stock");
  assert.equal(balances.documentId, null);
  assert.equal(balances.lineId, null);
  assert.equal(balances.team, "2");
  assert.ok(balances.observations.some(row => row.documentId === f.source.id));
  const history = await consult(f.pro, productId, "history");
  assert.ok(history.rows.some(row => row.type === "ent.receive" && row.document?.id === f.ent.id));
  assert.deepEqual(new Set((await consult(f.pro, productId, "links")).rows.map(row => row.id)),
    new Set([f.source.id, f.ent.id]));
  assert.ok((await consult(f.pro, otherProduct, "links")).rows.every(row => row.id !== f.ent.id));
  const otherPatient = await setup();
  const wrongContext = await actor("reader", otherPatient.patient);
  for (const [client, patient, product] of [
    [wrongContext, f.patient, productId], [f.pro, f.patient, "material-inexistente"],
  ]) {
    const response = await client.rpc("catalogue_material_context", { p_patient: patient, p_product: product });
    assert.equal(response.error?.code, "42501");
  }
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled)
    values (${q(f.patient)},${q(fixtures.professional.id)},'stock.family.read',false),
    (${q(f.patient)},${q(fixtures.professional.id)},'stock.team.read',false),
    (${q(f.patient)},${q(fixtures.professional.id)},'ent.read',false)`);
  const limited = await consult(f.pro, productId, "stock");
  assert.equal(limited.family, null);
  assert.equal(limited.team, null);
  assert.ok((await consult(f.pro, productId, "history")).rows.every(row => row.kind === "decision" && row.document?.id !== f.ent.id));
  assert.ok((await consult(f.pro, productId, "links")).rows.every(row => row.id !== f.ent.id));
  assert.equal(physicalState(f), before);
});
