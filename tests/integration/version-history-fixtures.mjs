import { randomUUID } from "node:crypto";
import { setup, rpc, actor } from "./v4-fixtures.mjs";
import { shiftWorker } from "./shift-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

export const historyHashes = id => sql(`select jsonb_agg(jsonb_build_object('version',version,'hash',content_hash,'body',body) order by version) from public.document_events where document_id=${sqlLiteral(id)};`);
export async function versionHistoryFixture() {
  const f = await setup(), writer = await shiftWorker(f.patient, "admin");
  const oldName = "Autora fictícia preservada da aprovação " + writer.id.slice(0, 8), newName = "Nome posterior sem efeito no evento " + writer.id.slice(0, 8);
  sql(`update public.profiles set full_name=${sqlLiteral(oldName)},role='family',status='active' where id=${sqlLiteral(writer.id)};`);
  await rpc(writer.client, "select_active_context", { p_patient: f.patient });
  const creator = await actor("family", f.patient);
  let doc = await rpc(creator, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
    p_payload: { origin: "purchase", source: "FAMILY", notes: "Motivo preservado da compra.\nRessalva completa da época.", lines: [{ productId: f.products[0], quantity: "3" }] } });
  const initial = doc;
  doc = await rpc(writer.client, "supply_document_command", { p_id: doc.id, p_action: "approve", p_body: { lines: [{ lineId: doc.lines[0].id, quantity: "2" }], reason: "Aprovação parcial fictícia preservada no evento." }, p_key: randomUUID(), p_version: doc.version });
  const approved = doc;
  doc = await rpc(writer.client, "supply_document_command", { p_id: doc.id, p_action: "purchase", p_body: { lines: [{ lineId: doc.lines[0].id, quantity: "1" }] }, p_key: randomUUID(), p_version: doc.version });
  const oldProduct = doc.lines[0].name_snapshot, newProduct = "Nome posterior do catálogo " + randomUUID().slice(0, 8), hashes = historyHashes(doc.id);
  await rpc(f.admin, "admin_upsert_recipient_product", { p_care_recipient_id: f.patient, p_product_id: f.products[0], p_name: newProduct, p_category: doc.lines[0].category_snapshot, p_unit: doc.lines[0].unit_snapshot, p_aliases: [], p_is_active: true });
  sql(`update public.profiles set full_name=${sqlLiteral(newName)} where id=${sqlLiteral(writer.id)};
    update public.care_recipient_memberships set status='revoked' where user_id=${sqlLiteral(writer.id)} and care_recipient_id=${sqlLiteral(f.patient)};`);
  return { ...f, writer, doc, initial, approved, oldName, newName, oldProduct, newProduct, hashes };
}
