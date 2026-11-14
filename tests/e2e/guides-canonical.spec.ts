import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { fixtures, setup } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";

test.setTimeout(180_000);
async function login(page: Page, role: string, patient: string | null) {
  await page.goto("/login");
  await page.getByLabel("E-mail", {exact:true}).fill(fixtures[role].email);
  await page.getByLabel("Senha", {exact:true}).fill(fixturePassword);
  await page.getByRole("button", {name:"Entrar",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Visão geral",exact:true})).toBeVisible();
  await selectContext(page,patient);
}
const official = (patient: string) => sql("select jsonb_build_object('members',(select jsonb_agg(to_jsonb(m) order by user_id) from public.care_recipient_memberships m where care_recipient_id="+q(patient)+"),'documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id="+q(patient)+"),'movements',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id="+q(patient)+"));");
const profiles = [
  ["global","Administração global","Prepare uma residência","Abrir preparação"],
  ["adminA","Administrador do paciente","Administre somente este paciente","Abrir administração"],
  ["supervisor","Supervisor","Acompanhe dentro do seu vínculo","Consultar escalas"],
  ["family","Familiar","Prepare e confira cada chegada","Consultar compras"],
  ["professional","Profissional","Requisite o que observou","Abrir requisição"],
  ["reader","Leitor","Consulte o que foi autorizado","Consultar fichas"],
];
for (const [role,label,title,action] of profiles) test("canonical guide for "+role+" keeps role, context, progress and operational facts distinct", async ({page},info) => {
  const f=await setup();
  if(role==="supervisor") sql("insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values("+q(f.patient)+","+q(fixtures.supervisor.id)+",'supervisor')");
  await login(page,role,role==="global"?null:f.patient);
  const before=official(f.patient);
  await page.goto("/guias");
  const panel=page.getByRole("region",{name:"Guia do seu perfil",exact:true});
  await expect(panel.getByRole("heading",{name:label,exact:true})).toBeVisible();
  const navigation=panel.getByRole("navigation",{name:"Etapas do guia",exact:true});
  await expect(navigation.getByRole("button")).toHaveCount(6);
  await expect(navigation.getByRole("button").first()).toHaveCSS("display","flex");
  await navigation.getByRole("button",{name:title,exact:false}).click();
  await expect(panel.getByRole("heading",{name:title,exact:true})).toBeFocused();
  const link=panel.getByRole("link",{name:action,exact:true}),href=new URL(await link.getAttribute("href")??"",page.url());
  expect(href.searchParams.get("careRecipientId")).toBe(role==="global"?null:f.patient);
  await expect(navigation.locator('[aria-current="step"]')).toContainText(title);
  const widths=role==="adminA"?[320,390,768,1024,1440]:[390];
  for(const width of widths){await page.setViewportSize({width,height:900});await auditFromTop(page,"guide "+role+" "+width);}
  if(role==="adminA") {await page.setViewportSize({width:390,height:900});await panel.screenshot({path:"output/playwright/phase-d/guide-canonical-"+info.project.name+".png"});}
  await navigation.getByRole("button",{name:"Continue com fatos conhecidos",exact:false}).click();
  await expect(panel.getByRole("heading",{name:"Continue com fatos conhecidos",exact:true})).toBeVisible();
  const completed=page.waitForResponse(response=>new URL(response.url()).pathname==="/api/guides"&&response.request().method()==="POST"&&response.request().postDataJSON().status==="completed");
  await panel.getByRole("button",{name:"Concluir guia",exact:true}).click();
  expect((await completed).status()).toBe(200);
  await expect(panel).toContainText("Guia percorrido. Nenhum ato operacional foi confirmado.");
  const saved=(await(await page.request.get("/api/guides")).json()).data;
  expect(saved.progress).toMatchObject({step:5,status:"completed"});
  await page.reload();
  await expect(panel).toContainText("Guia concluído; você pode consultar qualquer etapa novamente.");
  expect(official(f.patient)).toBe(before);
});

test("guide rejects a valid response from another role without exposing its tasks or sending progress", async ({page})=>{
  const f=await setup();await login(page,"professional",f.patient);
  const valid=(await(await page.request.get("/api/guides")).json()).data;
  await page.route("**/api/guides",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({data:{...valid,role:"global"}})}),{times:1});
  let writes=0;page.on("request",r=>{if(new URL(r.url()).pathname==="/api/guides"&&r.method()==="POST")writes++;});
  await page.goto("/guias");
  const panel=page.getByRole("region",{name:"Guia do seu perfil",exact:true});
  await expect(panel.getByRole("alert")).toContainText("perfil atual");
  await expect(panel.getByRole("navigation")).toHaveCount(0);
  const retry=panel.getByRole("button",{name:"Consultar guia novamente",exact:true});await retry.focus();await retry.press("Enter");
  await expect(panel.getByRole("heading",{name:"Profissional",exact:true})).toBeVisible();await expect(retry).toBeFocused();
  expect(writes).toBe(0);expect((await(await page.request.get("/api/guides")).json()).data.progress).toEqual(valid.progress);
});

test("preparation does not offer a partial directory after a failed later page and retains filled fields",async({page})=>{
  await login(page,"global",null);
  let failure=true;
  await page.route("**/api/admin?section=profiles&profilePage=*",async route=>{
    if(!failure)return route.continue();
    const pageNumber=Number(new URL(route.request().url()).searchParams.get("profilePage"));
    if(pageNumber===2)return route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:"Segunda página indisponível."})});
    // Controlled transport data tests completeness; these identities are never submitted.
    return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({data:Array.from({length:30},(_,i)=>({id:randomUUID(),full_name:"Pessoa de resposta controlada "+i,role:"reader",status:"active",global_scope:false,created_at:"2026-11-12T10:00:00Z"})),total:31,profilePage:1,pageSize:30,query:""})});
  });
  await page.goto("/preparar-residencia");await page.getByRole("button",{name:"Nova preparação",exact:true}).click();
  const panel=page.getByRole("region",{name:"Preparação da residência",exact:true});
  await panel.getByLabel("Nome da residência",{exact:true}).fill("Preenchimento preservado após falha de consulta");
  await panel.getByRole("button",{name:"2. Pessoas e responsabilidades",exact:true}).click();
  await expect(panel.getByRole("alert")).toContainText("Segunda página indisponível");
  await expect(panel.getByRole("combobox",{name:"Titular da continuidade",exact:true})).toBeDisabled();
  failure=false;await panel.getByRole("button",{name:"Consultar pessoas novamente",exact:true}).click();
  const person=panel.getByRole("combobox",{name:"Titular da continuidade",exact:true});await expect(person).toBeEnabled();
  const name=sql("select full_name from public.profiles where id="+q(fixtures.global.id));await person.fill(name);await person.press("ArrowDown");await page.getByRole("option",{name,exact:true}).click();
  await panel.getByRole("button",{name:"1. Residência e fuso",exact:true}).click();
  await expect(panel.getByLabel("Nome da residência",{exact:true})).toHaveValue("Preenchimento preservado após falha de consulta");
});
