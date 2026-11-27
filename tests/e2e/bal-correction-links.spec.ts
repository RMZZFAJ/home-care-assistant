import { test,expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync,writeFileSync } from "node:fs";
import { PDF } from "@libpdf/core";
import { correctionFixture,applyCorrection,extraCorrectionFixture } from "../integration/bal-correction-fixtures.mjs";
import { fixtures } from "../integration/v4-fixtures.mjs";
import { sql,sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { openBalanceComparison, selectDocumentSection } from "./document-sections";
import { audit, auditFromTop } from "./accessibility-audit";
import { generatedPdf } from "./generated-pdf";

test.setTimeout(180_000);
test.afterEach(async({page})=>page.unrouteAll({behavior:"wait"}));
const stock=(patient:string)=>sql("select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id="+q(patient));
test("BAL shows actual later corrections, exact version links and masked stock without changing the original opinion",async({page},info)=>{
 const f=await correctionFixture();
 await page.goto("/login");await page.getByLabel("E-mail",{exact:true}).fill(fixtures.family.email);await page.getByLabel("Senha",{exact:true}).fill(fixturePassword);
 await page.getByRole("button",{name:"Entrar",exact:true}).click();await expect(page.getByRole("heading",{name:"Visão geral",exact:true})).toBeVisible();await selectContext(page,f.patient);
 const writes:string[]=[];page.on("request",r=>{if(new URL(r.url()).pathname==="/api/documents/"+f.document.id&&r.method()==="POST")writes.push(r.method());});
 await page.goto("/fichas/"+f.document.id);await selectDocumentSection(page,"reviews");
 const region=page.getByRole("region",{name:"Atos posteriores vinculados a este material",exact:true});
 await expect(region).toContainText("Reconto 2");await expect(region).toContainText("contado neste reconto: 2 unidade");
 await expect(region).toContainText("Reconto registrado; contagem não aplicada ao estoque.");
 const link=region.getByRole("link",{name:"Consultar versão "+f.recount.version+" do reconto",exact:true});
 await expect(link).toHaveAttribute("href","/documentos/"+f.document.id+"/arquivos?version="+f.recount.version);
 await openBalanceComparison(page);
 const before=stock(f.patient);for(const width of [1440,1024,768,390,320]){
  await page.setViewportSize({width,height:940});
  const scroll=page.getByRole("region",{name:"Materiais da contagem; rolagem horizontal quando necessária",exact:true});
  // ResizeObserver updates the tab stop after layout; inspect the settled
  // keyboard contract before axe freezes its own geometry snapshot.
  await expect.poll(()=>scroll.evaluate(node=>(node.scrollWidth>node.clientWidth||node.scrollHeight>node.clientHeight) ? node.tabIndex===0 : !node.hasAttribute("tabindex"))).toBe(true);
  if(await scroll.evaluate(node=>node.scrollWidth>node.clientWidth)){
   await scroll.focus();await expect(scroll).toBeFocused();await scroll.press("ArrowRight");
   await expect.poll(()=>scroll.evaluate(node=>node.scrollLeft)).toBeGreaterThan(0);
   await scroll.evaluate(node=>{node.scrollLeft=0;});
  }
  await audit(page,"bal-count-comparison-"+width);
  await selectDocumentSection(page,"reviews");
  await link.focus();
  await expect(link).toBeFocused();
  await expect.poll(() => link.evaluate(node => {
    const bounds = node.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    return [bounds.top + 3, bounds.bottom - 3].every(y => node.contains(document.elementFromPoint(x, y)));
  })).toBe(true);
  await auditFromTop(page, "bal-correction-links-" + width);
  await selectDocumentSection(page,"counts");
 }
 await selectDocumentSection(page,"reviews");
 mkdirSync("output/playwright/phase-d",{recursive:true});await region.screenshot({path:"output/playwright/phase-d/bal-correction-pending-"+info.project.name+".png",animations:"disabled"});
 expect(stock(f.patient)).toBe(before);expect(writes).toEqual([]);
 const applied=await applyCorrection(f),after=stock(f.patient);expect(after).not.toBe(before);
 await page.setViewportSize({width:1440,height:940});await page.getByRole("button",{name:"Atualizar ficha",exact:true}).click();
 await expect(region).toContainText("Aplicado por "+applied.balanceReview.application.actorName);
 await expect(region).toContainText("Saldo após a aplicação deste reconto: 2 unidade");
 await expect(region.getByRole("link",{name:"Consultar aplicação na versão "+applied.version,exact:true})).toHaveAttribute("href","/documentos/"+f.document.id+"/arquivos?version="+applied.version);
 const pdf=await generatedPdf(page,"/api/documents/"+f.document.id+"/pdf");expect(pdf.status()).toBe(200);
 mkdirSync("output/pdf/phase-d",{recursive:true});writeFileSync("output/pdf/phase-d/bal-correction-links-"+info.project.name+".pdf",await pdf.body());
 expect(stock(f.patient)).toBe(after);
 sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values("+q(f.patient)+","+q(fixtures.family.id)+",'stock.team.read',false)");
 await page.getByRole("button",{name:"Atualizar ficha",exact:true}).click();await expect(region).toContainText("Saldo após a aplicação deste reconto: Acesso restrito");
 await expect(region).toContainText("contado neste reconto: 2 unidade");
 const target="**/api/documents/"+f.document.id;
 await page.route(target,async route=>{
  if(route.request().method()!=="GET")return route.continue();const response=await route.fetch(),body=await response.json();
  body.data.balanceReview.corrections[0].acts[0].documentId=randomUUID();return route.fulfill({response,json:body});
 });
 await page.getByRole("button",{name:"Atualizar ficha",exact:true}).click();
 await expect(page.getByText("Os atos posteriores não correspondem à ficha, contagem ou versão consultada. Consulte novamente esta ficha.",{exact:true})).toBeVisible();
 await expect(region).toHaveCount(0);expect(stock(f.patient)).toBe(after);expect(writes).toEqual([]);
});

test("BAL shows the extra and its later catalogue count in the original review and PDF", async ({ page }) => {
  const f = await extraCorrectionFixture();
  const before = stock(f.patient);
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, f.patient);
  await page.goto("/fichas/" + f.document.id);
  await selectDocumentSection(page, "reviews");

  const acts = page.getByRole("region", { name: "Atos posteriores vinculados a este material", exact: true });
  await expect(acts).toContainText("Item extra · contado neste reconto: 3 caixa");
  await expect(acts).toContainText("Material do catálogo · contado neste reconto: 4 caixa");
  await expect(acts.getByText("Item contado como extra, sem movimentação de estoque.", { exact: true })).toBeVisible();
  for (const version of [f.retained.version, f.incorporated.version])
    await expect(acts.getByRole("link", { name: `Consultar versão ${version} do reconto`, exact: true }))
      .toHaveAttribute("href", "/documentos/" + f.document.id + "/arquivos?version=" + version);

  await page.setViewportSize({ width: 320, height: 940 });
  await auditFromTop(page, "bal-extra-correction-links-320");
  const response = await generatedPdf(page, "/api/documents/" + f.document.id + "/pdf");
  expect(response.status()).toBe(200);
  const pdf = await PDF.load(await response.body());
  const text = pdf.extractText().flatMap(sheet =>
    sheet.lines.flatMap(line => line.spans.map(span => span.chars.map(character => character.char).join("")))
  ).join(" ").replaceAll(/\s+/g, " ");
  expect(text).toContain(f.extra.name + " (item extra)");
  expect(text).toContain("Item contado como extra, sem movimentação de estoque.");
  expect(stock(f.patient)).toBe(before);
});
