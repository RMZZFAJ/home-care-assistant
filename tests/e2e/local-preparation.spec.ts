import { expect,test,type Page } from "@playwright/test";
import {randomUUID} from "node:crypto";
import {mkdirSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {preparedPatient} from "../integration/local-preparation-fixtures.mjs";
import {setup,fixtures} from "../integration/v4-fixtures.mjs";
import {shiftWorker} from "../integration/shift-fixtures.mjs";
import {sql,sqlLiteral as q} from "../../scripts/test-environment.mjs";
import {fixturePassword} from "../../scripts/test-constants.mjs";
import {selectContext} from "./auth-context";
import {auditFromTop} from "./accessibility-audit";
test.setTimeout(180_000);
async function login(page: Page, account: string | { email: string }, patient: string | null) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(typeof account === "string" ? fixtures[account].email : account.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
const endpoint=(patient:string)=>"/api/guides/preparation?careRecipientId="+patient;
const physical=(patient:string)=>sql("select jsonb_build_object('stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id="+q(patient)+"),'documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id="+q(patient)+"));");

test("local preparation connects real creation adoption and opening stock without turning metadata into physical approval",async({page})=>{
 const f=await preparedPatient(),model="local-opening-"+randomUUID();
 sql("insert into public.products(id,name,category,unit,is_active) values("+[q(model),q("Material fictício de abertura guiada"),q("higiene"),q("unidade"),"true"].join(",")+")");
 await login(page,"family",f.patient);await page.goto("/guias");await page.getByRole("link",{name:/^Preparação da residência/}).click();
 await expect(page.getByRole("heading",{name:"Preparação da residência",exact:true})).toBeVisible();
 const catalogue=page.getByRole("button",{name:/^Materiais e apresentações/});
 await expect(catalogue).toContainText("Nenhum material ativo");
 expect((await(await page.request.get(endpoint(f.patient))).json()).data.catalogue.activeProducts).toBe(0);
 await catalogue.click();
 await page.getByRole("link",{name:"Preparar materiais do paciente",exact:true}).click();
 await page.getByRole("button",{name:/^Adotar um modelo/}).click();
 const adoption=page.getByRole("dialog",{name:"Adotar modelo de material",exact:true});
 await adoption.getByRole("combobox",{name:"Modelo disponível",exact:true}).selectOption(model);
 await adoption.getByRole("button",{name:"Revisar adoção",exact:true}).click();
 await page.getByRole("dialog",{name:"Adotar este modelo?",exact:true}).getByRole("button",{name:"Adotar modelo",exact:true}).click();
 await page.getByRole("dialog",{name:"Modelo adotado",exact:true}).getByRole("button",{name:"Concluir",exact:true}).click();
 await page.getByRole("link",{name:"Voltar à preparação",exact:true}).click();
 const material=page.getByRole("dialog",{name:"Materiais e apresentações",exact:true});
 await expect(material).toBeVisible();
 await material.getByRole("button",{name:"Voltar à preparação",exact:true}).click();
 await expect(catalogue).toContainText("1 material ativo");
 await page.getByRole("button",{name:/^Estoque e custódias/}).click();
 await page.getByRole("link",{name:"Preparar estoque familiar",exact:true}).click();
 await page.getByRole("button",{name:"Movimentar estoque familiar",exact:true}).click();
 const movement=page.getByRole("dialog",{name:/^(Movimentar estoque familiar|Confirmar movimentação familiar)$/});
 await movement.getByRole("combobox",{name:"Operação",exact:true}).selectOption("inbound");await movement.getByRole("combobox",{name:"Produto",exact:true}).selectOption(model);
 await movement.getByLabel("Quantidade",{exact:true}).fill("5");await movement.getByLabel("Motivo",{exact:true}).fill("Conferência física fictícia e origem declarada na preparação local");
 await movement.getByRole("button",{name:"Revisar movimentação",exact:true}).click();await movement.getByRole("button",{name:"Confirmar",exact:true}).click();await expect(page.getByText("Movimentação familiar confirmada.",{exact:false})).toBeVisible();
 const before=physical(f.patient);await page.goto("/preparacao-local?careRecipientId="+f.patient);
 const data=(await(await page.request.get(endpoint(f.patient))).json()).data;
 expect(data.catalogue.activeProducts).toBe(1);expect(data.stock.familyMovements).toBe(1);expect(data.stock.teamMovements).toBe(0);
 const continuity=page.getByRole("region",{name:"Conferência física e continuidade",exact:true});await expect(continuity).toContainText("não confirma estoque físico");
 await expect(continuity.getByRole("definition").filter({hasText:/^Ativo$/})).toHaveCount(1);
 await expect(continuity.getByRole("definition").filter({hasText:/^America\/Sao_Paulo$/})).toHaveCount(1);
 const refreshed=page.waitForResponse(response=>response.request().method()==="GET"&&response.url()===new URL(endpoint(f.patient),page.url()).href);
 await page.getByRole("button",{name:"Atualizar situação",exact:true}).click();
 expect((await refreshed).ok()).toBe(true);
 await expect(page.getByRole("dialog",{name:"Consultando a preparação",exact:true})).toHaveCount(0);
 expect(physical(f.patient)).toBe(before);expect(sql("select count(*) from public.stock_movements where care_recipient_id="+q(f.patient)+" and product_id="+q(model))).toBe("1");
});

test("E12-02 local preparation shows the areas above the approved mobile footer and fits all screen widths",async({page,browser},info)=>{
 const {patient}=await setup(), administrator=await shiftWorker(patient,"admin");
 await login(page,administrator,patient);
 await page.goto("/preparacao-local?careRecipientId="+patient);
 const contingency=page.getByRole("link",{name:"Orientação de contingência",exact:true});
 const refresh=page.getByRole("button",{name:"Atualizar situação",exact:true});
 const areas=page.getByRole("region",{name:"Áreas da preparação",exact:true});
 const areaHeading=areas.getByRole("heading",{name:"Áreas da preparação",exact:true});
 await expect(areas).toBeVisible();
 const reference=await browser.newContext({viewport:{width:1280,height:900}});
 mkdirSync("output/playwright/l4/reference",{recursive:true});
 try {
  const model=await reference.newPage();
  await model.route(/^https?:/,route=>route.abort());
  await model.goto(pathToFileURL(resolve("hca-laboratorio-04-v2-aprovado.html")).href+"#E12-02/local");
  const frame=model.locator("#device-frame");
  await expect(frame.getByRole("heading",{name:"Áreas da preparação",exact:true})).toBeVisible();
  for(const width of [360,412]){
   await model.getByRole("combobox",{name:"Visualização",exact:true}).selectOption(String(width));
   const size=await frame.boundingBox();
   if(!size)throw new Error("O laboratório não exibiu a área comparada.");
   await page.setViewportSize({width,height:Math.round(size.height)});
   await auditFromTop(page,"E12-02 local preparation "+width);
   await expect.poll(() => areaHeading.evaluate(heading => {
    const scrollArea = heading.closest(".hca-docked-content");
    if (!(scrollArea instanceof HTMLElement)) return false;
    const title = heading.getBoundingClientRect(), bounds = scrollArea.getBoundingClientRect();
    return scrollArea.scrollTop === 0 && title.top >= bounds.top && title.bottom <= bounds.bottom;
   }), { message: "The area heading should fit inside the initial scroller" }).toBe(true);
   const left=await contingency.boundingBox(), right=await refresh.boundingBox();
   expect(left && right ? right.y>=left.y+left.height && right.x>left.x && right.x+right.width<=width : false).toBe(true);
   await frame.screenshot({path:"output/playwright/l4/reference/local-preparation-"+width+".png"});
   await page.screenshot({path:"output/playwright/l4/local-preparation-"+info.project.name+"-"+width+".png"});
  }
 } finally {await reference.close();}
 for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:950});await auditFromTop(page,"local preparation "+width);}
 await page.setViewportSize({width:390,height:950});await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));await page.screenshot({path:"output/playwright/phase-d/local-preparation-"+info.project.name+".png",fullPage:true});
});

