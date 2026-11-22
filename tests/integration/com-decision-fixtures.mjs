import { randomUUID } from "node:crypto";
import { setup, actor, rpc } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
export const decisionStages = {
  validate_receipt: "receipt_validation",
  reject_receipt: "receipt_rejection",
  close_expectation: "expectation_closure",
  cancel: "com_cancellation",
};
export const decisionReason = "Decisão operacional fictícia preservada";
export const send = (client, document, action, body, key = randomUUID()) =>
  rpc(client, "supply_document_command", {
    p_id: document.id,
    p_action: action,
    p_body: body,
    p_key: key,
    p_version: document.version,
  });
export async function decisionFixture(withReceipts = true) {
  const f = await setup(),
    family = await actor("family", f.patient);
  let document = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient,
    p_type: "COM",
    p_payload: {
      origin: "purchase",
      lines: [{ productId: f.products[0], quantity: "10" }],
    },
    p_key: randomUUID(),
    p_draft: false,
  });
  const receipts = [];
  if (withReceipts) {
    document = await send(family, document, "purchase", {
      lines: [{ lineId: document.lines[0].id, quantity: "4" }],
    });
    for (const quantity of ["1", "2"]) {
      const key = randomUUID();
      document = await send(
        family,
        document,
        "receive",
        { lines: [{ lineId: document.lines[0].id, quantity }] },
        key,
      );
      receipts.push(document.receipts.find((r) => r.submission_key === key));
    }
  }
  return {
    ...f,
    family,
    document,
    firstReceipt: receipts[0],
    secondReceipt: receipts[1],
  };
}
export function decisionPacket(f, purpose, fields = {}) {
  return {
    p_patient: f.patient,
    p_kind: "COM",
    p_purpose: purpose,
    p_target: f.document.id,
    p_id: null,
    p_expected: null,
    p_key: randomUUID(),
    p_body: {
      action: "save",
      content: {
        documentVersion: f.document.version,
        fields: {
          reason: decisionReason,
          ...(f.secondReceipt ? { receiptId: f.secondReceipt.id } : {}),
          ...(purpose === "close_expectation" ? { confirmed: "on" } : {}),
          ...fields,
        },
        divergentIds: [],
        materials: f.document.lines.map((l) => ({
          id: l.id,
          name: l.name_snapshot,
          unit: l.unit_snapshot,
          quantityDecimals: 0,
        })),
      },
      navigation: { version: 1, stage: decisionStages[purpose] },
    },
  };
}
export const decisionFacts = (f) =>
  sql(
    `select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(f.document.id)}),'lines',(select jsonb_agg(to_jsonb(l) order by id) from public.document_lines l where document_id=${sqlLiteral(f.document.id)}),'events',(select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where document_id=${sqlLiteral(f.document.id)}),'receipts',(select jsonb_agg(to_jsonb(r) order by id) from public.purchase_receipts r where document_id=${sqlLiteral(f.document.id)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}),'pdf',(select count(*) from private.pdf_issuances where document_id=${sqlLiteral(f.document.id)}));`,
  );
export const decisionBody = (f, purpose) =>
  purpose === "validate_receipt"
    ? { receiptId: f.secondReceipt.id }
    : purpose === "reject_receipt"
      ? { receiptId: f.secondReceipt.id, reason: decisionReason }
      : purpose === "close_expectation"
        ? { reason: decisionReason, confirmed: true }
        : { reason: decisionReason };
export const decisionCommit = (f, purpose, saved) => ({
  p_id: saved.id,
  p_expected: saved.revision,
  p_target: f.document.id,
  p_key: randomUUID(),
  p_body: {
    action: purpose,
    body: decisionBody(f, purpose),
    expectedVersion: f.document.version,
  },
});
