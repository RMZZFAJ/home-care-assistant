import { randomUUID } from "node:crypto";
import { setup, actor, rpc, request, fixtures } from "./v4-fixtures.mjs";
import { balanceSetup, balanceCommand } from "./shift-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

export const fidelityLedger = patient => sql(`select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.stock_movements m where care_recipient_id=${sqlLiteral(patient)};`);
const command = (client, doc, action, body) => rpc(client, "supply_document_command", { p_id: doc.id, p_action: action, p_body: body, p_key: randomUUID(), p_version: doc.version });

export async function fidelityDeliveryFixture() {
  const f = await setup(), recipient = await actor("professional", f.patient), owner = await actor("family", f.patient);
  let doc = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "ENT", p_key: randomUUID(), p_draft: false,
    p_payload: { source: "FAMILY", destination: "CARE_TEAM", recipientId: fixtures.professional.id, recipientReason: "Recebedor fictício para fidelidade documental", lines: [{ productId: f.products[0], quantity: "3" }] } });
  const lineId = doc.lines[0].id;
  const note = "Lacre avariado no recebimento original; a nota deve sobreviver às resoluções.";
  doc = await command(recipient, doc, "receive", { divergences: [{ lineId, acceptedQuantity: "1", problem: "damaged", notes: note }] });
  const received = doc;
  doc = await command(recipient, doc, "resolve", { lineId, quantity: "1", resolution: "returned", reason: "Uma unidade avariada foi devolvida à origem." });
  const returned = doc;
  doc = await command(recipient, doc, "resolve", { lineId, quantity: "1", resolution: "missing", reason: "Outra unidade faltante foi conciliada sem inventar devolução." });
  return { ...f, owner, recipient, doc, lineId, note, versions: { received, returned, final: doc } };
}

export async function fidelityPurchaseFixture() {
  const f = await setup(), owner = await actor("family", f.patient);
  let doc = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
    p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "3" }] } });
  const lineId = doc.lines[0].id;
  doc = await command(owner, doc, "purchase", { lines: [{ lineId, quantity: "3" }] });
  const before = fidelityLedger(f.patient);
  doc = await command(owner, doc, "receive", { lines: [{ lineId, quantity: "1" }] });
  const rejectedId = doc.receipts[0].id;
  doc = await command(f.admin, doc, "reject_receipt", { receiptId: rejectedId, reason: "Registro de chegada rejeitado; não comprova entrada de material." });
  const afterRejection = fidelityLedger(f.patient);
  doc = await command(owner, doc, "receive", { lines: [{ lineId, quantity: "1" }] });
  const approvedId = doc.receipts.find(receipt => receipt.id !== rejectedId).id;
  doc = await command(f.admin, doc, "validate_receipt", { receiptId: approvedId });
  const afterValidation = fidelityLedger(f.patient);
  doc = await command(owner, doc, "receive", { lines: [{ lineId, quantity: "1" }] });
  const pendingId = doc.receipts.find(receipt => ![rejectedId, approvedId].includes(receipt.id)).id;
  return { ...f, owner, doc, lineId, rejectedId, approvedId, pendingId, before, afterRejection, afterValidation };
}

