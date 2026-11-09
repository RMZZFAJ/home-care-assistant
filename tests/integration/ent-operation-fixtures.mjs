import { randomUUID } from "node:crypto";
import { setup, actor, rpc, fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
export const entStages = {
  reassign: "ent_reassignment",
  resolve: "ent_resolution",
  cancel: "ent_cancellation",
  refuse_cancellation: "ent_cancellation_refusal",
  withdraw_cancellation: "ent_cancellation_withdrawal",
};
export const entReason = "Decisão de entrega fictícia preservada";
export const entSend = (client, doc, action, body, key = randomUUID()) =>
  rpc(client, "supply_document_command", {
    p_id: doc.id,
    p_action: action,
    p_body: body,
    p_key: key,
    p_version: doc.version,
  });
export async function entOperationFixture(mode = "pending") {
  const f = await setup(),
    pro = await actor("professional", f.patient);
  let document = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient,
    p_type: "ENT",
    p_payload: {
      source: "FAMILY",
      destination: "CARE_TEAM",
      recipientId: fixtures.professional.id,
      recipientReason: "Recebedora fictícia indicada neste ensaio",
      lines: f.products.map((productId) => ({ productId, quantity: "3" })),
    },
    p_key: randomUUID(),
    p_draft: false,
  });
  if (mode !== "pending")
    document = await entSend(pro, document, "receive", {
      divergences:
        mode === "disputed"
          ? document.lines.map((l) => ({
              lineId: l.id,
              acceptedQuantity: "1",
              problem: "shortage",
              notes: "Quantidade física fictícia conferida",
            }))
          : [],
    });
  if (mode === "request")
    document = await entSend(f.admin, document, "cancel", {
      reason: "Pedido de cancelamento fictício inicial",
    });
  return { ...f, pro, document };
}
export function entPacket(f, purpose, fields = {}) {
  const line = f.document.lines[1],
    request = f.document.deliveryCancellation?.request;
  return {
    p_patient: f.patient,
    p_kind: "ENT",
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
          reason: entReason,
          recipientId: fixtures.global.id,
          recipientLabel: "Teste global",
          lineId: line.id,
          lineLabel: `${line.name_snapshot} · ${line.unit_snapshot}`,
          resolution: "returned",
          quantity: "1",
          ...(request
            ? { requestId: request.id, requestLabel: request.reason }
            : {}),
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
      navigation: { version: 1, stage: entStages[purpose] },
    },
  };
}
export const entFacts = (f) =>
  sql(
    `select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(f.document.id)}),'lines',(select jsonb_agg(to_jsonb(l) order by id) from public.document_lines l where document_id=${sqlLiteral(f.document.id)}),'events',(select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where document_id=${sqlLiteral(f.document.id)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}),'pdf',(select count(*) from private.pdf_issuances where document_id=${sqlLiteral(f.document.id)}));`,
  );
export const entBody = (f, purpose) =>
  purpose === "reassign"
    ? { recipientId: fixtures.global.id, reason: entReason }
    : purpose === "resolve"
      ? {
          lineId: f.document.lines[1].id,
          quantity: "1",
          resolution: "returned",
          reason: entReason,
        }
      : purpose === "refuse_cancellation" || purpose === "withdraw_cancellation"
        ? {
            requestId: f.document.deliveryCancellation.request.id,
            reason: entReason,
          }
        : { reason: entReason };
export const entCommit = (f, purpose, saved) => ({
  p_id: saved.id,
  p_expected: saved.revision,
  p_target: f.document.id,
  p_key: randomUUID(),
  p_body: {
    action: purpose,
    expectedVersion: f.document.version,
    body: entBody(f, purpose),
  },
});
