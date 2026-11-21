import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setup,actor,rpc,fixtures } from "./v4-fixtures.mjs";
import { sql,sqlLiteral } from "../../scripts/test-environment.mjs";

export const entTemporalLedger=patient=>sql(`select coalesce(jsonb_agg(to_jsonb(m) order by movement_revision),'[]') from public.stock_movements m where care_recipient_id=${sqlLiteral(patient)};`);
export async function entTemporalFixture({mode="prepared",dispatch=true}={}){
  const f=await setup(),owner=await actor("family",f.patient);
  const times=JSON.parse(sql("select jsonb_build_object('privateAt',date_trunc('day',clock_timestamp())-interval '3 days'+interval '12 hours','preparedAt',date_trunc('day',clock_timestamp())-interval '2 days'+interval '12 hours');"));
  const payload={source:"FAMILY",destination:"CARE_TEAM",recipientId:fixtures.professional.id,recipientReason:"Pessoa vinculada escolhida na expedição temporal fictícia",lines:[{productId:f.products[0],quantity:"2"}],notes:"Origem temporal local e fictícia"};
  let draft=null,prepared=null,doc;
  if(mode==="private"){
    const content={form:{quantities:{[f.products[0]]:"2"},notes:"Rascunho temporal privado",origin:"",source:"FAMILY",recipientId:fixtures.professional.id},links:{},materials:f.products.map((id,i)=>({id,name:`Material fictício V4 ${i}`,unit:"unidade",quantityDecimals:0})),context:{documentId:null,documentVersion:null,requisitionId:null,recipientName:""}};
    draft=await rpc(owner,"supply_draft_command",{p_patient:f.patient,p_kind:"ENT",p_purpose:"create",p_target:null,p_id:null,p_expected:null,p_body:{action:"save",content},p_key:randomUUID()});
    // Controlled clock on this new fictional row only. No event, trigger or history is changed.
    assert.equal(sql(`with changed as(update private.creation_drafts set created_at=${sqlLiteral(times.privateAt)}::timestamptz where id=${sqlLiteral(draft.id)} and owner_id=${sqlLiteral(fixtures.family.id)} and care_recipient_id=${sqlLiteral(f.patient)} and state='active' and exists(select 1 from public.care_recipients where id=${sqlLiteral(f.patient)} and is_development) returning 1) select count(*) from changed;`),"1");
    doc=(await rpc(owner,"commit_supply_draft",{p_id:draft.id,p_expected:draft.revision,p_target:null,p_key:randomUUID(),p_body:{action:"create",payload}})).result;
  }else{
    assert.equal(mode,"prepared");
    prepared=await rpc(f.admin,"create_supply_document",{p_patient:f.patient,p_type:"ENT",p_payload:payload,p_key:randomUUID(),p_draft:true});
    const events=sql(`select jsonb_agg(to_jsonb(e) order by version) from public.document_events e where document_id=${sqlLiteral(prepared.id)};`);
    // Model a retained prior-day preparation via its stored creation clock. The
    // original event body/time/hash remain intact; this is not elapsed-time proof.
    assert.equal(sql(`with changed as(update public.operational_documents set created_at=${sqlLiteral(times.preparedAt)}::timestamptz where id=${sqlLiteral(prepared.id)} and care_recipient_id=${sqlLiteral(f.patient)} and type='ENT' and status='draft' and exists(select 1 from public.care_recipients where id=${sqlLiteral(f.patient)} and is_development) returning 1) select count(*) from changed;`),"1");
    assert.equal(sql(`select jsonb_agg(to_jsonb(e) order by version) from public.document_events e where document_id=${sqlLiteral(prepared.id)};`),events);
    doc=dispatch?await rpc(owner,"supply_document_command",{p_id:prepared.id,p_version:prepared.version,p_action:"submit",p_body:{},p_key:randomUUID()}):await rpc(owner,"operational_document",{p_id:prepared.id});
  }
  return {...f,owner,draft,prepared,doc,times,mode};
}
export function entTemporalOracle(id){
  return JSON.parse(sql(`select jsonb_build_object('createdAt',d.created_at,'registeredAt',(select min(e.created_at) from public.document_events e where e.document_id=d.id),'issuedAt',(select min(e.created_at) from public.document_events e where e.document_id=d.id and nullif(e.body->>'protocol','') is not null),'draftCreatedAt',(select min(x.created_at) from private.creation_drafts x where x.consumed_document_id=d.id and x.kind='ENT' and x.purpose='create' and x.target_document_id is null),'version',d.version,'issuerId',d.created_by) from public.operational_documents d where d.id=${sqlLiteral(id)};`));
}
