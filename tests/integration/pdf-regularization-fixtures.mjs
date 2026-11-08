import { randomUUID } from "node:crypto";
import { unavailableDelivery } from "./delivery-regularization-fixtures.mjs";
import { actor, fixtures, rpc } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

export const regularizationLedger = patient => sql(`select coalesce(jsonb_agg(to_jsonb(m) order by movement_revision),'[]') from public.stock_movements m where care_recipient_id=${sqlLiteral(patient)};`);
export async function regularizationPdfFixture({state="approved",unknownOnly=false}={}) {
  const f=await unavailableDelivery({quantity:"5"}),owner=await actor("family",f.patient),original=f.document;
  const reason="Regularização documental após indisponibilidade da recebedora original";
  const basis="Conferência física fictícia conserva uma unidade de destino desconhecido; não presume aceite pessoal";
  const proposed=await rpc(f.admin,"supply_document_command",{p_id:original.id,p_version:original.version,p_action:"propose_regularization",p_key:randomUUID(),p_body:{reason,basis,reviewerId:fixtures.family.id,followUpOwnerId:fixtures.adminA.id,lines:[{lineId:original.lines[0].id,receivedQuantity:"0",returnedQuantity:unknownOnly?"0":"1",missingQuantity:unknownOnly?"0":"1"}]}});
  const doc=state==="pending"?proposed:await rpc(owner,"supply_document_command",{p_id:proposed.id,p_version:proposed.version,p_action:"review_regularization",p_key:randomUUID(),p_body:{caseId:proposed.deliveryRegularization.currentId,accept:state==="approved",reason:state==="approved"?"Conferência independente confirma somente os efeitos físicos apurados":"Evidência insuficiente: proposta rejeitada sem alterar o estoque"}});
  const item=doc.deliveryRegularization.cases.find(c=>c.id===proposed.deliveryRegularization.currentId);
  return {...f,owner,original,proposed,doc,item,reason,basis};
}
