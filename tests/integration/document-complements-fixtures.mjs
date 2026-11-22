import { randomUUID } from "node:crypto";
import { issue, rpc, fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

async function child(f, type) {
  if (type === "REQ") return (await issue(f.patient, [f.products[0]])).id;
  return (await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: type, p_key: randomUUID(), p_draft: false,
    p_payload: { lines: (type === "BAL" ? f.products : [f.products[0]]).map(productId => ({ productId, quantity: type === "BAL" ? "0" : "2" })), notes: "Nova ficha complementar emitida pelo fluxo normal.",
      ...(type === "COM" ? { origin: "purchase" } : type === "ENT" ? { source: "FAMILY", destination: "CARE_TEAM", recipientId: fixtures.professional.id, recipientReason: "Entrega pessoal complementar." } : {}) } })).id;
}
const doc = (client, id) => rpc(client, "operational_document", { p_id: id });
const links = (client, id) => rpc(client, "document_complements", { p_id: id });
async function packet(client, sourceId, childId) {
  const s = await doc(client, sourceId), c = await doc(client, childId);
  return { p_source: sourceId, p_child: childId, p_source_version: s.version, p_child_version: c.version,
    p_reason: "Complemento formal preservando o documento original.", p_key: randomUUID() };
}
const frozenEvents = id => sql(`select jsonb_agg(to_jsonb(e) order by version) from public.document_events e where document_id=${q(id)}`);

export { child as createComplementCandidate, doc as loadComplementDocument, links as readComplementLinks, packet as complementPacket, frozenEvents as complementFrozenEvents };
