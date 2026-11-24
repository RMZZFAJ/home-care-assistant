import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { setup, rpc, fixtures } from "../integration/v4-fixtures.mjs";
import { autonomousReturnFixture, declaredAutonomousReturn, transferCommand } from "../integration/autonomous-return-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";
import { stockMovement } from "./stock-operation";

test.setTimeout(180_000);
const widths = [320,390,768,1024,1440];
const catalogue = (name: string) => [{ name, category: "higiene", unit: "unidade", aliases: ["Alias preservado para pesquisa"] }];
async function login(page: Page, patient: string) {
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword); await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible(); await selectContext(page,patient);
}
async function model(browser: Browser, route: string) {
  const context = await browser.newContext(), page = await context.newPage(); await page.route(/^https?:/, route => route.abort());
  await page.goto(pathToFileURL(resolve("Home_Care_Assistant_Modelo_Integral.html")).href + "#" + route); await page.locator("#roleSelect").selectOption("admin");
  return { context,page };
}
function writes(page: Page) { const sent: string[] = []; page.on("request", r => { if (new URL(r.url()).pathname.startsWith("/api/") && r.method() !== "GET") sent.push(r.url()); }); return sent; }
const facts = (patient: string) => sql(`select jsonb_build_object('catalogue',(select jsonb_agg(to_jsonb(p) order by product_id) from public.care_recipient_products p where care_recipient_id=${q(patient)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)}),'documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${q(patient)}),'reports',(select jsonb_agg(to_jsonb(r) order by id) from public.consumption_reports r where care_recipient_id=${q(patient)}),'presentations',(select jsonb_agg(to_jsonb(p) order by id) from public.product_presentations p where care_recipient_id=${q(patient)}));`);
async function tableParity(table: Locator, reference: Page, width: number) {
  const ref = reference.locator(".tablewrap.mobilecards").first(); await expect(ref).toBeVisible();
  for (const p of ["border-radius","border-color","background-color"] as const) await expect(table.locator("..")).toHaveCSS(p,await ref.evaluate((n,p) => getComputedStyle(n).getPropertyValue(p),p));
  const row = table.locator("tbody tr").first();
  for (const p of ["display","padding-left","padding-top","gap"] as const) await expect(row).toHaveCSS(p,await ref.locator("tbody tr").first().evaluate((n,p) => getComputedStyle(n).getPropertyValue(p),p));
  expect(await row.evaluate(node => node.getBoundingClientRect().width)).toBeLessThanOrEqual(width);
}
async function capture(node: Locator, file: string) {
  await node.evaluate(node => node.scrollIntoView({ block: "center",inline: "nearest",behavior: "instant" }));
  expect(await node.evaluate(node => { const r=node.getBoundingClientRect(),x=r.left+r.width/2;return [r.top+12,r.bottom-12].every(y=>y>0&&y<innerHeight&&node.contains(document.elementFromPoint(x,y))); })).toBe(true);
  mkdirSync("output/playwright/phase-d",{recursive:true});await node.screenshot({path:`output/playwright/phase-d/${file}.png`,animations:"disabled"});
}

function transitQuantity(card: Locator, label: string) {
  return card.locator(".hca-transit-quantities > div")
    .filter({ has: card.page().getByText(label, { exact: true }) }).locator("dd strong");
}

