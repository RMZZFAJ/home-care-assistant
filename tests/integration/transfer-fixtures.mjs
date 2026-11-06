import { randomUUID } from "node:crypto";
import { setup, rpc } from "./v4-fixtures.mjs";
import { shiftWorker } from "./shift-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

export async function transferFixture({ quantity = "10" } = {}) {
  const f = await setup(),
    initiator = await shiftWorker(f.patient),
    counterparty = await shiftWorker(f.patient, "family"),
    recipient = await shiftWorker(f.patient, "family");
  sql(`update public.profiles set full_name='Juliana fictícia, iniciadora da transferência' where id=${sqlLiteral(initiator.id)};
    update public.profiles set full_name='Ana fictícia, contraparte da transferência' where id=${sqlLiteral(counterparty.id)};
    update public.profiles set full_name='Bruno fictício, recebedor físico' where id=${sqlLiteral(recipient.id)};
    insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(initiator.id)},'ent.create',true);`);
  const origin = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient,
    p_type: "ENT",
    p_key: randomUUID(),
    p_payload: {
      source: "FAMILY",
      destination: "CARE_TEAM",
      recipientId: initiator.id,
      recipientReason:
        "Entrega pessoal fictícia para formar a custódia de origem da transferência",
      lines: [{ productId: f.products[0], quantity }],
    },
  });
  await rpc(initiator.client, "supply_document_command", {
    p_id: origin.id,
    p_action: "receive",
    p_body: { divergences: [] },
    p_key: randomUUID(),
    p_version: origin.version,
  });
  const capabilities = await rpc(initiator.client, "patient_capabilities", {
    p_patient: f.patient,
  });
  if (
    capabilities["ent.create"] !== true ||
    capabilities["stock.family.read"] !== false
  )
    throw new Error(
      "Transfer fixture must use an explicitly enabled issuer without family stock read",
    );
  return { ...f, initiator, counterparty, recipient, origin };
}
export async function declareTransfer(
  f,
  {
    quantity = "5",
    key = randomUUID(),
    client = f.initiator.client,
    source = "CARE_TEAM",
    counterpartyId = f.counterparty.id,
    recipientId = f.recipient.id,
    originDocumentId = f.origin.id,
  } = {},
) {
  const context = await rpc(client, "transfer_preparation", {
    p_patient: f.patient,
    p_source: source,
  });
  const args = {
    p_patient: f.patient,
    p_key: key,
    p_body: {
      source,
      counterpartyId,
      recipientId,
      originDocumentId,
      referenceHash: context.referenceHash,
      reason:
        "Transferência física fictícia, com concordância e recebimento registrados separadamente",
      lines: [{ productId: f.products[0], quantity }],
    },
  };
  return {
    args,
    response: await client.rpc("create_transfer_declaration", args),
  };
}
export const transferCommand = (
  client,
  id,
  action,
  version,
  body = {},
  key = randomUUID(),
) =>
  client.rpc("transfer_command", {
    p_id: id,
    p_action: action,
    p_body: body,
    p_key: key,
    p_version: version,
  });
export const transferState = (f) =>
  sql(
    `select jsonb_build_object('ledger',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}),'documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${sqlLiteral(f.patient)}));`,
  );
export { rpc };
