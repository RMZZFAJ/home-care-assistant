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
  ["global","Administração global","Criar nova residência","Abrir preparação"],
  ["adminA","Administrador do paciente","Administre somente este paciente","Abrir administração"],
  ["supervisor","Supervisor","Acompanhe dentro do seu vínculo","Consultar escalas"],
  ["family","Familiar","Acompanhar compra e entrega","Consultar compras"],
  ["professional","Profissional","Preencher uma requisição","Abrir requisição"],
  ["reader","Leitor","Consulte o que foi autorizado","Consultar fichas"],
];
for (const [role,label,title,action] of profiles) test("canonical guide for "+role+" keeps role, context, progress and operational facts distinct", async ({page},info) => {
  const f=await setup();
  if(role==="supervisor") sql("insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values("+q(f.patient)+","+q(fixtures.supervisor.id)+",'supervisor')");
  await login(page,role,role==="global"?null:f.patient);
  const before=official(f.patient);
  const initialProgress=(await (await page.request.get("/api/guides")).json()).data.progress;
  await page.goto("/guias");
  const panel=page.getByRole("region",{name:"Guia do seu perfil",exact:true});
  await expect(panel.getByText(label, {exact:true})).toBeVisible();
  const navigation=panel.getByRole("navigation",{name:"Assuntos do guia",exact:true});
  await expect(navigation.getByRole("button")).toHaveCount(role === "global" ? 2 : 4);
  await expect(navigation.getByRole("button").first()).toHaveCSS("display","flex");
  const opener = navigation.getByRole("button", { name: title });
  await opener.click();
  const topic = page.getByRole("dialog", { name: title, exact: true });
  await expect(topic.getByRole("heading", { name: title, exact: true })).toBeVisible();
  const link=topic.getByRole("link",{name:"Abrir tarefa · "+action,exact:true}),href=new URL(await link.getAttribute("href")??"",page.url());
  expect(href.searchParams.get("careRecipientId")).toBe(role==="global"?null:f.patient);
  if (role === "family") expect(href.searchParams.get("type")).toBe("COM");
  if (role === "professional") {
    await expect(topic).toContainText("Ao emitir, os valores informados atualizam o estoque da equipe.");
    for (const width of [360, 412]) {
      await page.setViewportSize({ width, height: 900 });
      await auditFromTop(page, "guide topic " + width);
      await expect(topic.getByRole("link", { name: "Abrir tarefa · Abrir requisição" })).toBeInViewport({ ratio: 1 });
      const box = await topic.boundingBox();
      expect(box?.height).toBeLessThan(900);
      expect(box ? box.y + box.height : 0).toBeCloseTo(900, 0);
      await topic.screenshot({ path: "output/playwright/l4/guide-topic-" + info.project.name + "-" + width + ".png" });
    }
  }
  await topic.getByRole("button", { name: "Voltar aos guias" }).click();
  await expect(opener).toBeFocused();
  if (initialProgress.status !== "completed") await expect(opener).toHaveAttribute("aria-current", "step");
  if (role === "professional") {
    await navigation.getByRole("button", { name: "Registrar consumo ou falta" }).click();
    const consumption = page.getByRole("dialog", { name: "Registrar consumo ou falta", exact: true });
    await expect(consumption).toContainText("o consumo baixa o estoque da equipe");
    await expect(consumption).toContainText("O aviso de falta mantém o saldo");
    await consumption.getByRole("button", { name: "Voltar aos guias" }).click();
  }
  const widths=role==="adminA"?[320,390,768,1024,1440]:[390];
  for(const width of widths){await page.setViewportSize({width,height:900});await auditFromTop(page,"guide "+role+" "+width);}
  if (role === "professional" || role === "adminA") for (const width of [360, 412]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(panel.getByRole("button", {name:"Rever apresentação",exact:true})).toBeInViewport({ratio:1});
    await page.screenshot({ path: "output/playwright/l4/guide-" + role + "-" + info.project.name + "-" + width + ".png" });
  }
  if (initialProgress.status !== "completed") {
    const completed=page.waitForResponse(response=>new URL(response.url()).pathname==="/api/guides"&&response.request().method()==="POST"&&response.request().postDataJSON().status==="completed");
    await panel.getByRole("button",{name:"Concluir orientação",exact:true}).click();
    expect((await completed).status()).toBe(200);
    const success = page.getByRole("dialog", { name: "Orientação concluída", exact: true });
    await expect(success).toBeVisible();
    await success.getByRole("button", { name: "Concluir", exact: true }).click();
  }
  const saved=(await(await page.request.get("/api/guides")).json()).data;
  if (initialProgress.status === "completed") expect(saved.progress).toEqual(initialProgress);
  else expect(saved.progress).toMatchObject({step:5,status:"completed"});
  await page.reload();
  await expect(navigation).toBeVisible();
  await expect(panel.getByRole("button", { name: "Concluir orientação", exact: true })).toHaveCount(0);
  if (role !== "global") await expect(panel).toContainText("Guia consultado");
  await opener.click();
  await expect(topic).toBeVisible();
  await topic.getByRole("button", { name: "Voltar aos guias" }).click();
  expect((await (await page.request.get("/api/guides")).json()).data.progress).toEqual(saved.progress);
  expect(official(f.patient)).toBe(before);
});

test("guide rejects a valid response from another role without exposing its tasks or sending progress", async ({page})=>{
  const f=await setup();await login(page,"professional",f.patient);
  const valid=(await(await page.request.get("/api/guides")).json()).data;
  let wrongRole=true;
  await page.route("**/api/guides",route=>wrongRole&&route.request().method()==="GET"
    ? route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({data:{...valid,role:"global"}})})
    : route.continue());
  let writes=0;page.on("request",r=>{if(new URL(r.url()).pathname==="/api/guides"&&r.method()==="POST")writes++;});
  await page.goto("/guias");
  const panel=page.getByRole("region",{name:"Guia do seu perfil",exact:true});
  const failure = page.getByRole("dialog", { name: "Não foi possível consultar o guia", exact: true });
  await expect(failure).toContainText("perfil atual");
  await expect(panel.locator("nav")).toHaveCount(0);
  wrongRole=false;
  const retry=failure.getByRole("button",{name:"Consultar guia novamente",exact:true});await retry.focus();await retry.press("Enter");
  await expect(panel.getByText("Profissional",{exact:true})).toBeVisible();
  await expect(panel.getByRole("heading",{name:"Orientação para a equipe",exact:true})).toBeFocused();
  await expect(failure).toHaveCount(0);
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
