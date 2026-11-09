import { randomUUID } from "node:crypto";
import { transferFixture, rpc } from "./transfer-fixtures.mjs";
import { draftDevice } from "./private-draft-fixtures.mjs";
import { fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
export const declarationPurposes = {
  FAMILY: "transfer_declare_family",
  CARE_TEAM: "transfer_declare_team",
};
export const declarationRawReason =
  "\uFEFF\n Declaração própria preservada,sem expedição\u00A0\t";
export async function declarationDraftFixture(source = "CARE_TEAM") {
  const f = await transferFixture();
  const reference = await rpc(f.admin, "transfer_preparation", {
    p_patient: f.patient,
    p_source: source,
  });
  const counterpartyId =
    source === "FAMILY" ? f.initiator.id : f.counterparty.id;
  const recipientId = source === "FAMILY" ? f.initiator.id : f.recipient.id;
  return {
    ...f,
    source,
    purpose: declarationPurposes[source],
    reference,
    client: f.admin,
    writerId: fixtures.adminA.id,
    counterpartyId,
    recipientId,
    originId: source === "CARE_TEAM" ? f.origin.id : null,
  };
}
export const declarationPeer = (f) => draftDevice(f.patient, "adminA");
export const declarationPacket = (f) => ({
  p_patient: f.patient,
  p_kind: "ENT",
  p_purpose: f.purpose,
  p_target: null,
  p_id: null,
  p_expected: null,
  p_key: randomUUID(),
  p_body: {
    action: "save",
    navigation: { version: 1, stage: "ent_transfer_declaration" },
    content: {
      documentVersion: null,
      divergentIds: [],
      fields: {
        source: f.source,
        referenceHash: f.reference.referenceHash,
        counterpartyId: f.counterpartyId,
        counterpartyLabel: "Nome escolhido preservado",
        recipientId: f.recipientId,
        recipientLabel: "Recebedor preservado",
        originId: f.originId ?? "",
        originLabel: f.originId ? "ENT de origem preservada" : "",
        reason: declarationRawReason,
        query: "Busca própria preservada",
        [f.products[0] + ":transferQuantity"]: "0002,0000000000",
      },
      materials: [
        {
          id: f.products[0],
          name: f.reference.products.find((p) => p.id === f.products[0]).name,
          unit: f.reference.products.find((p) => p.id === f.products[0]).unit,
          quantityDecimals: 0,
        },
      ],
    },
  },
});
export const declarationBody = (f) => ({
  source: f.source,
  counterpartyId: f.counterpartyId,
  recipientId: f.recipientId,
  originDocumentId: f.originId,
  referenceHash: f.reference.referenceHash,
  reason: declarationRawReason.trim(),
  lines: [{ productId: f.products[0], quantity: "2" }],
});
export const declarationCommit = (f, saved, body = declarationBody(f)) => ({
  p_id: saved.id,
  p_expected: saved.revision,
  p_target: null,
  p_key: randomUUID(),
  p_body: { action: "declare_transfer", body },
});
export const declarationRead = (client, f) =>
  rpc(client, "supply_draft_context", {
    p_patient: f.patient,
    p_kind: "ENT",
    p_purpose: f.purpose,
    p_target: null,
  });
export const declarationFacts = (f) =>
  sql(
    "select jsonb_build_object('documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=" +
      q(f.patient) +
      "),'events',(select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where e.care_recipient_id=" +
      q(f.patient) +
      "),'ledger',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where m.care_recipient_id=" +
      q(f.patient) +
      "),'transfers',(select jsonb_agg(to_jsonb(t) order by document_id) from public.ent_transfers t where t.care_recipient_id=" +
      q(f.patient) +
      "));",
  );