test("06.4 stock transit and movement cards retain four factual quantities and distinguish current catalogue from preserved origin", async ({page},info) => {
  const originalName="Material histórico "+"com nome preservado ".repeat(5)+randomUUID().slice(0,8),currentName="Nome atual do cadastro "+randomUUID().slice(0,8);
  const f=await setup({catalogue:catalogue(originalName)});
  const doc=await rpc(f.admin,"create_supply_document",{p_patient:f.patient,p_type:"ENT",p_key:randomUUID(),p_draft:false,p_payload:{source:"FAMILY",destination:"CARE_TEAM",recipientId:fixtures.professional.id,recipientReason:"Escolha pessoal fictícia para conferir trânsito",lines:[{productId:f.products[0],quantity:"5"}]}});
  await rpc(f.admin,"admin_upsert_recipient_product",{p_care_recipient_id:f.patient,p_product_id:f.products[0],p_name:currentName,p_category:"higiene",p_unit:"unidade",p_aliases:[],p_is_active:true});
  await login(page,f.patient);const before=facts(f.patient),sent=writes(page);
  await page.goto(`/estoque?careRecipientId=${f.patient}&custody=TRANSIT`);
  const transit=page.locator(".hca-transit-stock"),line=transit.locator(".hca-transit-material");await expect(line).toContainText(originalName);
  await expect(transitQuantity(line, "Expedido")).toHaveText("5 unidade");
  await expect(transitQuantity(line, "Recebido")).toHaveText("0 unidade");
  await expect(line.getByText(/Conciliado|Divergência em avaliação/)).toHaveCount(0);
  const pending = line.locator(".hca-transit-remaining");
  await expect(pending.getByText("Ainda em trânsito", { exact: true })).toBeVisible();
  await expect(pending.locator("strong")).toHaveText("5 unidade");
    await page.setViewportSize({width:360,height:850});
    const opener = line.getByRole("button", { name: doc.code, exact: true });
    await opener.click();
    const complete = page.getByRole("dialog", { name: doc.code, exact: true });
    await expect(complete.getByRole("tab", { name: "Materiais", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(complete.locator("[data-visit-material=true]")).toContainText("Material consultado");
    await complete.getByRole("button", { name: "Voltar ao painel", exact: true }).click();
    await expect(opener).toBeFocused();
    for(const width of widths){await page.setViewportSize({width,height:1100});await auditFromTop(page,"canonical transit "+width);}
    await page.goto(`/estoque?careRecipientId=${f.patient}&custody=FAMILY`);
    await expect(page.locator("[data-stock-act]")).toHaveCount(2);
    const movement=sql(`select id::text from public.stock_movements where care_recipient_id=${q(f.patient)} and reference_id=${q(doc.id)} order by id limit 1;`);
    const row = await stockMovement(page, movement);
    await expect(row).toContainText(currentName);
    for(const width of widths){await page.setViewportSize({width,height:1100});await auditFromTop(page,"canonical movement history "+width);if(width===320)await capture(row,"stock-movement-"+info.project.name);}
    await page.emulateMedia({forcedColors:"active",reducedMotion:"reduce"});await auditFromTop(page,"stock history forced colors");await page.emulateMedia({forcedColors:"none",reducedMotion:"no-preference"});
    await row.getByRole("button",{name:/^Consultar origem ·/}).click();
    const drawer=page.getByRole("dialog",{name:"Origem da movimentação",exact:true});await expect(drawer.getByRole("region",{name:"Material na ficha de origem",exact:true})).toContainText(originalName);
    expect(facts(f.patient)).toBe(before);
    expect(sent.map(url => new URL(url).pathname)).toEqual([`/api/documents/${doc.id}/access`]);
});

test("devolução em trânsito mostra a rota própria, a diferença e a mesma ficha de origem", async ({ page }, info) => {
  const f = await autonomousReturnFixture();
  const deliveries = [];
  for (const amount of [2, 4]) {
    deliveries.push(await rpc(f.admin, "create_supply_document", {
      p_patient: f.patient, p_type: "ENT", p_key: randomUUID(), p_draft: false,
      p_payload: { source: "FAMILY", destination: "CARE_TEAM", recipientId: fixtures.professional.id,
        recipientReason: "Recebedor indicado para conferência das entregas.", lines: [{ productId: f.products[0], quantity: String(amount) }] },
    }));
  }
  const { document } = await declaredAutonomousReturn(f);
  const agreed = await transferCommand(f.counterparty.client, document.id, "agree", document.version, { reason: "Conferi a declaração de devolução." });
  expect(agreed.error).toBeNull();
  const dispatched = await transferCommand(f.initiator.client, document.id, "dispatch", agreed.data.version);
  expect(dispatched.error).toBeNull();
  const received = await rpc(f.recipient.client, "supply_document_command", {
    p_id: document.id, p_action: "receive", p_version: dispatched.data.version, p_key: randomUUID(),
    p_body: { countedReceipt: { lines: [{ lineId: dispatched.data.lines[0].id, receivedQuantity: "3" }] } },
  });
  expect(received.kind).toBe("DEV");

  await login(page, f.patient);
  const before = facts(f.patient);
  await page.goto(`/estoque?careRecipientId=${f.patient}&custody=TRANSIT`);
  const transit = page.getByRole("dialog", { name: "Materiais em trânsito", exact: true });
  const toTeam = transit.getByRole("region", { name: "Entregas para o estoque da equipe", exact: true });
  for (const delivery of deliveries) await expect(toTeam.getByRole("button", { name: delivery.code, exact: true })).toBeVisible();
  await expect(toTeam.getByText("2 fichas vinculadas", { exact: true })).toBeVisible();

  const toFamily = transit.getByRole("region", { name: "Devoluções para o estoque da família", exact: true });
  await expect(toFamily.getByRole("button", { name: received.code, exact: true })).toBeVisible();
  await expect(transitQuantity(toFamily, "Expedido")).toHaveText("5 unidade");
  await expect(transitQuantity(toFamily, "Recebido")).toHaveText("3 unidade");
  await expect(toFamily.getByText("Falta informada · 2 unidade", { exact: true })).toBeVisible();
  await expect(toFamily.locator("time")).toHaveAttribute("datetime", dispatched.data.transfer.dispatchedAt);
  await transit.getByRole("button", { name: "Fechar", exact: true }).click();

  const chip = page.getByRole("button", { name: /2 unidade em trânsito.*Destino · Família/ });
  await chip.click();
  const returns = page.getByRole("dialog", { name: "Devoluções em trânsito", exact: true });
  const opener = returns.getByRole("button", { name: received.code, exact: true });
  await expect(opener).toBeVisible();
  await expect(returns.getByRole("region", { name: "Entregas para o estoque da equipe", exact: true })).toHaveCount(0);
  for (const width of [360, 412]) {
    await page.setViewportSize({ width, height: 900 });
    const metrics = returns.locator(".hca-transit-quantities");
    expect(await metrics.evaluate(node => {
      const [first, second] = Array.from(node.querySelectorAll("dt"), item => item.getBoundingClientRect());
      return first.y === second.y && first.right < second.left && node.scrollWidth <= node.clientWidth;
    })).toBe(true);
    const path = info.outputPath(`dev-transito-${width}.png`);
    await returns.screenshot({ path, animations: "disabled" });
    await info.attach(`Devolução em trânsito em ${width} px`, { path, contentType: "image/png" });
  }
  await opener.click();
  const complete = page.getByRole("dialog", { name: received.code, exact: true });
  await expect(complete.getByRole("tab", { name: "Materiais", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(complete.locator("[data-visit-material=true]")).toContainText("Material consultado");
  await complete.getByRole("button", { name: "Voltar ao painel", exact: true }).click();
  await expect(opener).toBeFocused();
  await returns.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(chip).toBeFocused();
  expect(facts(f.patient)).toBe(before);
});

test("06.4 catalogue units and presentations retain aliases,precision,leading zero and conversion across canonical table cards", async ({page,browser},info) => {
  const name="Material de catálogo "+"com nome extenso ".repeat(6)+randomUUID().slice(0,8),f=await setup({catalogue:catalogue(name)});
  const presentation=await rpc(f.admin,"catalogue_presentation_command",{p_patient:f.patient,p_id:null,p_version:null,p_key:randomUUID(),p_body:{productId:f.products[0],barcode:"0012345678905",name:"Pacote preservado com oito unidades",baseQuantity:"8",active:true}});
  expect(presentation).toBeTruthy();await login(page,f.patient);const before=facts(f.patient),sent=writes(page),ref=await model(browser,"catalogo/materiais");
  try{
    await page.goto(`/admin?careRecipientId=${f.patient}&section=catalog`);
    const list=page.getByRole("region",{name:"Produtos do catálogo",exact:true}),row=list.locator("[data-product-id]");
    await expect(row).toHaveCount(1);await expect(row).toContainText("Alias preservado para pesquisa");await expect(row).toContainText("Precisão 0 casa(s)");
    for(const width of widths){await page.setViewportSize({width,height:1100});expect(await row.evaluate(node=>node.getBoundingClientRect().width)).toBeLessThanOrEqual(width);await auditFromTop(page,"canonical catalogue "+width);if(width===320)await capture(row,"catalogue-material-"+info.project.name);}
    await page.goto(`/unidades?careRecipientId=${f.patient}`);const units=page.getByRole("table",{name:"Unidades base",exact:true}),packs=page.getByRole("table",{name:"Apresentações por material",exact:true});
    await expect(units.locator("tbody tr").first()).toBeVisible();await expect(packs).toContainText("0012345678905");await expect(packs).toContainText("1 embalagem = 8 unidade");
    for(const width of widths){await page.setViewportSize({width,height:1100});await ref.page.setViewportSize({width,height:1100});await tableParity(units,ref.page,width);await tableParity(packs,ref.page,width);await auditFromTop(page,"canonical units presentations "+width);}
    await page.emulateMedia({forcedColors:"active",reducedMotion:"reduce"});await auditFromTop(page,"catalogue forced colors");
    expect(facts(f.patient)).toBe(before);expect(sent).toEqual([]);
  }finally{await ref.context.close();}
});

test("06.4 consumption canonical record preserves original author,complete text and structured declaration without debit", async ({page,browser},info) => {
  const name="Material do relato "+"com nome extenso ".repeat(5)+randomUUID().slice(0,8),f=await setup({catalogue:catalogue(name)}),reporter=await shiftWorker(f.patient,"family");
  const author="Pessoa autora do relato "+"com nome preservado ".repeat(4),body="Declaração operacional própria "+"com informação completa ".repeat(5);
  sql(`update public.profiles set full_name=${q(author.trim())} where id=${q(reporter.id)};`);
  const id=await rpc(reporter.client,"report_extraordinary_consumption",{p_patient:f.patient,p_kind:"consumption",p_location:"FAMILY",p_text:body.trim(),p_lines:[{productId:f.products[0],quantity:"2"}],p_key:randomUUID()});
  sql(`update public.profiles set full_name='Nome atual diferente do relato' where id=${q(reporter.id)};`);
  await login(page,f.patient);
  const before=facts(f.patient),sent=writes(page),referenceContext=await browser.newContext();
  try{
    const lab = await referenceContext.newPage();
    await lab.route(/^https?:/, route => route.abort());
    await lab.goto(pathToFileURL(resolve("hca-laboratorio-03-v4-aprovado.html")).href);
    await lab.evaluate(() => {
      const reference = (window as unknown as { HCA: { lab: { width: number }; launch: (scenario: string, state: string) => void } }).HCA;
      reference.lab.width = 360;
      reference.launch("E07-07", "pending");
    });
    const referenceCard = lab.locator(".st-record-card").first();
    await expect(referenceCard).toBeVisible();

    await page.goto(`/consumo?careRecipientId=${f.patient}`);
    const row = page.locator(`[data-consumption-id="${id}"]`);
    const card = row.getByRole("button", { name: "Abrir relato " + id, exact: true });
    await expect(row).toContainText(author.trim());
    await expect(row).toContainText(body.trim());
    await expect(row).toContainText("2 unidade de " + name);
    await expect(row).not.toContainText("Nome atual diferente do relato");
    await expect(card).toHaveCSS("border-radius", await referenceCard.evaluate(node => getComputedStyle(node).borderRadius));
    for (const width of widths) {
      await page.setViewportSize({width, height:1100});
      expect(await card.evaluate(node => {
        const sections = [...node.querySelectorAll(".hca-consumption-card-top, .hca-consumption-card-title, .hca-consumption-card-materials, .hca-consumption-card-footer")];
        return sections.length === 4 && sections.every((section, index) => index === 0
          || section.getBoundingClientRect().top >= sections[index - 1].getBoundingClientRect().bottom);
      })).toBe(true);
      await auditFromTop(page, "canonical consumption record " + width);
      if (width === 320) await capture(row, "consumption-record-" + info.project.name);
    }
    await row.getByRole("button",{name:"Abrir relato "+id,exact:true}).click();const detail=page.getByRole("region",{name:"Detalhe do relato",exact:true});await expect(detail).toContainText(body.trim());await expect(detail.locator(".hca-material-review")).toContainText(name);await expect(detail.locator(".hca-material-review")).toContainText("2 unidade");await expect(detail.getByRole("button",{name:"Conferir consumo",exact:true})).toBeVisible();
    await page.emulateMedia({forcedColors:"active",reducedMotion:"reduce"});await auditFromTop(page,"consumption forced colors");expect(facts(f.patient)).toBe(before);expect(sent).toEqual([]);
  }finally{await referenceContext.close();}
});
