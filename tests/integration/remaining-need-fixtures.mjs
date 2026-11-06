import { randomUUID } from "node:crypto";
import {
  setup,
  actor,
  rpc,
  issue,
  delivery,
  fixtures,
} from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

export async function remainingNeedFixture() {
  const f = await setup(),
    pro = await actor("professional", f.patient);
  const source = await issue(f.patient, f.products);
  const ent = await delivery(f.patient, source, [f.products[0]]);
  await rpc(pro, "supply_document_command", {
    p_id: ent.id,
    p_action: "receive",
    p_body: {
      divergences: [{ lineId: ent.lines[0].id, acceptedQuantity: "2" }],
    },
    p_key: randomUUID(),
    p_version: ent.version,
  });
  const progress = await rpc(pro, "requisition_progress", { p_id: source.id });
  const sourceDoc = await rpc(pro, "operational_document", { p_id: source.id });
  return {
    ...f,
    pro,
    source,
    ent,
    sourceVersion: progress.version,
    sourceDoc: { ...sourceDoc, materialIdentity: progress.materialIdentity },
  };
}
export const remainingPacket = (f) => ({
  p_care_recipient_id: f.patient,
  p_idempotency_key: randomUUID(),
  p_source: f.source.id,
  p_source_version: f.sourceVersion,
  p_reason:
    "O material entregue não encerrou a necessidade; fiz uma nova observação",
  p_lines: [
    {
      productId: f.products[0],
      currentStock: "0",
      stockObservation: "observed",
      stockObservationAt: "2026-11-06T12:30:00-03:00",
      urgent: false,
    },
  ],
  p_extra_items: [],
  p_observations: [
    "Nova observação fictícia, sem copiar uma contagem anterior",
  ],
});
export const physicalState = (f) =>
  sql(`select jsonb_build_object(
 'ledger',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}),
 'deliveries',(select jsonb_agg(to_jsonb(l) order by id) from public.document_lines l where l.document_id=${sqlLiteral(f.ent.id)}),
 'links',(select jsonb_agg(to_jsonb(k) order by k.document_line_id,k.requisition_item_id) from public.document_request_links k join public.requisition_items i on i.id=k.requisition_item_id where i.requisition_id=${sqlLiteral(f.source.id)}),
 'material',(select material_identity from public.requisitions where id=${sqlLiteral(f.source.id)}),
 'sourceItems',(select jsonb_agg(to_jsonb(i) order by id) from public.requisition_items i where requisition_id=${sqlLiteral(f.source.id)}),
 'sourceScience',(select jsonb_agg(to_jsonb(e) order by id) from public.requisition_science_events e where requisition_id=${sqlLiteral(f.source.id)}));`);
export const requestState = (f) =>
  sql(`select jsonb_build_object(
 'requests',(select jsonb_agg(to_jsonb(r) order by id) from public.requisitions r where care_recipient_id=${sqlLiteral(f.patient)}),
 'documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${sqlLiteral(f.patient)}),
 'events',(select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where care_recipient_id=${sqlLiteral(f.patient)}));`);
export { rpc, actor, fixtures };
