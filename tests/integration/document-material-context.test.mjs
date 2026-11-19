import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { remainingNeedFixture, physicalState } from "./remaining-need-fixtures.mjs";
import { actor, fixtures, issue, rpc, setup } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { purchaseBalanceCommand, purchaseBalanceFacts, purchaseBalanceFixture } from "./purchase-entry-balance-fixtures.mjs";

const read = (client, document, lineId, section, options = {}) => rpc(client, "document_material_context", {
  p_document: document, p_line: lineId ?? null, p_section: section, p_page: 1, ...options,
});
const timeline = (client, document, line, page = 1) => read(client, document, line, "history", {
  p_include_decisions: true, p_page: page,
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

  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled)
    values (${q(patient)},${q(fixtures.professional.id)},'ent.read',false),
    (${q(patient)},${q(fixtures.professional.id)},'stock.family.read',false),
    (${q(patient)},${q(fixtures.professional.id)},'req.family_stock',false)`);
  const limited = await read(pro, source.id, line.id, "stock");
  assert.equal(limited.family, null);
  assert.equal(limited.team, "2");
  assert.ok((await read(pro, source.id, line.id, "links")).rows.every(row => row.id !== ent.id));
  assert.ok((await read(pro, source.id, line.id, "history")).rows.every(row => row.document?.id !== ent.id));
  assert.ok((await timeline(pro, source.id, line.id)).rows.every(row => row.document?.id !== ent.id && row.type !== "ent.receive"));
  const foreignPatient = await setup();
  const outsider = await actor("family", foreignPatient.patient);
  const wrongContext = await outsider.rpc("document_material_context", { p_document: source.id, p_line: line.id });
  assert.equal(wrongContext.error?.code, "42501");
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
