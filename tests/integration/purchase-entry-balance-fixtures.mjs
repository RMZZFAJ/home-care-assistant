import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setup,actor,rpc } from "./v4-fixtures.mjs";
import { sql,sqlLiteral as q } from "../../scripts/test-environment.mjs";
export const purchaseBalanceCommand=(client,doc,action,body,key=randomUUID())=>rpc(client,"supply_document_command",{p_id:doc.id,p_action:action,p_body:body,p_key:key,p_version:doc.version});
export async function purchaseBalanceFixture(){
 const f=await setup(),family=await actor("family",f.patient);
 let document=await rpc(f.admin,"create_supply_document",{p_patient:f.patient,p_type:"COM",p_payload:{origin:"purchase",lines:f.products.map(productId=>({productId,quantity:"10"}))},p_key:randomUUID(),p_draft:false});
 const original=document;document=await purchaseBalanceCommand(family,document,"purchase",{lines:document.lines.map(l=>({lineId:l.id,quantity:"6"}))});
 return {...f,family,document,original};
}
export async function purchaseBalanceArrival(f,document,items,client=f.family){
 const key=randomUUID();const next=await purchaseBalanceCommand(client,document,"receive",{lines:items},key),receipt=next.receipts.find(r=>r.submission_key===key);assert.ok(receipt);return{document:next,receipt,key};
}
export const purchaseBalanceFacts=f=>sql("select jsonb_build_object('receipts',(select jsonb_agg(to_jsonb(r) order by id) from public.purchase_receipts r where document_id="+q(f.document.id)+"),'events',(select jsonb_agg(to_jsonb(e) order by version) from public.document_events e where document_id="+q(f.document.id)+"),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id="+q(f.patient)+"),'captured',(select jsonb_agg(to_jsonb(b) order by receipt_id) from private.purchase_entry_balances b where document_id="+q(f.document.id)+"))");
export async function otherPurchaseEntry(f,quantity="5"){
 let d=await rpc(f.admin,"create_supply_document",{p_patient:f.patient,p_type:"COM",p_payload:{origin:"donation",lines:f.products.map(productId=>({productId,quantity}))},p_key:randomUUID(),p_draft:false});
 d=await purchaseBalanceCommand(f.family,d,"purchase",{lines:d.lines.map(l=>({lineId:l.id,quantity}))});
 return (await purchaseBalanceArrival(f,d,d.lines.map(l=>({lineId:l.id,quantity})),f.admin)).document;
}
