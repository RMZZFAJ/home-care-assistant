import { randomUUID } from "node:crypto";
import { rpc } from "./v4-fixtures.mjs";
import {
  entOperationFixture,
  entPacket,
  entSend,
  entReason,
} from "./ent-operation-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

export async function addConsentConsumption(f, quantity = "1") {
  const id = await rpc(f.pro, "report_extraordinary_consumption", {
    p_patient: f.patient,
    p_kind: "consumption",
    p_location: "CARE_TEAM",
    p_text: "Consumo fictício confirmado para comparar referências privadas",
    p_lines: f.products.map((productId) => ({ productId, quantity })),
    p_key: randomUUID(),
  });
  await rpc(f.admin, "decide_consumption_report", {
    p_id: id,
    p_accept: true,
    p_reason: null,
    p_key: randomUUID(),
    p_version: 1,
  });
  return rpc(f.pro, "operational_document", { p_id: f.document.id });
}
export async function consentFixture() {
  const f = await entOperationFixture("accepted");
  await addConsentConsumption(f);
  f.document = await entSend(f.admin, f.document, "cancel", {
    reason: "Pedido fictício após consumo confirmado",
  });
  return f;
}
export function consentPacket(f, returned = "2") {
  const packet = entPacket(f, "consent_cancel");
  packet.p_body.navigation = { version: 1, stage: "ent_cancellation_consent" };
  packet.p_body.content.fields = {
    reason: entReason,
    requestId: f.document.deliveryCancellation.request.id,
    requestLabel: f.document.deliveryCancellation.request.reason,
    referenceHash: f.document.deliveryCancellation.referenceHash,
    ...Object.fromEntries(
      f.document.lines.map((line) => [line.id + ":return", returned]),
    ),
  };
  return packet;
}
export function consentCommit(f, saved, returned = "2") {
  return {
    p_id: saved.id,
    p_expected: saved.revision,
    p_target: f.document.id,
    p_key: randomUUID(),
    p_body: {
      action: "consent_cancel",
      expectedVersion: f.document.version,
      body: {
        reason: entReason,
        requestId: f.document.deliveryCancellation.request.id,
        referenceHash: f.document.deliveryCancellation.referenceHash,
        lines: f.document.lines.map((line) => ({
          lineId: line.id,
          returnQuantity: returned,
        })),
      },
    },
  };
}
export const consentRead = (client, f) =>
  rpc(client, "supply_draft_context", {
    p_patient: f.patient,
    p_kind: "ENT",
    p_purpose: "consent_cancel",
    p_target: f.document.id,
  });
export const consentAllocations = (f) =>
  sql(
    `select coalesce(jsonb_agg(to_jsonb(a) order by id),'[]') from public.delivery_consumption_allocations a where document_id=${sqlLiteral(f.document.id)};`,
  );