export async function fidelityRequisitionFixture() {
  const catalogue = [
    { name: "Gaze fictícia com identificação extensa para observar o zero sem inventar pedido", unit: "unidade" },
    { name: "Líquido fictício da precisão documental", unit: "mL" },
    { name: "Material fictício com desconhecimento explícito", unit: "unidade" },
    { name: "Material fictício sem observação preenchida", unit: "unidade" },
  ].map(value => ({ ...value, category: "higiene", aliases: [] }));
  const f = await setup({ catalogue: catalogue.filter((_, i) => i !== 1) }), pro = await actor("professional", f.patient), owner = await actor("family", f.patient);
  const fluid = await rpc(f.admin, "admin_upsert_recipient_product", { p_care_recipient_id: f.patient, p_product_id: null, p_name: catalogue[1].name, p_category: "higiene", p_unit: "mL", p_aliases: [], p_is_active: true });
  await rpc(f.admin, "configure_catalogue_unit", { p_patient: f.patient, p_product: fluid.product_id, p_unit: "mL", p_decimals: 6, p_barcode: null, p_presentation: null, p_base_quantity: null });
  f.products.splice(1, 0, fluid.product_id);
  const at = "2026-11-04T18:12:30Z";
  const modes = [["observed", "0"], ["observed", "1.234567"], ["unknown", null], ["unfilled", null]];
  const created = (await rpc(pro, "submit_requisition", { ...request(f.patient, f.products),
    p_lines: f.products.map((productId, i) => ({ productId, currentStock: modes[i][1], stockObservation: modes[i][0], stockObservationAt: at, urgent: i === 0 })),
    p_observations: ["Observação extensa fictícia preservada. ".repeat(15) + "FIM DA OBSERVAÇÃO REQ"],
  }))[0];
  const initial = await rpc(pro, "operational_document", { p_id: created.requisition_id });
  const items = await pro.from("requisition_items").select("id,product_id").eq("requisition_id", created.requisition_id);
  if (items.error) throw items.error;
  const selected = items.data.find(item => item.product_id === f.products[0]);
  let delivery = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "ENT", p_key: randomUUID(), p_draft: false,
    p_payload: { source: "FAMILY", destination: "CARE_TEAM", recipientId: fixtures.professional.id, recipientReason: "Atendimento parcial fictício explicitamente vinculado", lines: [{ requestFulfillment: "complete", productId: f.products[0], quantity: "1", requisitionItemIds: [selected.id] }] } });
  delivery = await command(pro, delivery, "receive", { divergences: [] });
  const doc = await rpc(pro, "operational_document", { p_id: created.requisition_id });
  return { ...f, pro, owner, doc, initial, items: items.data, at, delivery };
}

export async function fidelityBalanceInitialFixture() {
  const f = await balanceSetup(), owner = await actor("family", f.patient);
  const workspace = client => rpc(client, "balance_workspace", { p_patient: f.patient });
  const initial = await workspace(f.pro.client), assignment = initial.eligibility.assignment;
  const doc = await rpc(f.pro.client, "create_supply_document", { p_patient: f.patient, p_type: "BAL", p_key: randomUUID(), p_draft: false,
    p_payload: { notes: "Primeira contagem desta ficha, sem afirmar primeira contagem da residência.", lines: f.products.map(productId => ({ productId, quantity: "0" })), balanceAssignment: { id: assignment.id, version: assignment.version, referenceRevision: initial.referenceRevision } } });
  return { ...f, owner, doc, first: doc, originalAssignment: assignment };
}

export async function recountFidelityBalance(f) {
  const { owner, originalAssignment: assignment } = f;
  const workspace = client => rpc(client, "balance_workspace", { p_patient: f.patient });
  let { doc } = f;
  // Historical fixture only: represents an old-format approval row. No stock
  // credit or personal review is fabricated through a current product command.
  sql(`insert into public.bal_approvals(document_id,review_group,actor_id,count_version) values(${sqlLiteral(doc.id)},'supervisor',${sqlLiteral(fixtures.adminA.id)},1);`);
  doc = await rpc(owner, "operational_document", { p_id: doc.id });
  doc = await command(owner, doc, "approve", { group: "family", comment: "Parecer independente da primeira contagem preservada.", reviewReference: doc.balanceReview.referenceHash });
  const approved = doc;
  const source = await rpc(f.admin, "balance_recount_context", { p_id: doc.id });
  const targets = await workspace(f.admin), target = targets.targets.find(row => row.id === assignment.shift_id);
  await balanceCommand(f.admin, f.patient, "assign_recount", { documentId: doc.id, targetShiftId: target.id, targetShiftVersion: target.version, referenceHash: source.referenceHash, reason: "Reconto atual para separar aprovação antiga de contagem nova." }, doc.version);
  const ready = await workspace(f.pro.client), recount = ready.eligibility.assignment;
  doc = await rpc(f.pro.client, "revise_supply_document", { p_id: doc.id, p_key: randomUUID(), p_version: doc.version, p_recount: true,
    p_payload: { notes: "Nova contagem física com autoria e política próprias.", lines: f.products.map(productId => ({ productId, quantity: "1" })), balanceAssignment: { id: recount.id, version: recount.version, referenceRevision: ready.referenceRevision } } });
  return { ...f, owner, doc, approved, syntheticLegacyApproval: true };
}

export async function fidelityBalanceFixture() {
  return recountFidelityBalance(await fidelityBalanceInitialFixture());
}
