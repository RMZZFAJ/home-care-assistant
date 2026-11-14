import { expect,test,type Page } from "@playwright/test";
import {randomUUID} from "node:crypto";
import {preparedPatient} from "../integration/local-preparation-fixtures.mjs";
import {setup,fixtures} from "../integration/v4-fixtures.mjs";
import {sql,sqlLiteral as q} from "../../scripts/test-environment.mjs";
import {fixturePassword} from "../../scripts/test-constants.mjs";
import {selectContext} from "./auth-context";
import {auditFromTop} from "./accessibility-audit";
test.setTimeout(180_000);
async function login(page:Page,role:string,patient:string|null){await page.goto("/login");await page.getByLabel("E-mail",{exact:true}).fill(fixtures[role].email);await page.getByLabel("Senha",{exact:true}).fill(fixturePassword);await page.getByRole("button",{name:"Entrar",exact:true}).click();await expect(page.getByRole("heading",{name:"Visão geral",exact:true})).toBeVisible();await selectContext(page,patient);}
const endpoint=(patient:string)=>"/api/guides/preparation?careRecipientId="+patient;
const physical=(patient:string)=>sql("select jsonb_build_object('stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id="+q(patient)+"),'documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id="+q(patient)+"));");

test("local preparation connects real creation adoption and opening stock without turning metadata into physical approval",async({page},info)=>{
 const f=await preparedPatient(),model="local-opening-"+randomUUID();
 sql("insert into public.products(id,name,category,unit,is_active) values("+[q(model),q("Material fictício de abertura guiada"),q("higiene"),q("unidade"),"true"].join(",")+")");
 await login(page,"family",f.patient);await page.goto("/guias");await page.getByRole("link",{name:"Acompanhar preparação local",exact:true}).click();
 await expect(page.getByRole("heading",{name:"Preparação local",exact:true})).toBeVisible();
 await expect(page.getByRole("complementary",{name:"Preparação que precisa de atenção",exact:true})).toBeVisible();
 expect((await(await page.request.get(endpoint(f.patient))).json()).data.catalogue.activeProducts).toBe(0);
 await page.getByRole("link",{name:"Preparar materiais do paciente",exact:true}).click();
 await page.getByRole("button",{name:"Adotar modelo",exact:true}).click();
 const adoption=page.getByRole("dialog",{name:"Adotar modelo existente",exact:true});
 await adoption.getByRole("combobox",{name:"Produto modelo",exact:true}).selectOption(model);await adoption.getByRole("button",{name:"Adotar modelo",exact:true}).click();
 await expect(page.getByText("Modelo adicionado ao catálogo deste paciente.",{exact:true})).toBeVisible();
 await page.goto("/preparacao-local?careRecipientId="+f.patient);await expect(page.getByRole("complementary",{name:"Preparação que precisa de atenção",exact:true})).toHaveCount(0);
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
 for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:950});await auditFromTop(page,"local preparation "+width);}
 await page.setViewportSize({width:390,height:950});await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));await page.screenshot({path:"output/playwright/phase-d/local-preparation-"+info.project.name+".png",fullPage:true});
 await page.getByRole("button",{name:"Atualizar preparação local",exact:true}).click();await expect(page.getByRole("status").filter({hasText:"Consultando registros da preparação"})).toHaveCount(0);
 expect(physical(f.patient)).toBe(before);expect(sql("select count(*) from public.stock_movements where care_recipient_id="+q(f.patient)+" and product_id="+q(model))).toBe("1");
});

test("local preparation preserves restricted values and recovers read failures without commands or another patient's data",async({page})=>{
 const f=await setup();sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values("+q(f.patient)+","+q(fixtures.adminA.id)+",'stock.family.read',false),("+q(f.patient)+","+q(fixtures.adminA.id)+",'stock.team.read',false)");
 await login(page,"adminA",f.patient);const before=physical(f.patient);let writes=0;
 page.on("request",request=>{if(new URL(request.url()).pathname===new URL(endpoint(f.patient),page.url()).pathname&&request.method()!=="GET")writes++;});
 await page.goto("/preparacao-local?careRecipientId="+f.patient);
 const stock=page.getByRole("region",{name:"Estoque físico por custódia",exact:true});await expect(stock.getByText("Acesso restrito a esta informação",{exact:true})).toHaveCount(2);
 const result=await page.request.get(endpoint(f.patient));expect(result.status()).toBe(200);expect(result.headers()["cache-control"]).toContain("no-store");const valid=(await result.json()).data;
 const retry=page.getByRole("button",{name:"Atualizar preparação local",exact:true});
 for(const status of [503,200]){
  await page.route("**/api/guides/preparation?*",route=>route.fulfill({status,contentType:"application/json",body:JSON.stringify(status===200?{data:{...valid,patientId:randomUUID(),patient:{...valid.patient,name:"OUTRO PACIENTE NÃO PODE APARECER"}}}:{error:"Consulta de preparação temporariamente indisponível."})}),{times:1});
  await retry.focus();await retry.press("Enter");await expect(page.getByRole("main").getByRole("alert")).toBeVisible();await expect(retry).toBeFocused();await expect(page.getByText("OUTRO PACIENTE NÃO PODE APARECER",{exact:true})).toHaveCount(0);
  await retry.press("Enter");await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
 }
 await page.route("**/api/guides/preparation?*",route=>route.fulfill({status:403,contentType:"application/json",body:JSON.stringify({error:"Consulta não autorizada."})}),{times:1});
 await retry.press("Enter");await expect(page.getByRole("main").getByRole("alert")).toContainText("Consulta não autorizada");await expect(stock).toHaveCount(0);
 for(const query of ["","careRecipientId=invalid","careRecipientId="+f.patient+"&careRecipientId="+f.patient,"careRecipientId="+f.patient+"&role=admin"])expect((await page.request.get("/api/guides/preparation?"+query)).status()).toBe(400);
 expect((await page.request.get(endpoint(f.patient.toUpperCase()))).status()).toBe(200);expect(writes).toBe(0);expect(physical(f.patient)).toBe(before);
});

test("global preparation never opens local records through a patient URL or a global privilege",async({page})=>{
 const f=await preparedPatient();await login(page,"global",null);let reads=0;page.on("request",request=>{if(new URL(request.url()).pathname==="/api/guides/preparation")reads++;});
 await page.goto("/preparacao-local?careRecipientId="+f.patient);await expect(page.getByRole("region",{name:"Mudar perfil",exact:true})).toBeVisible();expect(reads).toBe(0);
 await page.goto("/preparacao-local");await expect(page.getByText("Abra um vínculo local autorizado",{exact:false})).toBeVisible();expect(reads).toBe(0);
 const denied=await page.request.get(endpoint(f.patient));expect(denied.status()).toBe(404);expect(await denied.text()).not.toContain(f.content.displayName);
});
