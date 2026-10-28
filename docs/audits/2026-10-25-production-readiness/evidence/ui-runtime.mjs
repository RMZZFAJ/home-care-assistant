import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";
import sharp from "sharp";
import { getE2EEnvironment } from "../../../../scripts/e2e-environment.mjs";
import { sql, sqlLiteral } from "../../../../scripts/test-environment.mjs";
import { fixturePassword } from "../../../../scripts/test-constants.mjs";
import { setup, actor, rpc, issue, delivery, fixtures } from "../../../../tests/integration/v4-fixtures.mjs";
import { shiftWorker, shiftCommand } from "../../../../tests/integration/shift-fixtures.mjs";
const env=getE2EEnvironment();
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,"http://127.0.0.1:54321");
assert.equal(env.NOTIFICATIONS_EXTERNAL_ENABLED,"false");
const origin="http://127.0.0.1:3100";
const dir=new URL("./",import.meta.url);
const save=(n,data)=>writeFileSync(new URL(n,dir),typeof data==="string"?data:JSON.stringify(data,null,2)+"\n");
const evidence={sha:"37cb7f85e96e551d6419871f94dd950712e2565b",startedAt:new Date().toISOString(),origin,externalEnabled:false,cases:[]};
const record=(name,data)=>{evidence.cases.push({name,...data});save("ui-runtime.json",evidence);console.log(name+": "+(data.result??"captured"));};
const base=await setup();
const {patient,admin,products}=base;
const pro=await shiftWorker(patient);
const type=await shiftCommand(admin,patient,"type",{name:"Auditoria: manhã sintética",startsLocal:"07:00",durationMinutes:720});
await shiftCommand(admin,patient,"series",{professionalId:pro.id,shiftTypeId:type.id,timezone:"America/Sao_Paulo",recurrence:"once",weekdays:[],anchorDate:"2026-11-10",validUntil:"2026-11-10",notes:"Fixture de revisão UX"});
const sw=await rpc(pro.client,"schedule_workspace",{p_patient:patient,p_from:"2026-11-10",p_until:"2026-11-11"});
const original=sw.shifts[0];
const proposal=await shiftCommand(pro.client,patient,"propose_change",{id:original.id,startsAt:"2026-11-10T11:00:00Z",endsAt:"2026-11-10T23:00:00Z",reason:"Ajuste sintético para auditoria de compreensão"},original.version);
await actor("adminA",patient);
await rpc(admin,"configure_patient_access",{p_patient:patient,p_kind:"settings",p_change:{scienceAutomatic:true,scienceByDispatch:false,shareWaitSeconds:3},p_key:randomUUID(),p_version:1});
const req=await issue(patient,products);
const family=await actor("family",patient);
const oldProfile=(await family.from("profiles").select("full_name,professional_registration,professional_state,professional_category,notification_preferences").eq("id",fixtures.family.id).single()).data;
await rpc(family,"update_my_profile",{p_name:oldProfile.full_name,p_registration:oldProfile.professional_registration??"",p_state:oldProfile.professional_state,p_category:oldProfile.professional_category??"",p_preferences:{...oldProfile.notification_preferences,internal:true,whatsapp:false,email:false,scienceExpress:true,scienceAutomatic:true,scienceWhatsApp:false}});
if(fixtures.supervisor)sql("insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values("+sqlLiteral(patient)+","+sqlLiteral(fixtures.supervisor.id)+",'supervisor') on conflict do nothing");
save("ui-runtime-fixture.json",{patient,req:req.id,proposal:proposal.id,shift:original.id,original:{startsAt:original.starts_at,endsAt:original.ends_at},proposed:{startsAt:"2026-11-10T11:00:00Z",endsAt:"2026-11-10T23:00:00Z"},roles:Object.keys(fixtures)});
const browser=await chromium.launch({headless:true});
const contexts=[];
async function login(role, viewport={width:1440,height:900},scope=patient){
 const context=await browser.newContext({baseURL:origin,viewport});contexts.push(context);
 const page=await context.newPage();page.setDefaultTimeout(15000);
 await page.goto("/login");await page.getByLabel("E-mail",{exact:true}).fill(fixtures[role].email);await page.getByLabel("Senha",{exact:true}).fill(fixturePassword);await page.getByRole("button",{name:"Entrar",exact:true}).click();
 await page.getByRole("heading",{name:"Visão geral",exact:true}).waitFor();
 const selected=await page.request.post("/api/context",{data:{careRecipientId:scope}});assert(selected.ok(),"context selection");
 await page.goto("/");await page.getByRole("heading",{name:"Visão geral",exact:true}).waitFor();
 return page;
}
async function shot(page,name,fullPage=false){await page.screenshot({path:new URL(name,dir).pathname.replace(/^\/([A-Za-z]:)/,"$1"),fullPage,animations:"disabled"});}
async function attempt(name,fn){try{await fn();}catch(e){record(name,{result:"NOT_VERIFIED",error:String(e.message).split("Call log:")[0].replaceAll(fixturePassword,"[REDACTED]").slice(0,500)});}}
try{
 const adminPage=await login("adminA");
 await attempt("UX-001",async()=>{
  await adminPage.goto("/escalas");await adminPage.getByRole("heading",{name:"Escalas e plantões",exact:true}).waitFor();
  await adminPage.getByLabel("Data de referência",{exact:true}).fill("2026-11-10");
  await adminPage.getByText("Alteração solicitada · Ajuste sintético para auditoria de compreensão",{exact:true}).waitFor();
  const listText=await adminPage.locator("body").innerText();
  await adminPage.getByRole("button",{name:"Aprovar alteração",exact:true}).click();
  const modal=adminPage.getByRole("dialog",{name:"Revisar escala",exact:true});await modal.waitFor();
  const dialog=await modal.innerText();await shot(adminPage,"ui-scale-review-1440.png");
  await adminPage.setViewportSize({width:390,height:844});await shot(adminPage,"ui-scale-review-390.png");
  record("UX-001",{result:"CONFIRMED_RUNTIME",dialog,listText,proposedTimesShown:dialog.includes("08:00")||dialog.includes("20:00"),evidence:["ui-scale-review-1440.png","ui-scale-review-390.png"]});
  await modal.getByRole("button",{name:"Voltar",exact:true}).click();
 });
 const familyPage=await login("family",{width:390,height:844});
 await attempt("UX-002",async()=>{
  let signal=null;
  familyPage.on("request",async r=>{if(r.url().endsWith("/science")&&r.method()==="POST"){
   signal={payload:r.postDataJSON(),at:new Date().toISOString(),geometry:await familyPage.evaluate(()=>{
    const rect=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};};
    return {viewport:{width:globalThis.innerWidth,height:globalThis.innerHeight},header:rect(globalThis.document.querySelector(".hca-document-header")),materials:rect([...globalThis.document.querySelectorAll("h2")].find(e=>e.textContent==="Materiais requisitados"))};
   }).catch(()=>null)};
  }});
  await familyPage.goto("/documentos/"+req.id);await familyPage.getByRole("heading",{name:"Materiais requisitados",exact:true}).waitFor();
  await familyPage.waitForTimeout(2200);
  await shot(familyPage,"ui-science-top-390.png");
  const progress=await rpc(family,"requisition_progress",{p_id:req.id});
  record("UX-002",{result:signal?"CONFIRMED_RUNTIME":"NO_SIGNAL_AT_TOP",signal,science:progress.science.map(s=>({mode:s.mode,user:s.user_id===fixtures.family.id?"family":"other"})),evidence:["ui-science-top-390.png"]});
 });
 await attempt("UX-004",async()=>{
  let release;const gate=new Promise(r=>release=r);
  await adminPage.route("**/api/consumption?**",async route=>{await gate;await route.fulfill({status:500,contentType:"application/json",body:JSON.stringify({error:"Falha sintética da auditoria",code:"INTERNAL_ERROR"})});});
  await adminPage.goto("/consumo");await adminPage.getByRole("heading",{name:"Ocorrências e consumo",exact:false}).waitFor().catch(()=>{});
  await adminPage.waitForTimeout(600);const pendingText=await adminPage.locator("body").innerText();await shot(adminPage,"ui-consumption-pending-390.png");
  release();await adminPage.getByText("Falha sintética da auditoria",{exact:false}).first().waitFor();const failedText=await adminPage.locator("body").innerText();await shot(adminPage,"ui-consumption-error-390.png");
  record("UX-004",{result:"CONFIRMED_RUNTIME",pendingSaysEmpty:pendingText.includes("Nenhum relato registrado"),errorSaysEmpty:failedText.includes("Nenhum relato registrado"),pendingText,failedText,evidence:["ui-consumption-pending-390.png","ui-consumption-error-390.png"]});
  await adminPage.unroute("**/api/consumption?**");
 });
 await attempt("UX-003",async()=>{
  await adminPage.goto("/documentos/"+req.id);await adminPage.getByRole("button",{name:"Anexos e ficha física",exact:true}).click();
  const input=adminPage.getByLabel("Adicionar foto ou PDF",{exact:false});
  const png=await sharp({create:{width:8,height:8,channels:3,background:"#113355"}}).png().toBuffer();
  await input.setInputFiles({name:"auditoria-primeira-foto.png",mimeType:"image/png",buffer:png});
  let acceptedStatus=null;
  await adminPage.route("**/api/attachments",async route=>{if(route.request().method()==="POST"){const response=await route.fetch();acceptedStatus=response.status();await route.abort("failed");}else await route.continue();});
  await adminPage.getByRole("button",{name:"Enviar anexo",exact:true}).click();
  await adminPage.getByRole("button",{name:"Enviar anexo",exact:true}).waitFor();
  await adminPage.waitForTimeout(800);
  const enabled=await input.isEnabled();await shot(adminPage,"ui-attachment-lost-response.png");
  const rows=await adminPage.request.get("/api/attachments?"+new URLSearchParams({careRecipientId:patient,documentId:req.id}));
  record("UX-003",{result:acceptedStatus===201||acceptedStatus===200?"CONFIRMED_RUNTIME":"INCOMPLETE",acceptedStatus,fileInputEnabled:enabled,storedListStatus:rows.status(),visible:await adminPage.locator("body").innerText(),evidence:["ui-attachment-lost-response.png"]});
  await adminPage.unroute("**/api/attachments");
 });
 await attempt("PDF_CURRENT",async()=>{
  for(let i=2;i<14;i++){await actor("adminA",patient);const p=await rpc(admin,"admin_upsert_recipient_product",{p_care_recipient_id:patient,p_product_id:null,p_name:"Material sintético de auditoria "+String(i).padStart(2,"0"),p_category:"higiene",p_unit:"unidade",p_aliases:[],p_is_active:true});products.push(p.product_id);await rpc(admin,"family_stock_movement",{p_patient:patient,p_product:p.product_id,p_quantity:"30",p_action:"inbound",p_reason:"Fixture sintética UX",p_key:randomUUID()});}
  const extraReq=await issue(patient,products.slice(2));
  const combined={lines:[...req.lines,...extraReq.lines]};
  const ent=await delivery(patient,combined,products);
  const professional=await actor("professional",patient);
  const partial=await rpc(professional,"supply_document_command",{p_id:ent.id,p_action:"receive",p_body:{divergences:[{lineId:ent.lines[0].id,acceptedQuantity:"6",notes:"Diferença sintética: quatro unidades não recebidas"}]},p_key:randomUUID(),p_version:ent.version});
  const response=await adminPage.request.get("/api/documents/"+ent.id+"/pdf");assert(response.ok(),"PDF HTTP");const pdf=await response.body();assert.equal(pdf.subarray(0,5).toString(),"%PDF-");writeFileSync(new URL("ui-current-ent-partial.pdf",dir),pdf);
  await adminPage.goto("/documentos/"+ent.id);await adminPage.getByRole("heading",{name:"Produtos e quantidades",exact:true}).waitFor();await shot(adminPage,"ui-current-ent-partial-390.png",true);
  record("PDF_CURRENT",{result:"GENERATED_CURRENT",id:ent.id,version:partial.version,status:partial.status,lines:ent.lines.length,bytes:pdf.length,evidence:["ui-current-ent-partial.pdf","ui-current-ent-partial-390.png"]});
 });
 await attempt("RESPONSIVE_PROFILES",async()=>{
  const captures=[];
  for(const role of ["adminA","professional","family","reader","supervisor","global"]){
   if(!fixtures[role])continue;
   const page=await login(role,{width:1440,height:900},role==="global"?null:patient);
   for(const width of (["adminA","professional"].includes(role)?[320,390,768,1440,1920]:[390])){
    await page.setViewportSize({width,height:width<768?844:900});await page.waitForTimeout(250);
    const geometry=await page.evaluate(()=>({viewport:globalThis.document.documentElement.clientWidth,documentWidth:globalThis.document.documentElement.scrollWidth,bodyWidth:globalThis.document.body.scrollWidth}));
    const file="ui-dashboard-"+role+"-"+width+".png";await shot(page,file);captures.push({role,width,geometry,file,title:await page.locator("h1").innerText()});
   }
   await page.context().close();
  }
  record("RESPONSIVE_PROFILES",{result:"MEASURED",captures});
 });
}finally{
 await actor("family",patient);
 await rpc(family,"update_my_profile",{p_name:oldProfile.full_name,p_registration:oldProfile.professional_registration??"",p_state:oldProfile.professional_state,p_category:oldProfile.professional_category??"",p_preferences:oldProfile.notification_preferences});
 await browser.close();
 evidence.finishedAt=new Date().toISOString();save("ui-runtime.json",evidence);
}

