import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixtures, issue, rpc, setup } from "./v4-fixtures.mjs";
import {
  purchaseBalanceArrival,
  purchaseBalanceCommand,
  purchaseBalanceFixture,
} from "./purchase-entry-balance-fixtures.mjs";

const list = (f, target, extra = {}) => rpc(f.admin, "supply_source_options", {
  p_patient: f.patient, p_target: target, p_filter: "", p_search: "", p_page: 1, ...extra,
});
const familyStock = (f, product) => Number(sql(`select private.stock_quantity(${q(f.patient)},${q(product)},'FAMILY')`));

test("COM operational source is preserved independently of requisition line fulfillment", async () => {
  const f = await setup();
  const req = await issue(f.patient, [f.products[0]]);
  const [option] = (await list(f, "COM", { p_ids: [req.id] })).data;
  assert.equal(option.type, "REQ");
  assert.equal(option.materials.length, 1);
  assert.equal(option.materials[0].available, null);
  for (const filter of ["COM", "ENT", "BAL", "DEV"])
    assert.deepEqual((await list(f, "COM", { p_filter: filter })).data, []);
  const source = { documentId: req.id, general: true, productIds: [] };
  const packet = {
    p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
    p_payload: { origin: "purchase", lines: [{ productId: f.products[1], quantity: "3" }], sources: [source] },
  };
  const stock = familyStock(f, f.products[1]);
  const created = await rpc(f.admin, "create_supply_document", packet);
  assert.deepEqual(created.lines[0].requisitionItemIds, []);
  assert.deepEqual(created.originDocuments, [{ ...source, code: option.code, type: "REQ" }]);
  assert.equal(created.payload.sources, undefined);
  assert.equal(created.payload.sourceSet.length, 64);
  assert.equal((await rpc(f.admin, "create_supply_document", packet)).id, created.id);
  assert.equal(familyStock(f, f.products[1]), stock);
  const related = () => rpc(f.admin, "requisition_related_documents", { p_requisition: req.id });
  assert.deepEqual(await related(), [{ id: created.id, type: "COM", code: created.code, status: created.status }]);
  const changed = await f.admin.rpc("create_supply_document", {
    ...packet, p_payload: { ...packet.p_payload, sources: [] },
  });
  assert.equal(changed.error?.code, "23505");
  const forged = await f.admin.rpc("create_supply_document", {
    ...packet, p_key: randomUUID(), p_payload: { ...packet.p_payload, sources: [{ ...source, documentId: randomUUID() }] },
  });
  assert.equal(forged.error?.code, "42501");
  assert.equal(sql(`select count(*) from public.operational_documents where care_recipient_id=${q(f.patient)} and type='COM'`), "1");
  const draft = await rpc(f.admin, "create_supply_document", { ...packet, p_key: randomUUID(), p_draft: true });
  assert.equal((await related()).length, 1, "the linked draft stays private");
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled)
    values(${q(f.patient)},${q(fixtures.adminA.id)},'com.read',false)`);
  assert.deepEqual(await related(), []);
  sql(`delete from public.capability_overrides where care_recipient_id=${q(f.patient)}
    and subject_user=${q(fixtures.adminA.id)} and capability='com.read'`);
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled)
    values(${q(f.patient)},${q(fixtures.adminA.id)},'req.read',false)`);
  const denied = await f.admin.rpc("requisition_related_documents", { p_requisition: req.id });
  assert.equal(denied.error?.code, "42501");
  assert.deepEqual((await list(f, "COM", { p_ids: [req.id] })).data, []);
  const restricted = await rpc(f.admin, "operational_document", { p_id: created.id });
  assert.deepEqual(restricted.originDocuments, []);
  assert.ok(!JSON.stringify(restricted).includes(req.id));
  const revise = await f.admin.rpc("revise_supply_document", {
    p_id: draft.id, p_payload: { ...packet.p_payload, sources: [] }, p_key: randomUUID(), p_version: draft.version,
  });
  assert.equal(revise.error?.code, "42501");
  assert.equal((await rpc(f.admin, "operational_document", { p_id: draft.id })).payload.sourceSet, draft.payload.sourceSet);
});

test("ENT imports only approved COM arrivals within available family stock", async () => {
  const f = await purchaseBalanceFixture();
  const product = f.products[0];
  const line = f.document.lines.find((candidate) => candidate.product_id === product);
  const options = async () => (await list(f, "ENT", { p_ids: [f.document.id] })).data[0];
  assert.deepEqual((await options()).materials, []);
  const arrival = await purchaseBalanceArrival(f, f.document, [{ lineId: line.id, quantity: "5" }]);
  assert.deepEqual((await options()).materials, []);
  await purchaseBalanceCommand(f.admin, arrival.document, "validate_receipt", { receiptId: arrival.receipt.id });
  assert.deepEqual((await options()).materials, [{ lineId: line.id, productId: product, available: "5" }]);

  const retained = familyStock(f, product);
  if (retained > 2) sql(`insert into public.stock_movements (
    care_recipient_id,product_id,quantity,movement_type,performed_by,source_location,justification
  ) values (${q(f.patient)},${q(product)},${retained - 2},'adjustment',${q(fixtures.adminA.id)},'FAMILY','Fixture de consumo')`);
  assert.equal((await options()).materials[0].available, "2");
  const delivery = {
    p_patient: f.patient, p_type: "ENT", p_key: randomUUID(), p_draft: false,
    p_payload: {
      source: "FAMILY", destination: "CARE_TEAM", recipientId: fixtures.professional.id,
      recipientReason: "Escolha manual de recebedor fictício.",
      lines: [{ productId: product, quantity: "2" }],
      sources: [{ documentId: f.document.id, general: true, productIds: [product] }],
    },
  };
  sql(`insert into public.stock_movements (
    care_recipient_id,product_id,quantity,movement_type,performed_by,destination_location,justification
  ) values (${q(f.patient)},${q(product)},6,'adjustment',${q(fixtures.adminA.id)},'FAMILY','Crédito fictício independente')`);
  const exceedsSource = await f.admin.rpc("create_supply_document", {
    ...delivery, p_key: randomUUID(),
    p_payload: { ...delivery.p_payload, lines: [{ productId: product, quantity: "6" }] },
  });
  assert.equal(exceedsSource.error?.code, "PT409");
  assert.equal(exceedsSource.error?.message, "delivery exceeds approved source quantity");
  sql(`insert into public.stock_movements (
    care_recipient_id,product_id,quantity,movement_type,performed_by,source_location,justification
  ) values (${q(f.patient)},${q(product)},6,'adjustment',${q(fixtures.adminA.id)},'FAMILY','Baixa fictícia independente')`);
  const sent = await rpc(f.admin, "create_supply_document", delivery);
  assert.equal(familyStock(f, product), 0);
  assert.equal(sent.originDocuments[0].documentId, f.document.id);
  assert.deepEqual((await options()).materials, []);
  assert.equal((await rpc(f.admin, "create_supply_document", delivery)).id, sent.id);
  const stale = await f.admin.rpc("create_supply_document", { ...delivery, p_key: randomUUID() });
  assert.equal(stale.error?.code, "PT409");
  assert.equal(sql(`select count(*) from public.operational_documents where care_recipient_id=${q(f.patient)} and type='ENT'`), "1");
});
