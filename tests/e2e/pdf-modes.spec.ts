import { test, expect, type Page } from "@playwright/test";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { PDF } from "@libpdf/core";
import { PDFDocument } from "pdf-lib";
import { progressPreparationFixture, progressFacts, actor, rpc, fixtures, sql, q } from "../integration/progress-preparation-fixtures.mjs";
import { autonomousReturnFixture, declaredAutonomousReturn, transferCommand } from "../integration/autonomous-return-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import { audit } from "./accessibility-audit";
import { pdfIssuanceSchema } from "@/lib/documents/pdf-issuance";
const compact=(value:string)=>value.normalize("NFKC").replaceAll(/\s/g,"");
const hash=(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
const plain=async(bytes:Uint8Array)=>(await PDF.load(bytes)).extractText().flatMap(page=>page.lines.map(line=>line.spans.flatMap(span=>span.chars.map(char=>char.char)).join(""))).join(" ");
async function login(page:Page,patient:string,email=fixtures.adminA.email){
 await page.goto("/login");await page.getByLabel("E-mail",{exact:true}).fill(email);await page.getByLabel("Senha",{exact:true}).fill(fixturePassword);
 await page.getByRole("button",{name:"Entrar",exact:true}).click();await expect(page.getByRole("heading",{name:"Visão geral",exact:true})).toBeVisible();await selectContext(page,patient);
}
async function openFiles(page:Page,id:string){await page.goto("/documentos/"+id);await selectDocumentSection(page,"files");await expect(page.getByRole("button",{name:"Escolher conteúdo do PDF",exact:true})).toBeEnabled();}
async function publishedFixture(kind:"REQ"|"COM"|"ENT"|"BAL"|"RETURN"){
 if(kind!=="RETURN")return progressPreparationFixture(kind);
 const f=await autonomousReturnFixture(),declared=await declaredAutonomousReturn(f),agreement=await transferCommand(f.counterparty.client,declared.document.id,"agree",declared.document.version,{reason:"Concordância familiar própria desta devolução."});
 expect(agreement.error).toBeNull();const dispatched=await transferCommand(f.initiator.client,agreement.data.id,"dispatch",agreement.data.version);expect(dispatched.error).toBeNull();
 return {...f,id:dispatched.data.id};
}
async function note(f:{patient:string;id:string},text:string){const client=await actor("adminA",f.patient);await rpc(client,"document_progress_publish",{p_document:f.id,p_key:randomUUID(),p_body:{category:"record",stage:"issuance",text,references:[],publication:{relevance:"milestone",mentions:[fixtures.professional.id]}}});}
async function signed(page:Page,id:string,value:unknown,label:string){
 const receipt=pdfIssuanceSchema.parse(value);expect(receipt).toMatchObject({rendererRevision:17,state:"ready",validation:{accepted:true,wholeFile:true,profile:"PAdES-B-T",signerTrust:"internal",timestampTrust:"internal"}});
 const path="/api/documents/"+id+"/pdf?issuance="+receipt.id,response=await page.request.get(path);expect(response.status(),await response.text()).toBe(200);
 const bytes=await response.body();expect(hash(bytes)).toBe(receipt.sha256);expect(await(await page.request.get(path)).body()).toEqual(bytes);
 mkdirSync("output/pdf/approved",{recursive:true});writeFileSync("output/pdf/approved/"+label+"-native-signed.pdf",bytes);
 const trust=process.env.HCA_PDF_TRUST_POLICY_FILE;if(!trust)throw Error("Guarded signing trust required");writeFileSync("output/pdf/approved/modes-public-root.crt",JSON.parse(readFileSync(trust,"utf8")).roots[0].pem);
 return {receipt,bytes,path};
}
test.setTimeout(360_000);
test("expanded models use the real chooser and preserve an uncertain selected intention, original facts and prior bytes",async({page},info)=>{
 for(const kind of ["REQ","COM","ENT","BAL","RETURN"] as const){
  const f=await publishedFixture(kind);await note(f,"Andamento selecionado real de teste · "+kind);const before=progressFacts(f);
  await login(page,f.patient);await openFiles(page,f.id);const endpoint="/api/documents/"+f.id+"/issuances";
  let old:{id:string;bytes:Buffer}|null=null;
  if(kind==="REQ"){
   const response=await page.request.post(endpoint,{ timeout: 60_000,data:{idempotencyKey:randomUUID()}});expect(response.status(),await response.text()).toBe(200);const receipt=await response.json();expect(receipt.rendererRevision).toBe(16);
   old={id:receipt.id,bytes:await(await page.request.get("/api/documents/"+f.id+"/pdf?issuance="+receipt.id)).body()};
  }
  const sent:unknown[]=[];let first:unknown;
  if(kind==="REQ")await page.route("**"+endpoint,async route=>{
   if(route.request().method()!=="POST")return route.continue();sent.push(route.request().postDataJSON());
   const response=await route.fetch();expect(response.status(),await response.text()).toBe(200);
   if(sent.length===1){first=await response.json();return route.abort("failed");}return route.fulfill({response});
  });
  await page.getByRole("button",{name:"Escolher conteúdo do PDF",exact:true}).click();const dialog=page.getByRole("dialog",{name:"Escolher conteúdo do PDF",exact:true});
  await expect(dialog.getByRole("combobox",{name:"Modalidade documental",exact:true})).toHaveValue("expanded");
  for(const name of ["Comunicações","Confirmações","Detalhes dos vínculos","Histórico operacional de acesso"])await dialog.getByRole("checkbox",{name,exact:true}).check();
  if(kind==="REQ")for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:900});await audit(page,"Seletor de complementos "+width);await info.attach("Seletor de complementos "+width,{body:await dialog.screenshot(),contentType:"image/png"});}
  const creation=kind==="REQ"?null:page.waitForResponse(r=>new URL(r.url()).pathname===endpoint&&r.request().method()==="POST");
  await dialog.getByRole("button",{name:"Emitir exemplar selecionado",exact:true}).click();
  let value:unknown;
  if(kind==="REQ"){
   await expect(page.getByRole("button",{name:"Recuperar emissão",exact:true})).toBeEnabled();await expect(page.getByRole("button",{name:"Escolher conteúdo do PDF",exact:true})).toBeDisabled();
   await page.reload();await selectDocumentSection(page,"files");await expect(page.getByRole("button",{name:"Recuperar emissão",exact:true})).toBeEnabled();
   const recovered=page.waitForResponse(r=>new URL(r.url()).pathname===endpoint&&r.request().method()==="POST");await page.getByRole("button",{name:"Recuperar emissão",exact:true}).click();
   const response=await recovered;expect(response.status(),await response.text()).toBe(200);value=await response.json();expect(sent).toHaveLength(2);expect(sent[1]).toEqual(sent[0]);expect(value).toMatchObject({id:pdfIssuanceSchema.parse(first).id});await page.unroute("**"+endpoint);
  }else{const response=await creation!;expect(response.status(),await response.text()).toBe(200);value=await response.json();}
  const result=await signed(page,f.id,value,kind.toLowerCase()+"-expanded"),text=compact(await plain(result.bytes));
  expect(text).toContain(compact("Ficha Ampliada"));expect(text).toContain(compact("Andamento selecionado real de teste · "+kind));expect(text).toContain(compact("Marco importante"));expect(text).toContain(compact("Pessoas mencionadas"));
  expect((await PDFDocument.load(result.bytes)).getTitle()).toContain(kind==="RETURN"?"Devolução de materiais":"Ficha Ampliada");
  expect(progressFacts(f)).toBe(before);if(old)expect(await(await page.request.get("/api/documents/"+f.id+"/pdf?issuance="+old.id)).body()).toEqual(old.bytes);
  expect(sql("select count(*) from private.pdf_issuances where document_id="+q(f.id)+" and renderer_revision=17")).toBe("1");
 }
});

