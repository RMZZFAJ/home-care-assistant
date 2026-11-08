import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { privateDraftFixture,reqContent,balContent,savePacket,draftContext,draftDevice,officialState,confirmPacket,rpc,fixtures } from "./private-draft-fixtures.mjs";
import { actor } from "./v4-fixtures.mjs";
import { sql,sqlLiteral } from "../../scripts/test-environment.mjs";
const nav=stage=>({version:1,stage});

test("private stage survives another real Auth device, CAS and exact replay without changing content hash or official state",async()=>{
 const f=await privateDraftFixture(),peer=await draftDevice(f.patient),before=officialState(f);
 const packet=savePacket(f);packet.p_body.navigation=nav("review");
 const first=await rpc(f.pro,"creation_draft_command",packet),read=await draftContext(f,"REQ",peer);
 assert.deepEqual(read.navigation,nav("review"));assert.deepEqual(read.content,reqContent(f));
 const next={...packet,p_id:first.id,p_expected:1,p_key:randomUUID(),p_body:{...packet.p_body,navigation:nav("notes")}};
 await rpc(peer,"creation_draft_command",next);
 const updated=await draftContext(f);assert.equal(updated.contentHash,read.contentHash);assert.deepEqual(updated.navigation,nav("notes"));
 assert.equal((await rpc(f.pro,"creation_draft_command",packet)).replayed,true);
 assert.deepEqual((await draftContext(f)).navigation,nav("notes"));
 assert.equal((await f.pro.rpc("creation_draft_command",{...packet,p_body:{...packet.p_body,navigation:nav("higiene")}})).error?.code,"23505");
 const writes=await Promise.all([f.pro,peer].map((client,i)=>client.rpc("creation_draft_command",{...next,p_expected:2,p_key:randomUUID(),p_body:{...packet.p_body,navigation:nav(i?"dieta":"higiene")}})));
 assert.equal(writes.filter(r=>!r.error).length,1);assert.equal(writes.find(r=>r.error).error.code,"PT409");
 const oldClient={...next,p_expected:3,p_key:randomUUID(),p_body:{action:"save",content:reqContent(f)}};
 await rpc(peer,"creation_draft_command",oldClient);assert.equal((await draftContext(f)).navigation,null);
 assert.equal((await draftContext(f)).contentHash,read.contentHash);
 const outsider=await actor("adminA",f.patient);assert.equal(await draftContext(f,"REQ",outsider),null);
 assert.equal((await outsider.rpc("creation_draft_command",{...next,p_expected:4,p_key:randomUUID()})).error?.code,"42501");
 assert.equal(officialState(f),before);
 const saved=await draftContext(f);await rpc(f.pro,"commit_creation_draft",confirmPacket(f,saved));
 assert.equal((await draftContext(f)).navigation,null);
});

test("database refuses forged metadata and cross-mode stages before storing any private revision",async()=>{
 const f=await privateDraftFixture(),before=officialState(f),packet=savePacket(f);
 for(const navigation of [null,[],{},nav("count"),{...nav("notes"),role:"admin"},{version:2,stage:"review"},{version:1,stage:"x".repeat(1024)}]){
  const result=await f.pro.rpc("creation_draft_command",{...packet,p_key:randomUUID(),p_body:{...packet.p_body,navigation}});
  assert.equal(result.error?.code,"22023");assert.equal(await draftContext(f),null);
 }
 for(const mode of ["legacy","scheduled"]){
  const content=balContent(f);content.context.mode=mode;
  const args=savePacket(f,"BAL",content);args.p_body.navigation=nav(mode==="scheduled"?"count":"higiene");
  const saved=await rpc(f.pro,"creation_draft_command",args);
  assert.deepEqual((await draftContext(f,"BAL")).navigation,args.p_body.navigation);
  const invalid={...args,p_id:saved.id,p_expected:1,p_key:randomUUID(),p_body:{...args.p_body,navigation:nav(mode==="scheduled"?"higiene":"count")}};
  assert.equal((await f.pro.rpc("creation_draft_command",invalid)).error?.code,"22023");
  await rpc(f.pro,"creation_draft_command",{...invalid,p_body:{action:"discard"},p_key:randomUUID()});
 }
 assert.equal(officialState(f),before);
 assert.equal(sql("select has_function_privilege('authenticated','private.creation_draft_navigation_valid(jsonb,text,text,jsonb)','execute');"),"f");
});

test("COM ENT creation, revision and personal receipt retain independent private stages and legacy payloads",async()=>{
 const f=await privateDraftFixture(),family=await actor("family",f.patient);
 const materials=f.products.map((id,i)=>({id,name:"Material fictício "+i,unit:"unidade",quantityDecimals:0}));
 const content={form:{quantities:{[f.products[0]]:"1,"},notes:"Privado",origin:"",source:"FAMILY",recipientId:""},links:{},materials,context:{documentId:null,documentVersion:null,requisitionId:null,recipientName:""}};
 for(const kind of ["COM","ENT"]){
  const args={p_patient:f.patient,p_kind:kind,p_purpose:"create",p_target:null,p_id:null,p_expected:null,p_body:{action:"save",content,navigation:nav("notes")},p_key:randomUUID()},before=officialState(f);
  const saved=await rpc(family,"supply_draft_command",args);
  const read=()=>rpc(family,"supply_draft_context",{p_patient:f.patient,p_kind:kind,p_purpose:"create",p_target:null});
  assert.deepEqual((await read()).navigation,nav("notes"));
  assert.equal((await family.rpc("supply_draft_command",{...args,p_id:saved.id,p_expected:1,p_key:randomUUID(),p_body:{...args.p_body,navigation:nav("count")}})).error?.code,"22023");
  assert.equal(officialState(f),before);
  const document=await rpc(f.admin,"create_supply_document",{p_patient:f.patient,p_type:kind,p_payload:{lines:[{productId:f.products[0],quantity:"2"}],...(kind==="COM"?{origin:"purchase"}:{source:"FAMILY",destination:"CARE_TEAM",recipientId:fixtures.professional.id,recipientReason:"Recebedor fictício indicado"})},p_key:randomUUID(),p_draft:false});
  const stable=officialState(f),revise={...args,p_purpose:"revise",p_target:document.id,p_key:randomUUID(),p_body:{action:"save",content:{...content,context:{...content.context,documentId:document.id,documentVersion:document.version}},navigation:nav("review")}};
  await rpc(f.admin,"supply_draft_command",revise);
  if(kind==="ENT")for(const purpose of ["receive","divergence"]){
   const receipt={...args,p_purpose:purpose,p_target:document.id,p_key:randomUUID(),p_body:{action:"save",content:{documentVersion:document.version,fields:{},divergentIds:[],materials},navigation:nav(purpose==="receive"?"receipt":"divergence")}};
   await rpc(f.pro,"supply_draft_command",receipt);
   const read=await rpc(f.pro,"supply_draft_context",{p_patient:f.patient,p_kind:"ENT",p_purpose:purpose,p_target:document.id});assert.deepEqual(read.navigation,receipt.p_body.navigation);
  }
  assert.equal(officialState(f),stable);
  assert.equal(sql(`select content_hash=encode(extensions.digest(content::text,'sha256'),'hex') from private.creation_drafts where id=${sqlLiteral(saved.id)};`),"t");
 }
});
