import {test,expect} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {readFileSync} from "node:fs";
import {fixturePassword,patientA,patientB} from "../../scripts/test-constants.mjs";
import {fixtureFile} from "../../scripts/test-environment.mjs";
test.setTimeout(180_000);
async function audit(page:import("@playwright/test").Page,label:string){const result=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(result.violations,label).toEqual([]);const size=await page.evaluate(()=>({width:document.documentElement.clientWidth,content:document.documentElement.scrollWidth}));expect(size.content,label+" overflow").toBeLessThanOrEqual(size.width);}
test("login, navegação, menus, filtros e quatro wizards são acessíveis e responsivos",async({page})=>{
 const fixture=JSON.parse(readFileSync(fixtureFile,"utf8"));await page.goto("/login");await audit(page,"login");await page.getByLabel("E-mail",{exact:true}).fill(fixture.global.email);await page.getByLabel("E-mail",{exact:true}).press("Tab");await expect(page.getByLabel("Senha",{exact:true})).toBeFocused();await page.keyboard.type(fixturePassword);await page.keyboard.press("Tab");await expect(page.getByRole("button",{name:"Entrar",exact:true})).toBeFocused();await page.keyboard.press("Enter");await expect(page.getByRole("heading",{name:"Visão geral",exact:true})).toBeVisible();
 for(const [path,title] of [["/","Visão geral"],["/fichas","Central de fichas"],["/fichas/req","Requisição de insumos"],["/fichas/com","Compra de insumos"],["/fichas/ent","Entrega / Entrada"],["/fichas/bal","Balanço semanal"],["/historico","Histórico de fichas"],["/estoque","Gestão dos estoques"],["/admin","Administração"],["/configuracoes","Funções, permissões e regras"],["/perfil","Meu perfil e segurança"],["/notificacoes","Central de notificações"],["/consumo","Faltas e consumo extraordinário"],["/unidades","Unidades e apresentações"]]){
  await page.goto(path+"?careRecipientId="+patientA);await expect(page.getByRole("heading",{name:title,exact:true}).first()).toBeVisible();await expect(page.getByText("Validando sessão e pacientes autorizados…",{exact:true})).toHaveCount(0);await audit(page,path);
 }
 await page.goto("/historico?careRecipientId="+patientA);await page.getByRole("button",{name:/Pesquisar e filtrar/}).click();await audit(page,"history expanded");await page.getByRole("button",{name:"Abrir navegação",exact:true}).click();await expect(page.getByRole("navigation",{name:"Navegação principal",exact:true})).toBeVisible();await audit(page,"drawer");await page.keyboard.press("Escape");await expect(page.getByRole("button",{name:"Abrir navegação",exact:true})).toBeFocused();
 await page.getByRole("button",{name:/^Notificações/}).click();await expect(page.getByRole("region",{name:"Notificações recentes",exact:true})).toBeVisible();await audit(page,"notifications");await page.keyboard.press("Escape");await page.getByLabel("Menu do usuário",{exact:true}).click();await expect(page.getByRole("link",{name:"Meu perfil e segurança",exact:true})).toBeVisible();await audit(page,"profile menu");
 await page.getByRole("combobox",{name:"Pessoa assistida",exact:true}).selectOption(patientB);await expect(page.getByRole("combobox",{name:"Pessoa assistida",exact:true})).toHaveValue(patientB);
});
for(const role of ["adminA","family","supervisor","professional","reader"]){
 test("menu e capacidades efetivas do perfil "+role,async({page})=>{
 const fixture=JSON.parse(readFileSync(fixtureFile,"utf8"));await page.goto("/login");await page.getByLabel("E-mail",{exact:true}).fill(fixture[role].email);await page.getByLabel("Senha",{exact:true}).fill(fixturePassword);await page.getByRole("button",{name:"Entrar",exact:true}).click();await page.goto("/fichas?careRecipientId="+patientA);await expect(page.getByRole("combobox",{name:"Pessoa assistida",exact:true})).toBeVisible();await page.getByRole("button",{name:"Abrir navegação",exact:true}).click();const nav=page.getByRole("navigation",{name:"Navegação principal",exact:true});await expect(nav).toBeVisible();
 const ctx=(await(await page.request.get("/api/context")).json()).data;const patient=ctx.patients.find((item:{id:string})=>item.id===patientA);
 for(const [cap,label] of [["req.create","REQ · Requisição"],["com.create","COM · Compra da família"],["ent.create","ENT · Entrega / Entrada"],["bal.count","BAL · Balanço semanal"]])await expect(nav.getByRole("link",{name:label,exact:true})).toHaveCount(patient.capabilities[cap]?1:0);
 await audit(page,"menu "+role);await page.getByRole("button",{name:"Fechar menu",exact:true}).click();await page.goto("/estoque?careRecipientId="+patientA);await expect(page.getByRole("heading",{name:"Saldos e previsões",exact:true})).toBeVisible();await expect(page.getByRole("heading",{name:"Movimentar estoque familiar",exact:true})).toHaveCount(patient.capabilities["stock.family.manage"]?1:0);await audit(page,"stock "+role);
 });
}

