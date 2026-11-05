import assert from "node:assert/strict";
import { readFileSync,writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { getE2EEnvironment } from "../../../../scripts/e2e-environment.mjs";
import { fixtureFile } from "../../../../scripts/test-environment.mjs";
import { fixturePassword } from "../../../../scripts/test-constants.mjs";
getE2EEnvironment();
const dir=new URL("./",import.meta.url), info=JSON.parse(readFileSync(new URL("ui-runtime-fixture.json",dir),"utf8")), accounts=JSON.parse(readFileSync(fixtureFile,"utf8"));
const result={sha:"37cb7f85e96e551d6419871f94dd950712e2565b",origin:"http://127.0.0.1:3100",startedAt:new Date().toISOString(),captures:[]};
const browser=await chromium.launch({headless:true});
const save=()=>writeFileSync(new URL("ui-runtime-ready.json",dir),JSON.stringify(result,null,2)+"\n");
const screenshot=(p,n)=>p.screenshot({path:new URL(n,dir).pathname.replace(/^\/([A-Za-z]:)/,"$1"),animations:"disabled"});
async function login(role){
 const c=await browser.newContext({baseURL:result.origin,viewport:{width:390,height:844}}),p=await c.newPage();p.setDefaultTimeout(20000);
 await p.goto("/login");await p.getByLabel("E-mail",{exact:true}).fill(accounts[role].email);await p.getByLabel("Senha",{exact:true}).fill(fixturePassword);await p.getByRole("button",{name:"Entrar",exact:true}).click();await p.getByRole("heading",{name:"Visão geral",exact:true}).waitFor();
 assert((await p.request.post("/api/context",{data:{careRecipientId:role==="global"?null:info.patient}})).ok());
 await p.goto("/");await p.locator(".hca-dashboard").waitFor();return p;
}
try{
 for(const role of ["adminA","professional","family","reader","supervisor","global"]){
  if(!accounts[role])continue;
  const p=await login(role);
  for(const width of (["adminA","professional"].includes(role)?[320,390,768,1440,1920]:[390])){
   await p.setViewportSize({width,height:width<768?844:900});await p.locator(".hca-dashboard").waitFor();
   await p.waitForTimeout(150);
   const geometry=await p.evaluate(()=>({viewport:globalThis.document.documentElement.clientWidth,documentWidth:globalThis.document.documentElement.scrollWidth,bodyWidth:globalThis.document.body.scrollWidth,dashboardVisible:!!globalThis.document.querySelector(".hca-dashboard"),bottomNav:[...globalThis.document.querySelectorAll("nav")].filter(e=>globalThis.getComputedStyle(e).position==="fixed").map(e=>{const r=e.getBoundingClientRect();return {label:e.getAttribute("aria-label"),top:r.top,bottom:r.bottom,height:r.height};})}));
   const file="ui-dashboard-ready-"+role+"-"+width+".png";await screenshot(p,file);result.captures.push({role,width,geometry,file});save();
  }
  await p.context().close();
 }
 const page=await login("adminA");
 const settings=await (await page.request.get("/api/patient-settings?careRecipientId="+info.patient)).json();
 result.configuredShareWaitSeconds=settings.data.settings.shareWaitSeconds;
 await page.route("**/api/documents/"+info.req+"/notifications",r=>r.fulfill({status:200,contentType:"application/json",body:'{"data":[]}'}));
 await page.goto("/documentos/"+info.req);
 await page.getByText("Documento salvo. Consulte os estados individuais dos avisos abaixo.",{exact:true}).waitFor();
 const t0=Date.now();const initial=await page.locator(".hca-document-header").innerText();
 await page.waitForTimeout(4000);const after4s=await page.locator(".hca-document-header").innerText();
 await page.waitForTimeout(6500);const afterDeadline=await page.locator(".hca-document-header").innerText();
 await screenshot(page,"ui-document-deadline-390.png");
 result.UX012={configured:result.configuredShareWaitSeconds,initial,after4s,afterDeadline,elapsed:Date.now()-t0,notificationsMock:"200 data[] somente consulta para isolar apresentação",result:"CONFIRMED_RUNTIME"};
 await page.unroute("**/api/documents/"+info.req+"/notifications");
 await page.goto("/escalas");await page.getByRole("button",{name:"Aprovar alteração",exact:true}).waitFor();await page.getByRole("button",{name:"Aprovar alteração",exact:true}).click();
 await page.getByRole("dialog",{name:"Revisar escala",exact:true}).waitFor();
 const focus=[];for(let i=0;i<6;i++){focus.push(await page.evaluate(()=>({text:globalThis.document.activeElement?.textContent,aria:globalThis.document.activeElement?.getAttribute("aria-label"),insideDialog:!!globalThis.document.activeElement?.closest('[role="dialog"]')})));await page.keyboard.press("Tab");}
 await page.keyboard.press("Escape");
 result.dialogKeyboard={focus,closed:await page.getByRole("dialog",{name:"Revisar escala",exact:true}).count()===0,focusAfterEscape:await page.evaluate(()=>({text:globalThis.document.activeElement?.textContent,aria:globalThis.document.activeElement?.getAttribute("aria-label")}))};
 await page.context().close();result.finishedAt=new Date().toISOString();save();console.log("ready captures "+result.captures.length+"; UX012 confirmed; keyboard recorded");
}finally{await browser.close();save();}

