import { isDocumentAccessReport } from "./display-access-report";
import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { versionHistoryFixture, historyHashes } from "../integration/version-history-fixtures.mjs";
import { privateDraftFixture, reqContent, savePacket, officialState } from "../integration/private-draft-fixtures.mjs";
import { setup, rpc, actor, fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { pdfArchivePageSchema } from "../../src/lib/documents/pdf-archive";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import { generatedPdf } from "./generated-pdf";
import { auditFromTop } from "./accessibility-audit";

test.setTimeout(180_000);
const widths=[320,390,768,1024,1440],digest=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex");
async function login(page:Page,patient:string,email=fixtures.family.email){
  await page.goto("/login");await page.getByLabel("E-mail",{exact:true}).fill(email);await page.getByLabel("Senha",{exact:true}).fill(fixturePassword);
  await page.getByRole("button",{name:"Entrar",exact:true}).click();await expect(page.getByRole("heading",{name:"Visão geral",exact:true})).toBeVisible();await selectContext(page,patient);
}
async function model(browser:Browser){
  const context=await browser.newContext(),page=await context.newPage();await page.route(/^https?:/,r=>r.abort());
  await page.goto(pathToFileURL(resolve("Home_Care_Assistant_Modelo_Integral.html")).href+"#ficha/REQ-0003/arquivos");
  await page.locator("#roleSelect").selectOption("admin");
  // Style probes use only classes declared by the approved HTML, without
  // adding CSS or changing the application. Some native subflows have no
  // populated demonstration data in that view.
  await page.evaluate(()=>{const probe=document.createElement("div");probe.id="canonical-style-probes";probe.innerHTML='<dl class="kv"><dt>Referência</dt><dd>Preservada</dd></dl><ol class="feed"><li class="event"><span class="event-mark"></span><div class="event-body"></div></li></ol><div class="record"><span class="record-icon"></span><div class="record-main"></div></div>';document.body.append(probe);});
  return {context,page};
}
async function styles(actual:Locator,reference:Locator,properties:readonly string[]){for(const p of properties)await expect(actual).toHaveCSS(p,await reference.evaluate((n,p)=>getComputedStyle(n).getPropertyValue(p),p));}
async function fileParity(row:Locator,reference:Page){await styles(row,reference.locator(".doc-list-row").first(),["display","gap","padding-left","padding-top","border-bottom-color"]);await styles(row.locator(".hca-file-mark"),reference.locator(".file-mark").first(),["width","height","border-radius","background-color"]);}
async function capture(node:Locator,file:string){
  await node.evaluate(n=>n.scrollIntoView({block:"center",behavior:"instant"}));
  expect(await node.evaluate(n=>{const r=n.getBoundingClientRect(),x=r.left+r.width/2;return [r.top+12,r.bottom-12].every(y=>y>0&&y<innerHeight&&n.contains(document.elementFromPoint(x,y)));})).toBe(true);
  mkdirSync("output/playwright/phase-d",{recursive:true});await node.screenshot({path:"output/playwright/phase-d/"+file+".png",animations:"disabled"});
}
const official=(patient:string,id:string)=>sql("select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id="+q(id)+"),'events',(select jsonb_agg(to_jsonb(e) order by version) from public.document_events e where document_id="+q(id)+"),'ledger',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id="+q(patient)+"));");

test("06.5 native archive attachments and historical facts share canonical rows without issuing on consultation",async({page,browser},info)=>{
  const f=await versionHistoryFixture();await login(page,f.patient);
  const pdf=await generatedPdf(page,"/api/documents/"+f.doc.id+"/pdf?version="+f.approved.version);expect(pdf.status()).toBe(200);
  const bytes=await pdf.body(),issuance=new URL(pdf.url()).searchParams.get("issuance")!;
  await page.goto("/fichas/"+f.doc.id);await selectDocumentSection(page,"attachments");await page.getByRole("button",{name:"Anexos e ficha física",exact:true}).click();
  const filename="Ficha física com nome completo e referência preservada "+"na operação ".repeat(6)+".png",source=await sharp({create:{width:8,height:4,channels:3,background:"#123456"}}).png().toBuffer();
  await page.getByLabel("Adicionar foto ou PDF",{exact:true}).setInputFiles({name:filename,mimeType:"image/png",buffer:source});await page.getByRole("button",{name:"Enviar anexo",exact:true}).click();await expect(page.getByRole("link",{name:filename,exact:true})).toBeVisible();
  const hashes=historyHashes(f.doc.id);expect(JSON.parse(hashes).filter((e:{version:number})=>e.version<=f.doc.version)).toEqual(JSON.parse(f.hashes));
  const before=official(f.patient,f.doc.id),count=sql("select count(*) from private.pdf_issuances where document_id="+q(f.doc.id)),sent:string[]=[];
  page.on("request",r=>{if(new URL(r.url()).pathname.startsWith("/api/")&&r.method()!=="GET"&&!isDocumentAccessReport(r))sent.push(r.url());});
  const ref=await model(browser);
  try{
    const attachment=page.getByRole("list",{name:"Arquivos anexados",exact:true}).getByRole("listitem");await expect(attachment).toHaveCount(1);
    for(const width of widths){await page.setViewportSize({width,height:1100});await ref.page.setViewportSize({width,height:1100});await fileParity(attachment,ref.page);await auditFromTop(page,"canonical attachment "+width);if(width===320)await capture(attachment,"attachment-canonical-"+info.project.name);}
    await page.goto("/documentos/"+f.doc.id+"/arquivos?version="+f.approved.version);const row=page.locator('[data-file-id="'+issuance+'"]');await expect(row).toContainText("Versão "+f.approved.version);
    for(const width of widths){await page.setViewportSize({width,height:1100});await ref.page.setViewportSize({width,height:1100});await fileParity(row,ref.page);await auditFromTop(page,"canonical issuance "+width);if(width===320)await capture(row,"issuance-canonical-"+info.project.name);}
    const download=await page.request.get(await row.getByRole("link",{name:"Baixar PDF",exact:true}).getAttribute("href")??"");expect(download.status()).toBe(200);expect(digest(await download.body())).toBe(digest(bytes));
    await page.goto("/fichas/"+f.doc.id);await selectDocumentSection(page,"history");await page.getByRole("button",{name:"Versões e integridade",exact:true}).click();await page.getByRole("button",{name:"Consultar versão "+f.approved.version,exact:true}).click();
    const frozen=page.getByRole("article",{name:"Conteúdo preservado da versão "+f.approved.version,exact:true});await expect(frozen).toContainText(f.oldName);await expect(frozen).toContainText(f.oldProduct);await expect(frozen).not.toContainText(f.newName);
    for(const width of widths){await page.setViewportSize({width,height:1100});await ref.page.setViewportSize({width,height:1100});await styles(page.locator(".hca-document-event").first(),ref.page.locator("#canonical-style-probes .event"),["display","gap","padding-top"]);await styles(frozen.locator(".hca-definition-grid"),ref.page.locator("#canonical-style-probes .kv"),["display","gap"]);await auditFromTop(page,"canonical frozen versions "+width);}
    await page.emulateMedia({forcedColors:"active",reducedMotion:"reduce"});await auditFromTop(page,"versions forced colors");await page.emulateMedia({forcedColors:"none",reducedMotion:"no-preference"});
    await page.goto("/historico?careRecipientId="+f.patient);const document=page.locator('a.hca-document-record[href="/documentos/'+f.doc.id+'"]');await expect(document).toBeVisible();
    for(const width of widths){await page.setViewportSize({width,height:1100});await ref.page.setViewportSize({width,height:1100});await styles(document,ref.page.locator("#canonical-style-probes .record"),["gap","padding-left","padding-top"]);await auditFromTop(page,"canonical document row "+width);}
    await page.goto("/fichas");await expect(page.locator(".hca-document-kind").first()).toBeVisible();
    for(const width of widths){await page.setViewportSize({width,height:1100});await ref.page.setViewportSize({width,height:1100});await styles(page.locator(".hca-document-kind").first(),ref.page.locator("#canonical-style-probes .record-icon"),["width","height","border-radius","background-color"]);await auditFromTop(page,"canonical forms hub "+width);}
    expect(official(f.patient,f.doc.id)).toBe(before);expect(historyHashes(f.doc.id)).toBe(hashes);expect(sql("select count(*) from private.pdf_issuances where document_id="+q(f.doc.id))).toBe(count);expect(sent).toEqual([]);
  }finally{await ref.context.close();}
});

test("06.5 public reference and native signed file retain distinct results in canonical forms and facts",async({page,browser},info)=>{
  const f=await setup(),owner=await actor("family",f.patient),doc=await rpc(owner,"create_supply_document",{p_patient:f.patient,p_type:"COM",p_payload:{origin:"purchase",lines:[{productId:f.products[0],quantity:"1"}]},p_key:randomUUID(),p_draft:false});await login(page,f.patient);
  const pdf=await generatedPdf(page,"/api/documents/"+doc.id+"/pdf"),bytes=await pdf.body(),id=new URL(pdf.url()).searchParams.get("issuance");expect(pdf.status()).toBe(200);
  const archive=pdfArchivePageSchema.parse(await(await page.request.get("/api/documents/"+doc.id+"/archive")).json()),entry=archive.data.find(e=>e.kind==="issuance"&&e.issuance.id===id);if(entry?.kind!=="issuance")throw Error("Native issuance missing from archive");
  const before=official(f.patient,doc.id),count=sql("select count(*) from private.pdf_issuances where document_id="+q(doc.id));await page.context().clearCookies();expect((await page.request.get("/api/context")).status()).toBe(401);
  await page.goto("/verificar/emissao/"+entry.issuance.verificationCode);const result=page.getByRole("region",{name:"Resultado da verificação",exact:true});await expect(result).toContainText("Envie o arquivo para verificar seus bytes");
  const ref=await model(browser);try{
    for(const width of widths){await page.setViewportSize({width,height:1100});await ref.page.setViewportSize({width,height:1100});await auditFromTop(page,"canonical code reference "+width);}
    const filename="Exemplar com nome completo "+"preservado ".repeat(10)+".pdf";await page.getByLabel("Arquivo PDF para conferir",{exact:true}).setInputFiles({name:filename,mimeType:"application/pdf",buffer:bytes});await expect(page.locator(".hca-selected-file")).toContainText(filename);await page.getByRole("button",{name:"Conferir PDF",exact:true}).click();await expect(result).toContainText("Os bytes coincidem");await expect(result).toContainText("Cadeia interna reconhecida");
    for(const width of widths){await page.setViewportSize({width,height:1100});await ref.page.setViewportSize({width,height:1100});await styles(result.locator(".hca-definition-grid"),ref.page.locator("#canonical-style-probes .kv"),["display","gap"]);await auditFromTop(page,"canonical signed file result "+width);if(width===320)await capture(result,"verification-canonical-"+info.project.name);}
    await page.emulateMedia({forcedColors:"active",reducedMotion:"reduce"});await auditFromTop(page,"verification forced colors");expect((await page.request.get("/api/documents/"+doc.id+"/pdf?issuance="+id)).status()).toBe(401);expect(official(f.patient,doc.id)).toBe(before);expect(sql("select count(*) from private.pdf_issuances where document_id="+q(doc.id))).toBe(count);
  }finally{await ref.context.close();}
});

test("06.5 private resume summary and native CAS comparison retain both complete editions without official effects",async({page,browser},info)=>{
  const f=await privateDraftFixture(),content=reqContent(f);content.observations=["Observação preservada "+"com conteúdo completo ".repeat(7)];const saved=await rpc(f.pro,"creation_draft_command",savePacket(f,"REQ",content));const before=officialState(f);
  await login(page,f.patient,fixtures.professional.email);await page.goto("/fichas/req");const panel=page.getByRole("region",{name:"Rascunho privado",exact:true});await expect(panel).toContainText(content.observations[0]);const ref=await model(browser);
  try{
    for(const width of widths){await page.setViewportSize({width,height:1100});await ref.page.setViewportSize({width,height:1100});await styles(panel.locator('dl[aria-label="Referências do preenchimento preservado"]'),ref.page.locator("#canonical-style-probes .kv"),["display","gap"]);await auditFromTop(page,"canonical private summary "+width);}
    await panel.getByRole("button",{name:"Continuar rascunho",exact:true}).click();for(let i=0;i<5;i++)await page.getByRole("button",{name:/^Avançar$|^Revisar$/}).click();const local="Minha edição própria "+"que deve permanecer completa ".repeat(6);await page.getByLabel("Observação 1",{exact:true}).fill(local);
    const remote={...content,observations:["Edição do servidor "+"que permanece separada ".repeat(6)]};await rpc(f.pro,"creation_draft_command",savePacket(f,"REQ",remote,saved.id,saved.revision));await page.getByRole("button",{name:/^Avançar$|^Revisar$/}).click();await page.getByRole("button",{name:"Salvar rascunho",exact:true}).click();const comparison=panel.locator(".hca-draft-comparison");await expect(comparison).toContainText(local);await expect(comparison).toContainText(remote.observations[0]);
    for(const width of widths){await page.setViewportSize({width,height:1100});await auditFromTop(page,"canonical private CAS "+width);expect(await comparison.evaluate(n=>Array.from(n.children).every(c=>c.getBoundingClientRect().right<=innerWidth))).toBe(true);}
    await page.emulateMedia({forcedColors:"active",reducedMotion:"reduce"});await auditFromTop(page,"private CAS forced colors");await page.emulateMedia({forcedColors:"none",reducedMotion:"no-preference"});await page.setViewportSize({width:320,height:1100});await capture(comparison.getByRole("region",{name:"Minha edição",exact:true}),"draft-comparison-canonical-"+info.project.name);expect(officialState(f)).toBe(before);
  }finally{await ref.context.close();}
});