test("restricted audit signs every-page identification, verifies original bytes and hides its archive after patient permission loss",async({page,browser})=>{
 const f=await progressPreparationFixture("REQ");for(let index=0;index<24;index++)await note(f,"Registro de auditoria "+index+" · "+"Texto integral preservado. ".repeat(12));
 await login(page,f.patient,fixtures.family.email);await openFiles(page,f.id);await page.getByRole("button",{name:"Escolher conteúdo do PDF",exact:true}).click();
 let dialog=page.getByRole("dialog",{name:"Escolher conteúdo do PDF",exact:true});await expect(dialog.locator('option[value="audit"]')).toBeDisabled();await dialog.getByRole("button",{name:"Voltar",exact:true}).click();
 const options={mode:"audit",sections:["progress","access"],period:{from:null,through:null,timeZone:"America/Sao_Paulo"},purpose:"Conferência documental da ficha com autoria e limitações explícitas."},endpoint="/api/documents/"+f.id+"/issuances";
 expect((await page.request.post(endpoint,{ timeout: 60_000,data:{idempotencyKey:randomUUID(),documentOptions:options}})).status()).toBe(403);
 await login(page,f.patient);await openFiles(page,f.id);await page.getByRole("button",{name:"Escolher conteúdo do PDF",exact:true}).click();dialog=page.getByRole("dialog",{name:"Escolher conteúdo do PDF",exact:true});
 await dialog.getByRole("combobox",{name:"Modalidade documental",exact:true}).selectOption("audit");await dialog.getByRole("checkbox",{name:"Histórico operacional de acesso",exact:true}).check();await dialog.getByRole("textbox",{name:"Finalidade da auditoria",exact:true}).fill(options.purpose);
 const creation=page.waitForResponse(r=>new URL(r.url()).pathname===endpoint&&r.request().method()==="POST");await dialog.getByRole("button",{name:"Emitir exemplar selecionado",exact:true}).click();const response=await creation;expect(response.status(),await response.text()).toBe(200);
 const result=await signed(page,f.id,await response.json(),"audit"),parsed=await PDFDocument.load(result.bytes);expect(parsed.getPageCount()).toBeGreaterThan(3);
 const checked=await page.request.post("/api/verification?code="+result.receipt.verificationCode,{headers:{"content-type":"application/pdf"},data:result.bytes});expect(checked.status(),await checked.text()).toBe(200);expect(await checked.json()).toMatchObject({reference:{found:true,bytesMatch:true,sha256:result.receipt.sha256}});
 const family=await browser.newPage({baseURL:new URL(page.url()).origin});try{await login(family,f.patient,fixtures.family.email);expect((await family.request.get(result.path)).status()).toBe(403);const archive=await(await family.request.get("/api/documents/"+f.id+"/archive")).json();expect(JSON.stringify(archive)).not.toContain(result.receipt.id);}finally{await family.close();}
 const visibleAudit=page.locator('[data-file-id="'+result.receipt.id+'"]');await expect(visibleAudit).toBeVisible();
 sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values("+[q(f.patient),q(fixtures.adminA.id),q("audit.read"),"false"].join(",")+")");
 await page.evaluate(()=>window.dispatchEvent(new Event("hca:data-changed")));await expect(visibleAudit).toHaveCount(0);
 expect((await page.request.get(result.path)).status()).toBe(403);expect(JSON.stringify(await(await page.request.get("/api/documents/"+f.id+"/archive")).json())).not.toContain(result.receipt.id);
});


