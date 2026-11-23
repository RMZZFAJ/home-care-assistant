import { lastDraftPanel } from "./l1-long-draft-panel";
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
import { shiftWorker } from "../integration/shift-fixtures.mjs";

test.setTimeout(180_000);
const widths=[320,390,768,1024,1440],digest=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex");
async function login(page:Page,patient:string,email=fixtures.family.email,next?:string){
  await page.goto(next ? "/login?" + new URLSearchParams({ next }) : "/login");await page.getByLabel("E-mail",{exact:true}).fill(email);await page.getByLabel("Senha",{exact:true}).fill(fixturePassword);
  await page.getByRole("button",{name:"Entrar",exact:true}).click();
  if(next) await expect(page).toHaveURL(url => url.pathname + url.search === next, { timeout: 30_000 });
  else await expect(page.getByRole("heading",{name:"Visão geral",exact:true})).toBeVisible();
  await selectContext(page,patient);
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
async function laboratoryModel(browser: Browser) {
  const context = await browser.newContext(), page = await context.newPage();
  await page.route(/^https?:/, route => route.abort());
  await page.goto(pathToFileURL(resolve("hca-laboratorio-03-v4-aprovado.html")).href);
  return { context, page };
}
async function styles(actual:Locator,reference:Locator,properties:readonly string[]){for(const p of properties)await expect(actual).toHaveCSS(p,await reference.evaluate((n,p)=>getComputedStyle(n).getPropertyValue(p),p));}
async function fileParity(row: Locator, reference: Page, width: number, attachment: boolean, project: string) {
  await reference.evaluate(({ width, attachment }) => {
    const hca = (window as unknown as { HCA: { lab: { width: number }; launch: (id: string, state: string) => void } }).HCA;
    hca.lab.width = width;
    hca.launch(attachment ? "E09-04" : "E09-01", attachment ? "ready" : "previous");
  }, { width, attachment });
  const card = reference.locator(".d3-file-row").first();
  await expect(card).toBeVisible();
  await styles(row, card, ["border-radius", "border-top-color"]);
  await styles(row.locator("h3"), card.locator("h3"), ["font-size"]);
  await styles(row.locator(".hca-file-record-more"), card.locator(".d3-file-top > button"), ["border-radius"]);
  if (!attachment) await styles(row.locator(".doc-pdf-icon"), card.locator(".d4-pdf-mark"), ["width", "height", "color"]);
  expect(await row.evaluate(node => {
    const [heading, meta, footer] = Array.from(node.children, element => element.getBoundingClientRect());
    return heading.bottom <= meta.top && meta.bottom <= footer.top;
  })).toBe(true);
  const kind = attachment ? "attachment" : "issuance";
  await capture(row, `l3-${kind}-${project}-${width}`);
  await card.screenshot({ path: `output/playwright/phase-d/l3-${kind}-v4-${project}-${width}.png`, animations: "disabled" });
}
async function capture(node:Locator,file:string){
  await node.evaluate(n=>n.scrollIntoView({block:"center",behavior:"instant"}));
  // Native WebKit can finish a viewport/scroll update after evaluate returns.
  // Keep the same unobscured-edge requirement and await the settled geometry.
  await expect.poll(()=>node.evaluate(n=>{const r=n.getBoundingClientRect(),x=r.left+r.width/2;return [r.top+12,r.bottom-12].every(y=>y>0&&y<innerHeight&&n.contains(document.elementFromPoint(x,y)));})).toBe(true);
  mkdirSync("output/playwright/phase-d",{recursive:true});await node.screenshot({path:"output/playwright/phase-d/"+file+".png",animations:"disabled"});
}
const official=(patient:string,id:string)=>sql("select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id="+q(id)+"),'events',(select jsonb_agg(to_jsonb(e) order by version) from public.document_events e where document_id="+q(id)+"),'ledger',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id="+q(patient)+"));");

test("06.5 native archive attachments and historical facts share canonical rows without issuing on consultation",async({page,browser},info)=>{
  const f=await versionHistoryFixture(),viewer=await shiftWorker(f.patient,"admin");await login(page,f.patient,viewer.email,"/fichas/"+f.doc.id);
  const pdf=await generatedPdf(page,"/api/documents/"+f.doc.id+"/pdf?version="+f.approved.version);expect(pdf.status()).toBe(200);
  const bytes=await pdf.body(),issuance=new URL(pdf.url()).searchParams.get("issuance")!;
  await page.goto("/fichas/"+f.doc.id);await selectDocumentSection(page,"attachments");await page.getByRole("button",{name:"Adicionar anexo",exact:true}).click();
  const filename="Ficha física com nome completo e referência preservada "+"na operação ".repeat(6)+".png",source=await sharp({create:{width:8,height:4,channels:3,background:"#123456"}}).png().toBuffer();
  await page.getByLabel("Adicionar foto ou PDF",{exact:true}).setInputFiles({name:filename,mimeType:"image/png",buffer:source});await page.getByRole("button",{name:"Enviar anexo",exact:true}).click();await expect(page.getByRole("link",{name:filename,exact:true})).toBeVisible();
  const hashes=historyHashes(f.doc.id);expect(JSON.parse(hashes).filter((e:{version:number})=>e.version<=f.doc.version)).toEqual(JSON.parse(f.hashes));
  const before=official(f.patient,f.doc.id),count=sql("select count(*) from private.pdf_issuances where document_id="+q(f.doc.id)),sent:string[]=[];
  page.on("request",r=>{if(new URL(r.url()).pathname.startsWith("/api/")&&r.method()!=="GET"&&!isDocumentAccessReport(r))sent.push(r.url());});
  const ref=await model(browser),lab=await laboratoryModel(browser);
  try{
    const attachment=page.getByRole("list",{name:"Arquivos anexados",exact:true}).getByRole("listitem");await expect(attachment).toHaveCount(1);
    for(const width of [320,360,412,768,1024,1440]){
      await page.setViewportSize({width,height:1100});
      await auditFromTop(page,"L3 attachment "+width);
      if(width===360 || width===412) await fileParity(attachment,lab.page,width,true,info.project.name);
    }
    await page.goto("/documentos/"+f.doc.id+"/arquivos?version="+f.approved.version);const row=page.locator('[data-file-id="'+issuance+'"]');
    const href = await row.getByRole("link", { name: "Visualizar", exact: true }).getAttribute("href");
    expect(href).toContain("issuance=" + issuance);
    const details = row.getByRole("button", { name: "Identificação do exemplar", exact: true });
    await details.click();
    const panel = page.getByRole("dialog", { name: "Ficha", exact: true });
    await expect(panel).toContainText("Conteúdo da revisão "+f.approved.version);
    await expect(panel.getByRole("link", { name: "Visualizar", exact: true })).toHaveAttribute("href", href!);
    await page.evaluate(() => {
      Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
      Object.defineProperty(navigator, "share", { configurable: true, value: async ({ files }: { files: File[] }) => {
        const hash = await crypto.subtle.digest("SHA-256", await files[0].arrayBuffer());
        globalThis.document.documentElement.dataset.sharedPdfHash = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
      } });
    });
    await panel.getByRole("button", { name: "Compartilhar PDF", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-shared-pdf-hash", digest(bytes));
    await panel.getByRole("button", { name: "Voltar aos arquivos", exact: true }).click();
    await expect(details).toBeFocused();
    for(const width of [320,360,412,768,1024,1440]){
      await page.setViewportSize({width,height:1100});
      await auditFromTop(page,"L3 issuance "+width);
      if(width===360 || width===412) await fileParity(row,lab.page,width,false,info.project.name);
    }
    const download=await page.request.get(await row.getByRole("link",{name:"Baixar PDF",exact:true}).getAttribute("href")??"");expect(download.status()).toBe(200);expect(digest(await download.body())).toBe(digest(bytes));
    await page.goto("/fichas/"+f.doc.id);await selectDocumentSection(page,"history");await page.getByRole("button",{name:"Versões e integridade",exact:true}).click();await page.getByRole("button",{name:"Consultar versão "+f.approved.version,exact:true}).click();
    const frozen=page.getByRole("article",{name:"Conteúdo preservado da versão "+f.approved.version,exact:true});await expect(frozen).toContainText(f.oldName);await expect(frozen).toContainText(f.oldProduct);await expect(frozen).not.toContainText(f.newName);
    for(const width of widths){await page.setViewportSize({width,height:1100});await ref.page.setViewportSize({width,height:1100});await styles(page.locator(".hca-document-event").first(),ref.page.locator("#canonical-style-probes .event"),["display","gap","padding-top"]);await styles(frozen.locator(".hca-definition-grid"),ref.page.locator("#canonical-style-probes .kv"),["display","gap"]);await auditFromTop(page,"canonical frozen versions "+width);}
    await page.emulateMedia({forcedColors:"active",reducedMotion:"reduce"});await auditFromTop(page,"versions forced colors");await page.emulateMedia({forcedColors:"none",reducedMotion:"no-preference"});
    await page.goto("/historico?careRecipientId="+f.patient);const document=page.locator('a.av-record[href^="/documentos/'+f.doc.id+'"]');await expect(document).toBeVisible();
    await lab.page.goto(pathToFileURL(resolve("hca-laboratorio-01-v3-final.html")).href+"#/cenario/E02-13");await lab.page.reload();const close=lab.page.locator("#lab-bar [data-action='lab-toggle']");if(await close.getAttribute("aria-expanded")==="true")await close.click();
    for(const width of widths){await page.setViewportSize({width,height:1100});await lab.page.setViewportSize({width,height:1100});await styles(document,lab.page.locator(".av-record").first(),["gap","padding-left","padding-top"]);await auditFromTop(page,"L1 document row "+width);}
    await page.goto("/fichas");await expect(page.locator(".hca-document-kind").first()).toBeVisible();
    for(const width of widths){await page.setViewportSize({width,height:1100});await ref.page.setViewportSize({width,height:1100});await styles(page.locator(".hca-document-kind").first(),ref.page.locator("#canonical-style-probes .record-icon"),["width","height","border-radius","background-color"]);await auditFromTop(page,"canonical forms hub "+width);}
    expect(official(f.patient,f.doc.id)).toBe(before);expect(historyHashes(f.doc.id)).toBe(hashes);expect(sql("select count(*) from private.pdf_issuances where document_id="+q(f.doc.id))).toBe(count);expect(sent).toEqual([]);
  }finally{await ref.context.close();await lab.context.close();}
});

test("06.5 public reference and native signed file retain distinct results in canonical forms and facts",async({page},info)=>{
  const f=await setup(),owner=await actor("family",f.patient),doc=await rpc(owner,"create_supply_document",{p_patient:f.patient,p_type:"COM",p_payload:{origin:"purchase",lines:[{productId:f.products[0],quantity:"1"}]},p_key:randomUUID(),p_draft:false});await login(page,f.patient);
  const pdf=await generatedPdf(page,"/api/documents/"+doc.id+"/pdf"),bytes=await pdf.body(),id=new URL(pdf.url()).searchParams.get("issuance");expect(pdf.status()).toBe(200);
  const archive=pdfArchivePageSchema.parse(await(await page.request.get("/api/documents/"+doc.id+"/archive")).json()),entry=archive.data.find(e=>e.kind==="issuance"&&e.issuance.id===id);if(entry?.kind!=="issuance")throw Error("Native issuance missing from archive");
  const before=official(f.patient,doc.id),count=sql("select count(*) from private.pdf_issuances where document_id="+q(doc.id));await page.context().clearCookies();expect((await page.request.get("/api/context")).status()).toBe(401);
  await page.goto("/verificar/emissao/"+entry.issuance.verificationCode);const result=page.getByRole("region",{name:"Resultado da verificação",exact:true});await expect(result).toContainText("Envie o arquivo para verificar seus bytes");
  for(const width of widths){await page.setViewportSize({width,height:1100});await auditFromTop(page,"canonical code reference "+width);}
  const filename="Exemplar com nome completo "+"preservado ".repeat(10)+".pdf";
  await result.getByRole("button",{name:"Verificar o PDF recebido",exact:true}).click();
  await page.getByLabel("Arquivo PDF para conferir",{exact:true}).setInputFiles({name:filename,mimeType:"application/pdf",buffer:bytes});
  await expect(page.locator(".hca-verify-selected-file")).toContainText(filename);
  await page.getByRole("button",{name:"Verificar arquivo PDF",exact:true}).click();
  await expect(result).toContainText("Os bytes coincidem");
  const details=result.getByRole("button",{name:"Ver detalhes da conferência",exact:true}), technical=page.getByRole("dialog",{name:"Detalhes da conferência",exact:true});
  for(const width of widths){
    await page.setViewportSize({width,height:1100});
    await auditFromTop(page,"canonical signed file result "+width);
    if(width===320)await capture(result.locator(".hca-verify-evidence-list"),"verification-canonical-"+info.project.name);
    await details.click();
    await expect(technical).toContainText("Cadeia interna reconhecida");
    await expect(technical).toContainText(digest(bytes));
    await auditFromTop(page,"canonical technical details "+width);
    if(width===320)await technical.screenshot({path:"output/playwright/phase-d/verification-technical-"+info.project.name+".png",animations:"disabled"});
    await technical.getByRole("button",{name:"Fechar",exact:true}).click();await expect(details).toBeFocused();
  }
  await page.emulateMedia({forcedColors:"active",reducedMotion:"reduce"});await auditFromTop(page,"verification forced colors");expect((await page.request.get("/api/documents/"+doc.id+"/pdf?issuance="+id)).status()).toBe(401);expect(official(f.patient,doc.id)).toBe(before);expect(sql("select count(*) from private.pdf_issuances where document_id="+q(doc.id))).toBe(count);
});

test("06.5 private resume choice and native CAS comparison retain both complete editions without official effects",async({page,browser},info)=>{
  const f=await privateDraftFixture(),content=reqContent(f);content.observations=["Observação preservada "+"com conteúdo completo ".repeat(7)];const saved=await rpc(f.pro,"creation_draft_command",savePacket(f,"REQ",content));const before=officialState(f);
  await login(page,f.patient,fixtures.professional.email);await page.goto("/fichas/req");const panel=lastDraftPanel(page);await expect(panel.getByRole("button",{name:"Continuar rascunho",exact:true})).toBeVisible();const ref=await model(browser);
  try{
    for(const width of widths){await page.setViewportSize({width,height:1100});await ref.page.setViewportSize({width,height:1100});await expect(panel.getByRole("button",{name:"Descartar e começar",exact:true})).toBeEnabled();await auditFromTop(page,"canonical private summary "+width);}
    await panel.getByRole("button",{name:"Continuar rascunho",exact:true}).click();for(let i=0;i<3;i++)await page.getByRole("button",{name:/^(Selecionar materiais|Continuar|Revisar ficha)$/}).click();await expect(page.getByLabel("Observação 1",{exact:true})).toHaveValue(content.observations[0]);const local="Minha edição própria "+"que deve permanecer completa ".repeat(6);
    const remote={...content,observations:["Edição do servidor "+"que permanece separada ".repeat(6)]};await rpc(f.pro,"creation_draft_command",savePacket(f,"REQ",remote,saved.id,saved.revision));await page.getByLabel("Observação 1",{exact:true}).fill(local);const comparison=panel.locator(".hca-draft-comparison");await expect(comparison).toContainText(local);await expect(comparison).toContainText(remote.observations[0]);
    for(const width of widths){await page.setViewportSize({width,height:1100});await auditFromTop(page,"canonical private CAS "+width);expect(await comparison.evaluate(n=>Array.from(n.children).every(c=>c.getBoundingClientRect().right<=innerWidth))).toBe(true);}
    await page.emulateMedia({forcedColors:"active",reducedMotion:"reduce"});await auditFromTop(page,"private CAS forced colors");await page.emulateMedia({forcedColors:"none",reducedMotion:"no-preference"});await page.setViewportSize({width:320,height:1100});await capture(comparison.getByRole("region",{name:"Minha edição",exact:true}),"draft-comparison-canonical-"+info.project.name);expect(officialState(f)).toBe(before);
  }finally{await ref.context.close();}
});
