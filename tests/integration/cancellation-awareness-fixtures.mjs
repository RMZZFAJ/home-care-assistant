import { randomUUID } from "node:crypto";
import { setup, issue, actor, rpc, fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
export const awareness = (client, id) => rpc(client, "document_cancellation_awareness", { p_id: id });
export const awarenessFacts = id => sql(`select jsonb_build_object('payload',d.payload,'requisition',(select to_jsonb(r) from public.requisitions r where r.id=d.id),'requisitionItems',(select jsonb_agg(to_jsonb(i) order by id) from public.requisition_items i where requisition_id=d.id),'lines',(select jsonb_agg(to_jsonb(l) order by id) from public.document_lines l where document_id=d.id),'science',(select jsonb_agg(to_jsonb(s) order by id) from public.requisition_science_events s where requisition_id=d.id),'ledger',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=d.care_recipient_id)) from public.operational_documents d where d.id=${q(id)}`);
export async function cancellationFixture(type = "REQ") {
  const f = await setup(), family = await actor("family", f.patient);
  let d;
  if (type === "BAL") sql(`insert into public.patient_settings(care_recipient_id,settings) values(${q(f.patient)},'{"balReview":"required"}'::jsonb) on conflict(care_recipient_id) do update set settings=public.patient_settings.settings||'{"balReview":"required"}'::jsonb`);
  if (type === "REQ") {
    d = await issue(f.patient, [f.products[0]]);
    const p = await rpc(family, "requisition_progress", { p_id: d.id });
    await rpc(family, "acknowledge_requisition", { p_id: d.id, p_mode: "express", p_version: p.version, p_material_identity: p.materialIdentity });
  } else {
    d = await rpc(f.admin, "create_supply_document", {
      p_patient: f.patient, p_type: type, p_key: randomUUID(), p_draft: false,
      p_payload: type === "BAL" ? { lines: f.products.map(productId => ({ productId, quantity: "0" })), notes: "Contagem original preservada." }
        : { lines: [{ productId: f.products[0], quantity: "2" }], notes: "Conteúdo emitido original.",
          ...(type === "COM" ? { origin: "purchase" } : { source: "FAMILY", destination: "CARE_TEAM", recipientId: fixtures.professional.id, recipientReason: "Entrega pessoal controlada antes do cancelamento." }) },
    });
  }
  const beforeCancel = await rpc(family, "operational_document", { p_id: d.id });
  if (type === "REQ") await rpc(f.admin, "transition_requisition_status", { p_requisition_id: d.id, p_to_status: "cancelled", p_reason: "Cancelamento próprio, preservando as ciências anteriores." });
  else await rpc(f.admin, "supply_document_command", { p_id: d.id, p_action: "cancel", p_body: { reason: "Cancelamento próprio desta ficha emitida." }, p_version: beforeCancel.version, p_key: randomUUID() });
  return { ...f, family, document: await rpc(family, "operational_document", { p_id: d.id }), beforeCancel };
}
export { actor, rpc, fixtures };
