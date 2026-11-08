import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setup,actor,rpc,fixtures } from "./v4-fixtures.mjs";
import { sql,sqlLiteral } from "../../scripts/test-environment.mjs";
export const terminalLedger=patient=>sql(`select coalesce(jsonb_agg(to_jsonb(m) order by movement_revision),'[]') from public.stock_movements m where care_recipient_id=${sqlLiteral(patient)};`);
export async function entTerminalFixture({kind="administrative",personal=false}={}){
 const f=await setup(),owner=await actor("family",f.patient),recipient=await actor("professional",f.patient);
 let doc=await rpc(owner,"create_supply_document",{p_patient:f.patient,p_type:"ENT",p_key:randomUUID(),p_draft:false,p_payload:{source:"FAMILY",destination:"CARE_TEAM",recipientId:fixtures.professional.id,recipientReason:"Pessoa vinculada designada para a entrega fictícia",lines:[{productId:f.products[0],quantity:"5"}]}});
 if(personal)doc=await rpc(recipient,"supply_document_command",{p_id:doc.id,p_version:doc.version,p_action:"receive",p_key:randomUUID(),p_body:{divergences:[{lineId:doc.lines[0].id,acceptedQuantity:"2",notes:"Duas unidades aceitas pessoalmente; demais ainda não confirmadas"}]}});
 const original=doc;
 if(kind==="cancelled"){
  assert.equal(personal,false);
  doc=await rpc(owner,"supply_document_command",{p_id:doc.id,p_version:doc.version,p_action:"cancel",p_key:randomUUID(),p_body:{reason:"Cancelamento fictício anterior a qualquer aceite pessoal"}});
  if(doc.status==="cancellation_pending")doc=await rpc(recipient,"supply_document_command",{p_id:doc.id,p_version:doc.version,p_action:"consent_cancel",p_key:randomUUID(),p_body:{requestId:doc.deliveryCancellation.request.id,referenceHash:doc.deliveryCancellation.referenceHash,reason:"Consentimento próprio sem devolução de itens não recebidos",lines:doc.lines.map(l=>({lineId:l.id,returnQuantity:"0"}))}});
  assert.equal(doc.status,"cancelled");
 }else{
  assert.equal(kind,"administrative");
  sql(`update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.professional.id)};`);
  doc=await rpc(f.admin,"supply_document_command",{p_id:doc.id,p_version:doc.version,p_action:"propose_regularization",p_key:randomUUID(),p_body:{reason:"Pessoa indisponível para declaração pessoal posterior",basis:"Situação física remanescente desconhecida e preservada em trânsito",reviewerId:fixtures.family.id,followUpOwnerId:fixtures.adminA.id,lines:doc.lines.map(l=>({lineId:l.id,receivedQuantity:"0",returnedQuantity:"0",missingQuantity:"0"}))}});
  doc=await rpc(owner,"supply_document_command",{p_id:doc.id,p_version:doc.version,p_action:"review_regularization",p_key:randomUUID(),p_body:{caseId:doc.deliveryRegularization.currentId,accept:true,reason:"Conferência independente não inventa recebimento ou destino físico"}});
  assert.equal(doc.status,"administratively_closed");
 }
 return {...f,owner,recipient,original,doc,kind,personal};
}
