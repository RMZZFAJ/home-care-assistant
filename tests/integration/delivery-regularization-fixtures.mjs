import { randomUUID } from "node:crypto";
import { setup, actor, rpc, fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

export async function unavailableDelivery({
  revoke = true,
  cancellation = false,
  quantity = "3",
  completeReceipt = false,
} = {}) {
  const f = await setup(),
    professional = await actor("professional", f.patient);
  let document = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient,
    p_type: "ENT",
    p_payload: {
      source: "FAMILY",
      destination: "CARE_TEAM",
      recipientId: fixtures.professional.id,
      recipientReason: "Pessoa vinculada receberá a entrega fictícia",
      lines: [{ productId: f.products[0], quantity }],
    },
    p_key: randomUUID(),
    p_draft: false,
  });
  document = await rpc(professional, "supply_document_command", {
    p_id: document.id,
    p_action: "receive",
    p_body: {
      divergences: completeReceipt
        ? []
        : [
            {
              lineId: document.lines[0].id,
              acceptedQuantity: "2",
              notes: "Uma unidade não foi confirmada pelo recebedor",
            },
          ],
    },
    p_key: randomUUID(),
    p_version: document.version,
  });
  if (cancellation)
    document = await rpc(f.admin, "supply_document_command", {
      p_id: document.id,
      p_action: "cancel",
      p_body: { reason: "Solicitação fictícia anterior ao desligamento" },
      p_key: randomUUID(),
      p_version: document.version,
    });
  if (revoke)
    sql(
      `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.professional.id)};`,
    );
  return { ...f, professional, document };
}
