import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { legacyBalance, actor, rpc, balCommand, balApply } from "./bal-review-fixtures.mjs";
import { shiftWorker,shiftCommand,localToday,balanceCommand } from "./shift-fixtures.mjs";
export async function correctionFixture() {
 const f=await legacyBalance({quantity:"1"}),family=await actor("family",f.patient);
 const original=await rpc(family,"operational_document",{p_id:f.document.id}),line=original.lines[0];
 const result=await balCommand(family,original,{group:"family",comment:"Diferença examinada; correção exige ato próprio.",items:[{lineId:line.id,result:"difference",forwarding:"recount",comment:"Recontar somente o material indicado."}]});
 assert.ifError(result.error);const reviewed=result.data;
 const recount=await rpc(f.admin,"revise_supply_document",{p_id:reviewed.id,p_key:randomUUID(),p_version:reviewed.version,p_recount:true,
  p_payload:{lines:f.products.map(productId=>({productId,quantity:productId===line.product_id?"2":"3"})),notes:"Reconto físico posterior com autoria própria."}});
 return {...f,family,original,line,reviewed,recount};
}

export async function extraCorrectionFixture() {
  const extra = { id: randomUUID(), name: "Espátula sem cadastro", unit: "caixa", quantity: "2" };
  const f = await legacyBalance({ quantity: "1", balanceExtras: [extra] });
  const family = await actor("family", f.patient);
  const opinion = await balCommand(family, f.document, {
    group: "family",
    comment: "Há diferença no item extra.",
    items: [{ lineId: extra.id, result: "difference", forwarding: "recount", comment: "Conferir a espátula novamente." }],
  });
  assert.ifError(opinion.error);
  const revise = (source, lines, extras) => ({
    p_id: source.id, p_version: source.version, p_key: randomUUID(), p_recount: true,
    p_payload: { lines, balanceExtras: extras, notes: "Contagem física da espátula." },
  });
  const lines = f.products.map(productId => ({ productId, quantity: "1" }));
  const carry = revise(opinion.data, lines, [{ ...extra, quantity: "3" }]);
  const retained = await rpc(f.admin, "revise_supply_document", carry);
  const productArgs = {
    p_care_recipient_id: f.patient, p_product_id: null, p_name: extra.name,
    p_category: "higiene", p_unit: "caixa", p_aliases: [], p_is_active: true,
  };
  const product = await rpc(f.admin, "admin_upsert_recipient_product", productArgs);
  const catalogueLines = [...lines, { productId: product.product_id, quantity: "4" }];
  const incorporate = revise(retained, catalogueLines, []);
  const incorporated = await rpc(f.admin, "revise_supply_document", incorporate);
  return { ...f, family, extra, reviewed: opinion.data, retained, incorporated, incorporate, productArgs, product, catalogueLines, revise };
}

export async function applyCorrection(f) {
 const current=await rpc(f.family,"operational_document",{p_id:f.document.id});
 const opinion=await balCommand(f.family,current,{group:"family",comment:"Parecer próprio da nova contagem."});assert.ifError(opinion.error);
 const result=await balApply(f.family,opinion.data);assert.ifError(result.error);return result.data;
}

export async function designatedCorrection(f) {
 const pro=await shiftWorker(f.patient),today=localToday();
 const type=await shiftCommand(f.admin,f.patient,"type",{name:"Reconto posterior designado",startsLocal:"00:00",durationMinutes:1440});
 await shiftCommand(f.admin,f.patient,"series",{professionalId:pro.id,shiftTypeId:type.id,timezone:"America/Sao_Paulo",recurrence:"once",weekdays:[],anchorDate:today,validUntil:today,notes:"Janela fictícia da correção posterior."});
 const source=await rpc(f.family,"balance_recount_context",{p_id:f.document.id}),target=source.targets.find(row=>row.professional_id===pro.id);
 assert.ok(target);assert.equal(source.canAssign,true);
 await balanceCommand(f.family,f.patient,"assign_recount",{documentId:f.document.id,targetShiftId:target.id,targetShiftVersion:target.version,referenceHash:source.referenceHash,reason:"Nova contagem sem reescrever o efeito anterior."},source.documentVersion);
 const ready=await rpc(pro.client,"balance_workspace",{p_patient:f.patient}),assignment=ready.eligibility.assignment;
 const current=await rpc(pro.client,"operational_document",{p_id:f.document.id});
 return rpc(pro.client,"revise_supply_document",{p_id:f.document.id,p_version:current.version,p_key:randomUUID(),p_recount:true,p_payload:{lines:f.products.map(productId=>({productId,quantity:"4"})),notes:"Nova contagem ainda pendente.",balanceAssignment:{id:assignment.id,version:assignment.version,referenceRevision:ready.referenceRevision}}});
}