test("expanded donation keeps its complete base when an explicit UI period contains no Andamentos",async({page})=>{
 const f=await progressPreparationFixture("COM"),family=await actor("family",f.patient),document=await rpc(family,"create_supply_document",{p_patient:f.patient,p_type:"COM",p_key:randomUUID(),p_draft:false,p_payload:{origin:"donation",notes:"Observação original da doação que deve permanecer integral.",lines:[{productId:f.products[0],quantity:"2"}]}});
 await note({...f,id:document.id},"Registro atual fora do intervalo escolhido.");await login(page,f.patient,fixtures.family.email);await openFiles(page,document.id);
 await page.getByRole("button",{name:"Escolher conteúdo do PDF",exact:true}).click();const dialog=page.getByRole("dialog",{name:"Escolher conteúdo do PDF",exact:true});
 await dialog.getByRole("combobox",{name:"Período dos complementos",exact:true}).selectOption("interval");await dialog.getByRole("textbox",{name:"Dia inicial",exact:true}).fill("2000-01-01");await dialog.getByRole("textbox",{name:"Dia final",exact:true}).fill("2000-01-02");
 await page.setViewportSize({width:320,height:900});await audit(page,"Período dos complementos da doação");
 const endpoint="/api/documents/"+document.id+"/issuances",pending=page.waitForResponse(r=>new URL(r.url()).pathname===endpoint&&r.request().method()==="POST");await dialog.getByRole("button",{name:"Emitir exemplar selecionado",exact:true}).click();const response=await pending;expect(response.status(),await response.text()).toBe(200);
 const result=await signed(page,document.id,await response.json(),"donation-expanded"),text=compact(await plain(result.bytes));
 for(const value of ["Doação de materiais","Ficha Ampliada","Observação original da doação que deve permanecer integral.","Período: de 01/01/2000 a 02/01/2000, dias completos e inclusivos.","Nenhum andamento neste período."])expect(text).toContain(compact(value));
 expect(text).not.toContain(compact("Registro atual fora do intervalo escolhido."));expect(result.receipt.documentOptions?.period).toEqual({from:"2000-01-01",through:"2000-01-02",timeZone:"America/Sao_Paulo"});
});
