import assert from "node:assert/strict";
import { test } from "node:test";
import { remainingNeedFixture, physicalState } from "./remaining-need-fixtures.mjs";
import { actor, fixtures, rpc, setup } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

test("material context reads current balances and only authorized records for the selected physical line", async () => {
  const f = await remainingNeedFixture();
  const { patient, source, ent, pro } = f;
  const line = source.lines.find(item => item.product_id === f.products[0]);
  const otherLine = source.lines.find(item => item.product_id !== f.products[0]);
  const before = physicalState(f);
  const read = (client, document, lineId, section) => rpc(client, "document_material_context", {
    p_document: document, p_line: lineId ?? null, p_section: section, p_page: 1,
  });
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
  const foreignPatient = await setup();
  const outsider = await actor("family", foreignPatient.patient);
  const wrongContext = await outsider.rpc("document_material_context", { p_document: source.id, p_line: line.id });
  assert.equal(wrongContext.error?.code, "42501");
  assert.equal(physicalState(f), before);
});
