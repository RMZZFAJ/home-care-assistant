import { randomUUID } from "node:crypto";
import { transferFixture, rpc } from "./transfer-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

export async function catalogueIdentityFixture() {
  const f = await transferFixture({ quantity: "4" });
  await rpc(f.admin, "family_stock_movement", {
    p_patient: f.patient,
    p_product: f.products[0],
    p_quantity: "22",
    p_action: "outbound",
    p_reason:
      "Retirada física fictícia para conservar quatro unidades em cada custódia",
    p_key: randomUUID(),
  });
  const successor = await rpc(f.admin, "admin_upsert_recipient_product", {
    p_care_recipient_id: f.patient,
    p_product_id: null,
      p_name: "Material fictício V4 A solução",
    p_category: "higiene",
    p_unit: "mL",
    p_aliases: ["Solução futura fictícia"],
    p_is_active: true,
  });
  await rpc(f.admin, "configure_catalogue_unit", {
    p_patient: f.patient,
    p_product: successor.product_id,
    p_unit: "mL",
    p_decimals: 1,
    p_barcode: null,
    p_presentation: null,
    p_base_quantity: null,
  });
  await rpc(f.admin, "family_stock_movement", {
    p_patient: f.patient,
    p_product: successor.product_id,
    p_quantity: "9.5",
    p_action: "inbound",
    p_reason:
      "Saldo próprio do material de outra unidade, sem conversão da identidade antiga",
    p_key: randomUUID(),
  });
  return { ...f, successorId: successor.product_id };
}
export const identityContext = (f, successor = null, client = f.admin) =>
  rpc(client, "catalogue_identity_context", {
    p_patient: f.patient,
    p_product: f.products[0],
    p_successor: successor,
    p_page: 1,
  });
export async function identityPacket(
  f,
  { successor = null, action = "retire", client = f.admin } = {},
) {
  const context = await identityContext(f, successor, client);
  return {
    p_patient: f.patient,
    p_product: f.products[0],
    p_successor: successor,
    p_reference: context.referenceHash,
    p_body: {
      action,
      reason:
        "Escolha própria de cadastro; saldos e fatos anteriores continuam separados",
    },
    p_key: randomUUID(),
  };
}
export const identityPhysicalState = (f) =>
  sql(`select jsonb_build_object(
  'ledger',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}),
  'documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${sqlLiteral(f.patient)}),
  'lines',(select jsonb_agg(to_jsonb(l) order by l.id) from public.document_lines l join public.operational_documents d on d.id=l.document_id where d.care_recipient_id=${sqlLiteral(f.patient)}),
  'events',(select jsonb_agg(to_jsonb(e) order by e.id) from public.document_events e join public.operational_documents d on d.id=e.document_id where d.care_recipient_id=${sqlLiteral(f.patient)}));`);
export const identityState = (f) =>
  sql(`select jsonb_build_object(
  'catalogue',(select jsonb_agg(to_jsonb(c) order by product_id) from public.care_recipient_products c where care_recipient_id=${sqlLiteral(f.patient)}),
  'guidance',(select jsonb_agg(to_jsonb(g) order by product_id) from public.catalogue_successors g where care_recipient_id=${sqlLiteral(f.patient)}),
  'events',(select jsonb_agg(to_jsonb(e) order by id) from public.catalogue_identity_events e where care_recipient_id=${sqlLiteral(f.patient)}),
  'commands',(select jsonb_agg(to_jsonb(c) order by idempotency_key) from private.catalogue_identity_commands c where care_recipient_id=${sqlLiteral(f.patient)}));`);
export { rpc };