test("local preparation preserves restricted values and recovers read failures without commands or another patient's data",async({page})=>{
 const f=await setup();sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values("+q(f.patient)+","+q(fixtures.adminA.id)+",'stock.family.read',false),("+q(f.patient)+","+q(fixtures.adminA.id)+",'stock.team.read',false)");
 await login(page,"adminA",f.patient);const before=physical(f.patient);let writes=0;
 page.on("request",request=>{if(new URL(request.url()).pathname===new URL(endpoint(f.patient),page.url()).pathname&&request.method()!=="GET")writes++;});
 await page.goto("/preparacao-local?careRecipientId="+f.patient);
 const stock=page.getByRole("button",{name:/^Estoque e custódias/});
 await stock.click();
 const stockPanel=page.getByRole("dialog",{name:"Estoque e custódias",exact:true});
 await expect(stockPanel.getByText("Acesso restrito a esta informação",{exact:true})).toHaveCount(2);
 await stockPanel.getByRole("button",{name:"Voltar à preparação",exact:true}).click();
 await expect(stock).toBeFocused();
 const result=await page.request.get(endpoint(f.patient));expect(result.status()).toBe(200);expect(result.headers()["cache-control"]).toContain("no-store");const valid=(await result.json()).data;
 const retry=page.getByRole("button",{name:"Atualizar situação",exact:true});
 const failure=page.getByRole("dialog",{name:"Não foi possível consultar a preparação",exact:true});
 for(const status of [503,200]){
  await page.route("**/api/guides/preparation?*",route=>route.fulfill({status,contentType:"application/json",body:JSON.stringify(status===200?{data:{...valid,patientId:randomUUID(),patient:{...valid.patient,name:"OUTRO PACIENTE NÃO PODE APARECER"}}}:{error:"Consulta de preparação temporariamente indisponível."})}),{times:1});
  await retry.focus();await retry.press("Enter");await expect(failure).toBeVisible();await expect(page.getByText("OUTRO PACIENTE NÃO PODE APARECER",{exact:true})).toHaveCount(0);
  await failure.getByRole("button",{name:"Consultar novamente",exact:true}).click();await expect(failure).toHaveCount(0);
  await expect(stock).toBeVisible();
 }
 await page.route("**/api/guides/preparation?*",route=>route.fulfill({status:403,contentType:"application/json",body:JSON.stringify({error:"Consulta não autorizada."})}),{times:1});
 await retry.press("Enter");await expect(failure).toContainText("Consulta não autorizada");await expect(stock).toHaveCount(0);
 for(const query of ["","careRecipientId=invalid","careRecipientId="+f.patient+"&careRecipientId="+f.patient,"careRecipientId="+f.patient+"&role=admin"])expect((await page.request.get("/api/guides/preparation?"+query)).status()).toBe(400);
 expect((await page.request.get(endpoint(f.patient.toUpperCase()))).status()).toBe(200);expect(writes).toBe(0);expect(physical(f.patient)).toBe(before);
});

test("global preparation never opens local records through a patient URL or a global privilege",async({page})=>{
 const f=await preparedPatient();await login(page,"global",null);let reads=0;page.on("request",request=>{if(new URL(request.url()).pathname==="/api/guides/preparation")reads++;});
 await page.goto("/preparacao-local?careRecipientId="+f.patient);await expect(page.getByRole("region",{name:"Mudar perfil",exact:true})).toBeVisible();expect(reads).toBe(0);
 await page.goto("/preparacao-local");await expect(page.getByText("Abra um vínculo local autorizado",{exact:false})).toBeVisible();expect(reads).toBe(0);
 const denied=await page.request.get(endpoint(f.patient));expect(denied.status()).toBe(404);expect(await denied.text()).not.toContain(f.content.displayName);
});
