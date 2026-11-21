import { openOperationalDocumentAction } from "./document-sections";
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { setup, issue, delivery, actor, rpc, fixtures } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import { audit } from "./accessibility-audit";

test.setTimeout(150_000);
async function login(page:Page,patient:string) {
  await page.goto("/login");
  await page.getByLabel("E-mail",{exact:true}).fill(fixtures.family.email);
  await page.getByLabel("Senha",{exact:true}).fill(fixturePassword);
  await page.getByRole("button",{name:"Entrar",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Visão geral",exact:true})).toBeVisible();
  await selectContext(page,patient);
}
async function capture(page:Page,label:string) {
  mkdirSync("output/playwright/l1",{recursive:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`output/playwright/l1/${label}-${test.info().project.name}.png`,fullPage:true,animations:"disabled"});
}
test("L1 acesso e início mantêm a composição em desktop, 360 e 412 pixels",async({page})=>{
  await page.goto("/login");
  for(const width of [1440,360,412]){
    await page.setViewportSize({width,height:940});
    await expect(page.getByRole("button",{name:"Entrar",exact:true})).toBeVisible();
    await audit(page,"L1 login "+width);await capture(page,"login-"+width);
  }
  const f=await setup();const req=await issue(f.patient,f.products);await login(page,f.patient);
  const attention=page.locator(".hca-task-attention-banner"),dismiss=attention.getByRole("button",{name:"Ocultar este aviso por 24 horas",exact:true});
  if(await dismiss.count()){
    const previous=await attention.getByRole("heading").first().innerText();
    await dismiss.click();
    await expect(attention.getByRole("heading",{name:previous,exact:true})).toHaveCount(0);
  }
  for(const width of [1440,360,412]){
    await page.setViewportSize({width,height:940});
    await expect(page.locator(".hca-home-requests")).toContainText(sql("select code from public.operational_documents where id="+q(req.id)));
    if(width<850){
      const tops=await page.locator(".hca-home-tasks,.hca-dashboard-notices,.hca-home-requests").evaluateAll(nodes=>nodes.map(node=>({name:node.className,top:node.getBoundingClientRect().top})).sort((a,b)=>a.top-b.top).map(x=>x.name));
      expect(tops[0]).toContain("hca-home-tasks");expect(tops[1]).toContain("hca-dashboard-notices");expect(tops[2]).toContain("hca-home-requests");
    }
    await capture(page,"inicio-"+width);
  }
});
test("L1 ciência perdida recupera o mesmo conteúdo; @todos impede privado e Materiais reúne atendimento",async({page})=>{
  const f=await setup(),req=await issue(f.patient,f.products);await login(page,f.patient);
  await page.goto(`/documentos/${req.id}`);await selectDocumentSection(page,"materials");
  await expect(page.getByRole("tab",{name:"Atendimento",exact:true})).toHaveCount(0);
  const materials = page.getByRole("region", { name: "Materiais requisitados", exact: true });
  const filter = materials.getByRole("button", { name: /^Todos \(\d+\)$/ }).and(materials.locator("button[aria-expanded]"));
  await filter.click();
  await expect(materials.getByRole("button", { name: /^Urgentes \(\d+\)$/ })).toBeVisible();
  await filter.click();
  const macro=page.locator("details.hca-document-macro");await expect(macro).not.toHaveAttribute("open","");
  let posts=0;
  await page.route(`**/api/requisitions/${req.id}/science`,async route=>{
    if(route.request().method()!=="POST")return route.continue();posts++;
    const response=await route.fetch();expect(response.ok()).toBe(true);await route.abort("failed");
  });
  await openOperationalDocumentAction(page, "Registrar minha ciência");await page.getByRole("button",{name:"Confirmar minha ciência",exact:true}).click();
  await expect(page.getByText("Ciência registrada para o conteúdo confirmado.",{exact:true})).toBeVisible();
  expect(posts).toBe(1);expect(sql(`select count(*) from public.requisition_science_events where requisition_id=${q(req.id)} and user_id=${q(fixtures.family.id)} and mode='express'`)).toBe("1");
  await page.unroute(`**/api/requisitions/${req.id}/science`);
  await selectDocumentSection(page,"progress");await page.getByRole("button",{name:"Novo andamento",exact:true}).click();
  await expect(page.getByRole("dialog",{name:"Novo andamento",exact:true}).getByRole("switch")).toHaveCount(0);
  await page.getByRole("dialog",{name:"Novo andamento",exact:true}).getByRole("button",{name:"Fechar diálogo",exact:true}).click();
  await page.getByLabel("Menu do usuário",{exact:true}).click();await page.getByRole("menuitem",{name:"Sair",exact:true}).click();
  await page.goto("/login");await page.getByLabel("E-mail",{exact:true}).fill(fixtures.professional.email);await page.getByLabel("Senha",{exact:true}).fill(fixturePassword);await page.getByRole("button",{name:"Entrar",exact:true}).click();await expect(page.getByRole("heading",{name:"Visão geral",exact:true})).toBeVisible();await selectContext(page,f.patient);
  await page.goto(`/documentos/${req.id}`);await selectDocumentSection(page,"progress");await page.getByRole("button",{name:"Novo andamento",exact:true}).click();
  const editor=page.getByRole("dialog",{name:"Novo andamento",exact:true});
  await editor.getByRole("textbox",{name:"Texto do andamento",exact:true}).fill("Registro fictício para @todos");
  await expect(editor.getByRole("switch")).toHaveCount(0);
  await expect(editor.getByRole("status").filter({hasText:"Você mencionou @todos."})).toContainText("visível a todos com acesso à ficha");
  await audit(page,"L1 andamento coletivo");await capture(page,"andamento-todos");
});
test("L2 compara a alteração real da ENT antes de atualizar e separa novo Andamento",async({page})=>{
  const f=await setup(),req=await issue(f.patient,f.products),ent=await delivery(f.patient,req,[f.products[0]],{requestFulfillment:"partial"});
  await login(page,f.patient);await page.goto(`/documentos/${ent.id}`);await selectDocumentSection(page,"materials");
  await expect(page.getByRole("tabpanel")).toContainText("Em trânsito");
  const before = await (await page.request.get(`/api/documents/${ent.id}`)).json();
  expect(before.data.lines[0]).toMatchObject({ accepted_quantity: 0, family_fulfillment: "partial" });
  const banner=page.locator(".hca-document-freshness");
  const documentResponse = () => page.waitForResponse(response =>
    new URL(response.url()).pathname === `/api/documents/${ent.id}` && response.request().method() === "GET");
  const unchanged = documentResponse();
  const note = await page.request.post(`/api/documents/${ent.id}/progress`, {
    data: { key: randomUUID(), content: { category: "record", stage: null, text: "Andamento privado da família para conferir a atualização.", references: [] },
      publication: { relevance: "normal", mentions: [], visibility: "family" } },
  });
  expect(note.ok()).toBe(true);
  await page.evaluate(()=>window.dispatchEvent(new Event("hca:data-changed")));
  expect((await unchanged).ok()).toBe(true);
  await selectDocumentSection(page, "progress");
  await expect(page.getByRole("tabpanel")).toContainText("Andamento privado da família para conferir a atualização.");
  await expect(banner).toHaveCount(0);
  await selectDocumentSection(page, "materials");
  const receiver=await actor("professional",f.patient);
  await rpc(receiver,"supply_document_command",{p_id:ent.id,p_action:"receive",p_body:{divergences:[]},p_key:randomUUID(),p_version:ent.version});
  await page.evaluate(()=>window.dispatchEvent(new Event("hca:data-changed")));
  await expect(banner).toBeVisible();
  await expect(page.getByRole("button",{name:"Gerar PDF",exact:true})).toBeDisabled();
  const opener = banner.getByRole("button", { name: "Ver o que mudou", exact: true });
  await page.setViewportSize({ width: 390, height: 760 });
  await opener.click();
  const modal = page.getByRole("dialog", { name: "Esta ficha recebeu alterações", exact: true });
  const amount = modal.locator("dl > div").filter({ hasText: "Quantidade reconhecida no recebimento" });
  await expect(amount.locator("del")).toContainText(/Antes: 0 /);
  await expect(amount.locator("strong")).toContainText(/Agora: 10 /);
  await expect(modal.getByText("Atendimento da necessidade", { exact: false })).toHaveCount(0);
  await capture(page,"ent-alteracao-390");
  await audit(page, "L2 comparação de alteração na ficha");
  await modal.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  await expect(opener).toBeFocused();
  await expect(banner).toBeVisible();
  await opener.click();
  await modal.getByRole("button",{name:"Atualizar agora",exact:true}).click();
  await expect(banner).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Gerar PDF", exact: true })).toBeEnabled();
  await expect(page.getByRole("tabpanel").getByText("Atendimento parcial · necessidade em aberto", { exact: true })).toBeVisible();
  for(const width of [360,412]){await page.setViewportSize({width,height:940});await capture(page,"ent-materiais-"+width);}
});
