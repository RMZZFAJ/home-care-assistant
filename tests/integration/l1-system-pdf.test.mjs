import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { build } from "esbuild";
import { join } from "node:path";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { setup, issue, delivery, actor, rpc, env } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q, testDataRoot } from "../../scripts/test-environment.mjs";
import { testSigningIdentity } from "../support/test-signing-identity.mjs";

test("L1 system notifications issue the approved REQ/COM/ENT/BAL through real signing, immutable storage and safe recovery", {timeout:180000}, async()=>{
 const moduleFile=join(testDataRoot,"l1-system-pdf-code.cjs");
 await build({stdin:{contents:'export { notificationPdf } from "@/lib/server/pdf-issuance";',resolveDir:process.cwd(),loader:"ts"},bundle:true,packages:"external",platform:"node",format:"cjs",outfile:moduleFile,logLevel:"silent"});
 const {notificationPdf}=createRequire(import.meta.url)(moduleFile);
 const identity=await testSigningIdentity(),keys=["NEXT_PUBLIC_SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY","HCA_PDF_TRUST_POLICY","HCA_PDF_SIGNING_SECRET","HCA_PDF_TRUST_POLICY_FILE","HCA_PDF_SIGNING_SECRET_FILE"],previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 Object.assign(process.env,{NEXT_PUBLIC_SUPABASE_URL:env.url,SUPABASE_SERVICE_ROLE_KEY:env.serviceKey,HCA_PDF_TRUST_POLICY:"",HCA_PDF_SIGNING_SECRET:"",HCA_PDF_TRUST_POLICY_FILE:identity.trustFile,HCA_PDF_SIGNING_SECRET_FILE:identity.secretFile});
 try {
  const f=await setup(),req=await issue(f.patient,f.products),family=await actor("family",f.patient);
  const ent=await delivery(f.patient,req,[f.products[0]],{requestFulfillment:"partial"});
  const com=await rpc(family,"create_supply_document",{p_patient:f.patient,p_type:"COM",p_key:randomUUID(),p_draft:false,p_payload:{origin:"purchase",lines:[{productId:f.products[0],quantity:"1"}]}});
  await actor("adminA",f.patient);
  const bal=await rpc(f.admin,"create_supply_document",{p_patient:f.patient,p_type:"BAL",p_key:randomUUID(),p_draft:false,p_payload:{lines:f.products.map(productId=>({productId,quantity:"2"}))}});
  const service=createClient(env.url,env.serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  mkdirSync("output/pdf/l1-system",{recursive:true});
  const codes=[];
  for(const [type,document] of [["REQ",req],["COM",com],["ENT",ent],["BAL",bal]]){
   const notice=sql("select id from public.requisition_notifications where document_id="+q(document.id)+" and channel='internal' order by created_at,id limit 1");
   assert.ok(notice,type+" needs its real generated notice");
   const worker=randomUUID();
   // Controlled lease on this new synthetic notice only. No transport sends.
   sql(`update public.requisition_notifications set state='processing',include_pdf=true,leased_by=${q(worker)},lease_expires_at=now()+interval '5 minutes' where id=${q(notice)}`);
   const result=await notificationPdf(service,notice,worker,"http://127.0.0.1:3100");
   const stored=JSON.parse(sql("select jsonb_build_object('state',state,'hash',sha256,'requestedBy',requested_by,'validation',validation,'path',object_path,'code',verification_code) from private.pdf_issuances where notification_id="+q(notice)));
   assert.equal(stored.state,"ready");assert.equal(stored.requestedBy,null);assert.equal(stored.validation.accepted,true);
   assert.equal(createHash("sha256").update(result.bytes).digest("hex"),stored.hash);
   const recovered=await notificationPdf(service,notice,worker,"http://127.0.0.1:3100");assert.deepEqual(recovered.bytes,result.bytes);
   assert.equal(sql("select count(*) from private.pdf_issuances where notification_id="+q(notice)),"1");
   writeFileSync("output/pdf/l1-system/"+type+".pdf",result.bytes);
   const detail=await rpc(family,"pdf_verification_details",{p_code:stored.code,p_select_context:false});
   assert.equal(detail.documentId,document.id);assert.equal(detail.generatedBy,"Sistema · comunicação documental");
   codes.push(stored.code);
  }
  sql(`update public.care_recipient_memberships set status='revoked' where care_recipient_id=${q(f.patient)} and user_id=${q((await family.auth.getUser()).data.user.id)}`);
  for(const code of codes)for(const select of [false,true])assert.equal((await family.rpc("pdf_verification_details",{p_code:code,p_select_context:select})).error?.code,"42501");
  assert.equal(sql("select count(*) from private.pdf_notification_authority"),"0");
 } finally {
  for(const key of keys)if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];
  await identity.dispose();
 }
});
